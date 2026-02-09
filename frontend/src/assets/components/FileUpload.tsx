import { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFilePdf, FaTrash } from 'react-icons/fa';
interface FileUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const FileUpload = ({ files, setFiles }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
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
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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
                <button onClick={() => removeFile(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <FaTrash />
                </button>
              </div>
            ))}

            {files.length > 0 && (
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
    </div>
  );
};

export default FileUpload;