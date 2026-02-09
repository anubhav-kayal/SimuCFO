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

      // 3. Run Python Script Synchronously (PDF Processor)
      const pythonPath = path.join(__dirname, '../../data-scripts/extractors/venv/bin/python');
      const scriptPath = path.join(__dirname, '../../data-scripts/extractors/pdfProcessor.py');

      console.log('Executing PDF Processor...');

      try {
        const { stdout, stderr } = await exec(`"${pythonPath}" "${scriptPath}"`);
        if (stderr) console.error(`PDF Processor stderr: ${stderr}`);
        console.log(`PDF Processor stdout: ${stdout}`);
      } catch (scriptError) {
        console.error(`Error executing PDF Processor: ${scriptError.message}`);
        throw new Error(`PDF Processor failed: ${scriptError.message}`);
      }

      // 4. Run Monte Carlo Simulation
      // Use the 'question' from the request body, or a default if missing
      const userQuestion = req.body.question || "Run a comprehensive financial risk analysis";

      const monteCarloScriptPath = path.join(__dirname, '../../ml-simulator/montecarlo.py');
      const mlSimulatorDir = path.join(__dirname, '../../ml-simulator');

      console.log(`Running Monte Carlo simulation: ${monteCarloScriptPath}`);
      console.log(`Question: ${userQuestion}`);

      const escapedQuestion = userQuestion.replace(/"/g, '\\"');

      try {
        // Use the SAME python path as pdfProcessor (venv)
        const { stdout: mcStdout, stderr: mcStderr } = await exec(`"${pythonPath}" "${monteCarloScriptPath}" "${escapedQuestion}"`, {
          cwd: mlSimulatorDir
        });
        console.log('Monte Carlo stdout:', mcStdout);
        if (mcStderr) console.error('Monte Carlo stderr:', mcStderr);
      } catch (mcError) {
        console.error(`Error executing Monte Carlo: ${mcError.message}`);
        throw new Error(`Monte Carlo simulation failed: ${mcError.message}`);
      }

      // 5. Read the Computed Metrics JSON (Simpler for Frontend)
      const jsonOutputPath = path.join(mlSimulatorDir, 'computed_metrics.json');
      let analysisResult = null;

      try {
        if (fs.existsSync(jsonOutputPath)) {
          const jsonContent = fs.readFileSync(jsonOutputPath, 'utf8');
          analysisResult = JSON.parse(jsonContent);
          console.log("✅ Successfully read Computed Metrics JSON");
        } else {
          console.warn("⚠️ Computed Metrics JSON output file not found:", jsonOutputPath);
        }
      } catch (readError) {
        console.error("❌ Error reading Computed Metrics JSON:", readError);
      }

      res.status(200).json({
        message: 'Files processed and simulation complete',
        analysis: analysisResult
      });
      // montecarlo.py can output 'monte_carlo_analysis.json' (comprehensive) or 'computed_metrics.json' (metrics only)
      const fullAnalysisPath = path.join(mlSimulatorDir, 'monte_carlo_analysis.json');
      const metricsPath = path.join(mlSimulatorDir, 'computed_metrics.json');

      let responseData = {};

      if (fs.existsSync(fullAnalysisPath)) {
        const fullAnalysis = JSON.parse(fs.readFileSync(fullAnalysisPath, 'utf-8'));
        responseData = {
          question: question,
          answer: fullAnalysis.analysis_results?.computed_answer || {},
          reasoning: fullAnalysis.analysis_results?.llm_explanation || "Analysis completed."
        };
      } else if (fs.existsSync(metricsPath)) {
        const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
        responseData = {
          question: question,
          answer: metrics,
          reasoning: "Analysis completed (Metrics only)."
        };
      } else {
        throw new Error("No analysis output file found.");
      }

      return res.status(200).send({
        message: 'Analysis completed successfully.',
        files: results,
        data: responseData
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


