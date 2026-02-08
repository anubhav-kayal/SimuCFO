require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_KEY; // Use SERVICE ROLE key for backend access!
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 5000;

// 1. Enable CORS so your frontend (e.g., localhost:5173) can send data
app.use(cors());

// 2. Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    // Create the folder if it doesn't exist
    if (!fs.existsSync(uploadPath)){
        fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only .pdf format allowed!'));
    }
  }
});


app.post('/upload', upload.single('pdfFile'), async (req, res) => {  
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded' });
    }
    
    const fileContent = fs.readFileSync(req.file.path);

   
    const { data, error } = await supabase
      .storage
      .from('pdfs') // The bucket name you created
      .upload(req.file.filename, fileContent, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) throw error;

    // 5. Get the Public URL (If bucket is public)
    const { data: publicData } = supabase
      .storage
      .from('pdfs')
      .getPublicUrl(data.path);

    // 6. Respond to Frontend
    res.status(200).send({ 
      message: 'File uploaded to Supabase successfully', 
      supabasePath: data.path,
      publicUrl: publicData.publicUrl 
    });
  } catch (error) {
    console.log(error.message);
    
    res.status(500).send({ message: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});