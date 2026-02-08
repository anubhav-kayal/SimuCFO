import React, { useState, useRef } from 'react';
import './FileUpload.css';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState(null); 
  const inputRef = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Handle manual selection
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Validate file type (PDF only)
  const validateAndSetFile = (selectedFile) => {
    if (selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setStatus(null);
      setUploadProgress(0);
    } else {
      setStatus('error');
      alert("Please upload a PDF file.");
    }
  };

  // Trigger file input click
  const onButtonClick = () => {
    inputRef.current.click();
  };

  // Upload Logic
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    
    // Simulate progress bar for visual effect
    const interval = setInterval(() => {
        setUploadProgress((prev) => {
            if (prev >= 90) return prev;
            return prev + 10;
        });
    }, 200);

    const formData = new FormData();
    formData.append("pdfFile", file);

    try {
      // REPLACE with your actual backend URL
      const response = await fetch("https://your-backend-api.com/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(100);
        setStatus('success');
        // setTimeout(() => setFile(null), 3000); // Optional: Reset after success
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error("Upload failed", error);
      setStatus('error');
    } finally {
      clearInterval(interval);
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setStatus(null);
    setUploadProgress(0);
  };

  return (
    <div className="upload-card">
      <div className="card-header">
        <h3>Upload Document</h3>
        <p>PDF files only (Max 5MB)</p>
      </div>

      <div 
        className={`drop-zone ${dragActive ? "drag-active" : ""} ${file ? "has-file" : ""}`}
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag} 
        onDragOver={handleDrag} 
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <div className="icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="drop-text">Drag & drop your PDF here</p>
            <span className="divider">OR</span>
            <button className="browse-btn" onClick={onButtonClick}>
              Browse Files
            </button>
          </>
        ) : (
          <div className="file-preview-container">
            <div className="file-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            </div>
            <div className="file-details">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            {!uploading && status !== 'success' && (
                <button className="remove-btn" onClick={removeFile}>×</button>
            )}
          </div>
        )}

        <input 
            ref={inputRef} 
            type="file" 
            id="input-file-upload" 
            accept=".pdf"
            onChange={handleChange} 
        />
      </div>

      {/* Progress Bar Area */}
      {file && (
        <div className="actions-area">
            {uploading || status === 'success' ? (
                 <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                    <span className="progress-text">
                        {status === 'success' ? 'Completed' : `${uploadProgress}%`}
                    </span>
                 </div>
            ) : (
                <button className="upload-submit-btn" onClick={handleUpload}>
                    Upload PDF
                </button>
            )}
        </div>
      )}

      {/* Status Messages */}
      {status === 'success' && (
          <div className="status-message success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Upload Successful!
          </div>
      )}
      {status === 'error' && (
          <div className="status-message error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Upload Failed. Try again.
          </div>
      )}
    </div>
  );
};

export default FileUpload;