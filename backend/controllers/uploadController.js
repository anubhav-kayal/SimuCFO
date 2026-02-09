const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

/**
 * Handle one or more PDF uploads and forward them to Supabase storage.
 */
exports.handleUpload = async (req, res) => {
  try {
    const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).send({ message: 'No file uploaded' });
    }

    const results = [];

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

    return res.status(200).send({
      message: 'Files uploaded to Supabase successfully',
      files: results,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send({ message: error.message });
  }
};


