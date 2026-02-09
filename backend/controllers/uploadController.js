const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

/**
 * Handle PDF upload and forward to Supabase storage.
 */
exports.handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath);

    const { data, error } = await supabase.storage
      .from('pdfs')
      .upload(req.file.filename, fileContent, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) throw error;

    const { data: publicData } = supabase.storage
      .from('pdfs')
      .getPublicUrl(data.path);

    return res.status(200).send({
      message: 'File uploaded to Supabase successfully',
      supabasePath: data.path,
      publicUrl: publicData.publicUrl,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send({ message: error.message });
  }
};


