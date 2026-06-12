import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import FileUpload from "../assets/components/FileUpload";
import QuestionInput from "../assets/components/QuestionInput";

export default function ProductPage() {
  const [question, setQuestion] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const navigate = useNavigate();

  const handleGenerate = () => {
    if (!files.length) return alert("Please upload at least one PDF.");
    if (!question.trim()) return alert("Please enter a question.");
    navigate("/processing", { state: { files, question } });
  };

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent dark:bg-accent/10">
            AI Financial Analyst
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-dark-900 dark:text-white sm:text-4xl">
            Start Your <span className="gradient-text">Deep Analysis</span>
          </h1>
          <p className="mt-3 text-dark-400 dark:text-dark-300">
            Upload financial reports, ask a question, and get instant Monte Carlo-powered insights.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">1</span>
              <span className="text-sm font-semibold text-dark-500 dark:text-dark-300">Upload financial data</span>
            </div>
            <FileUpload files={files} setFiles={setFiles} />
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">2</span>
              <span className="text-sm font-semibold text-dark-500 dark:text-dark-300">Ask your question</span>
            </div>
            <QuestionInput question={question} setQuestion={setQuestion} onGenerate={handleGenerate} />
          </div>
        </div>
      </main>
    </div>
  );
}
