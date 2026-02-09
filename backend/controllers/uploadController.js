const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * Handle one or more PDF uploads and forward them to Supabase storage.
 * After upload, it downloads all PDFs from Supabase to a local 'inputs' folder.
 * Then it runs the Python processing script synchronously and returns the JSON output.
 */
exports.handleUpload = async (req, res) => {
  try {
    const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).send({ message: 'No file uploaded' });
    }

    const results = [];

    // 1. Upload files to Supabase
    for (const file of files) {
      const filePath = file.path;
      const fileContent = fs.readFileSync(filePath);

      const { data, error } = await supabase.storage
        .from('pdfs')
        .upload(file.filename, fileContent, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(data.path);

      results.push({
        originalName: file.originalname,
        storedName: file.filename,
        supabasePath: data.path,
        publicUrl: publicData.publicUrl,
      });
    }

    // 2. List and Download ALL files from Supabase 'pdfs' bucket to 'inputs' folder
    console.log('Fetching all files from Supabase pdfs bucket...');

    const { data: fileList, error: listError } = await supabase
      .storage
      .from('pdfs')
      .list();

    if (listError) {
      console.error('Error listing files from Supabase:', listError);
      // We don't fail the request if listing fails, but we log it.
    } else {
      console.log(`Found ${fileList.length} files in Supabase. Downloading to inputs/ folder...`);

      const inputsDir = path.join(__dirname, '../../data-scripts', 'inputs');
      if (!fs.existsSync(inputsDir)) {
        fs.mkdirSync(inputsDir, { recursive: true });
      }

      const downloadResults = [];

      for (const file of fileList) {
        if (file.name === '.emptyFolderPlaceholder') continue; // Skip placeholder if exists

        const { data: fileBlob, error: downloadError } = await supabase
          .storage
          .from('pdfs')
          .download(file.name);

        if (downloadError) {
          console.error(`Error downloading ${file.name}:`, downloadError);
          continue;
        }

        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const savePath = path.join(inputsDir, file.name);

        fs.writeFileSync(savePath, buffer);
        console.log(`Downloaded: ${file.name}`);
        downloadResults.push(file.name);
      }

      console.log('All downloads complete.');

      // 3. Run Python Script Synchronously
      const pythonPath = path.join(__dirname, '../../data-scripts/extractors/venv/bin/python');
      const scriptPath = path.join(__dirname, '../../data-scripts/extractors/pdfProcessor.py');

      console.log('Executing Python script...');
      
      try {
        const { stdout, stderr } = await exec(`"${pythonPath}" "${scriptPath}"`);
        
        if (stderr) {
          console.error(`Script stderr: ${stderr}`);
        }
        console.log(`Script stdout: ${stdout}`);
      } catch (scriptError) {
        console.error(`Error executing script: ${scriptError.message}`);
        // Decide if you want to fail the request or continue. 
        // For now, let's throw to notify frontend of failure.
        throw new Error(`Script execution failed: ${scriptError.message}`);
      }

      // 4. Read the generated JSON file
      const jsonOutputPath = path.join(__dirname, '../../data-scripts/output/template.json');
      let jsonData = {};

      if (fs.existsSync(jsonOutputPath)) {
        try {
            const rawData = fs.readFileSync(jsonOutputPath, 'utf-8');
            jsonData = JSON.parse(rawData);
            console.log('Successfully read template.json');
        } catch (jsonError) {
            console.error('Error reading/parsing template.json:', jsonError);
            // Non-fatal, return empty object or partial data
        }
      } else {
          console.warn('template.json not found at:', jsonOutputPath);
      }

      return res.status(200).send({
        message: 'Files processed successfully.',
        files: results,
        data: jsonData
      });
    }
    
    // Fallback if listError occurred (though rare)
    return res.status(200).send({
        message: 'Files uploaded, but processing skipped due to listing error.',
        files: results
    });

  } catch (error) {
    console.error(error.message);
    return res.status(500).send({ message: error.message });
  }
};


