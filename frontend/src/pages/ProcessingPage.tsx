import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCog } from 'react-icons/fa';

const ProcessingPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Initializing...');
    const { files } = location.state || { files: [] };

    useEffect(() => {
        if (!files || files.length === 0) {
            // If no files, redirect back to upload page
            navigate('/'); // Or wherever the upload page is
            return;
        }

        const processFiles = async () => {
            setStatus('Uploading and Thinking...');

            const formData = new FormData();
            files.forEach((file: File) => {
                formData.append("pdfFile", file);
            });

            try {
                // Replace with your actual Supabase/Backend Endpoint
                const response = await fetch("http://localhost:5000/upload", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const responseData = await response.json();
                    const serverData = responseData.data;

                    setStatus('Complete!');
                    // Short delay to show completion state before redirect
                    setTimeout(() => {
                        navigate('/data', { state: { data: serverData } });
                    }, 1000);

                } else {
                    setStatus('Error processing files.');
                    console.error("Upload failed");
                    // Handle error (maybe redirect back or show error button)
                    setTimeout(() => navigate('/'), 3000);
                }
            } catch (error) {
                setStatus('Network Error');
                console.error("Upload failed", error);
                setTimeout(() => navigate('/'), 3000);
            }
        };

        processFiles();
    }, [files, navigate]);

    return (
        <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center font-sans">
            <div className="bg-white p-12 rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] text-center max-w-md w-full">

                <div className="mb-8 relative flex justify-center">
                    <div className="absolute inset-0 bg-purple-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <FaCog className="text-6xl text-[#8c52ff] animate-spin relative z-10" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-4">Processing Data</h2>

                <p className="text-gray-500 mb-8 text-lg">
                    Please wait while our AI analyzes your financial documents...
                </p>

                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-[#8c52ff] animate-progress origin-left w-full"></div>
                </div>

                <p className="mt-4 text-sm font-semibold text-[#8c52ff]">
                    {status}
                </p>

            </div>

            {/* CSS Animation defined inline for simplicity, or add to index.css */}
            <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.7); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
            animation: progress 2s infinite ease-in-out;
            transform-origin: left;
        }
      `}</style>
        </div>
    );
};

export default ProcessingPage;
