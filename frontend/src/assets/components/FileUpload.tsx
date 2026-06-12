import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { FaCloudArrowUp, FaFilePdf, FaXmark, FaCircleCheck } from "react-icons/fa6";

interface Props {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export default function FileUpload({ files, setFiles }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrag = (e: DragEvent) => {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") setDrag(true);
    else if (e.type === "dragleave") setDrag(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files));
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(Array.from(e.target.files));
  };

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => f.type === "application/pdf");
    if (valid.length !== incoming.length) {
      alert("Only PDF files are accepted.");
    }
    if (valid.length) setFiles((prev) => [...prev, ...valid]);
  };

  const remove = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Financial Documents</h3>
        <p className="text-sm text-dark-400 dark:text-dark-400 mt-0.5">Upload balance sheets, P&L, or cash flow PDFs</p>
      </div>

      <div
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
          drag
            ? "border-accent bg-accent/5"
            : files.length > 0
            ? "border-dark-200 dark:border-dark-600 bg-dark-50 dark:bg-dark-800/50"
            : "border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800/30"
        }`}
      >
        {files.length === 0 ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-4">
              <FaCloudArrowUp className="text-2xl" />
            </div>
            <p className="text-sm font-medium text-dark-500 dark:text-dark-300">Drag & drop PDFs here</p>
            <span className="text-xs text-dark-400 my-2">or</span>
            <button onClick={() => inputRef.current?.click()} className="text-sm font-semibold text-accent hover:underline">
              Browse files
            </button>
          </>
        ) : (
          <div className="w-full space-y-3">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-dark-100 bg-white p-3 dark:border-dark-700 dark:bg-dark-850">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10">
                  <FaFilePdf />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-dark-900 dark:text-white">{f.name}</p>
                  <p className="text-xs text-dark-400">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={() => remove(i)} className="flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors">
                  <FaXmark />
                </button>
              </div>
            ))}
            <button onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-dark-200 p-3 text-sm text-dark-400 hover:border-accent hover:text-accent transition-colors dark:border-dark-600">
              <FaCloudArrowUp /> Add more files
            </button>
          </div>
        )}

        <input ref={inputRef} type="file" className="hidden" accept=".pdf" multiple onChange={onChange} />
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <FaCircleCheck className="text-xs" />
          <span>{files.length} file{files.length !== 1 ? "s" : ""} ready</span>
        </div>
      )}
    </div>
  );
}
