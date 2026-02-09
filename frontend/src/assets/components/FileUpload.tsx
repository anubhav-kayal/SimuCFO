import React, { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFilePdf, FaCheckCircle, FaTimesCircle, FaTrash } from 'react-icons/fa';

const FileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- LOGIC SECTION ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const validateAndAddFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(file => file.type === "application/pdf");

    if (validFiles.length !== selectedFiles.length) {
      alert("Some files were skipped because they are not PDFs.");
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setStatus(null);
      setUploadProgress(0);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length <= 1) {
      setStatus(null);
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    // Fake progress simulation
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("pdfFile", file);
    });

    try {
      // Replace with your actual Supabase/Backend Endpoint
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(100);
        setStatus('success');
        setFiles([]); // Clear files on success
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

  // --- UI SECTION ---
  return (
    <div className="w-full bg-white p-8 rounded-[30px] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800">Financial Data Source</h3>
        <p className="text-gray-400 text-sm mt-1">Upload your balance sheet or cash flow statement (PDF only, Max 5MB)</p>
      </div>

      <div
        className={`relative w-full min-h-[16rem] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${dragActive ? "border-[#8c52ff] bg-purple-50" : "border-gray-200 bg-gray-50"
          } ${files.length > 0 ? "bg-white border-solid border-gray-200" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {files.length === 0 ? (
          <>
            <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mb-4 text-[#8c52ff] text-2xl">
              <FaCloudUploadAlt />
            </div>
            <p className="text-gray-500 font-medium">Drag & drop your PDF files here</p>
            <span className="text-gray-300 text-sm my-2">- OR -</span>
            <button
              className="text-[#8c52ff] font-bold hover:underline"
              onClick={onButtonClick}
            >
              Browse Files
            </button>
          </>
        ) : (
          <div className="w-full px-6 py-4 grid gap-4">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-4 w-full bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex-shrink-0 flex items-center justify-center text-red-500 text-xl">
                  <FaFilePdf />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-gray-800 font-bold truncate text-sm">{file.name}</h4>
                  <p className="text-gray-400 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {!uploading && (
                  <button onClick={() => removeFile(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <FaTrash />
                  </button>
                )}
              </div>
            ))}

            {!uploading && files.length > 0 && (
              <button
                className="mt-2 text-sm text-[#8c52ff] font-medium hover:underline flex items-center justify-center gap-2"
                onClick={onButtonClick}
              >
                <FaCloudUploadAlt /> Add More Files
              </button>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf"
          multiple
          onChange={handleChange}
        />
      </div>

      {/* Progress & Actions */}
      {files.length > 0 && (
        <div className="mt-6">
          {(uploading || status === 'success') ? (
            <div className="w-full">
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                <span>UPLOADING {files.length} FILES...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8c52ff] transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              {status === 'success' && (
                <div className="mt-4 flex items-center gap-2 text-green-500 font-bold bg-green-50 p-3 rounded-xl justify-center">
                  <FaCheckCircle /> Upload Complete
                </div>
              )}
              {status === 'error' && (
                <div className="mt-4 flex items-center gap-2 text-red-500 font-bold bg-red-50 p-3 rounded-xl justify-center">
                  <FaTimesCircle /> Upload Failed
                </div>
              )}
            </div>
          ) : (
            <button
              className="w-full py-4 bg-[#8c52ff] text-white rounded-xl font-bold text-lg shadow-[0_10px_20px_rgba(140,82,255,0.3)] hover:shadow-[0_15px_30px_rgba(140,82,255,0.4)] transition-all transform hover:-translate-y-1"
              onClick={handleUpload}
            >
              Process {files.length} Document{files.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;