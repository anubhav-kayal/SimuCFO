const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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


app.post('/upload', upload.single('pdfFile'), (req, res) => {  
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded' });
    }
    
    console.log('File received:', req.file);
    res.status(200).send({ 
      message: 'File uploaded successfully', 
      filePath: req.file.path 
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});