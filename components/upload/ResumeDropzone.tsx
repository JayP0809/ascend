'use client';
import { useState, useCallback } from 'react';
import { Upload, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface ResumeDropzoneProps {
  onUploadComplete: (analysisId: string) => void;
}

export function ResumeDropzone({ onUploadComplete }: ResumeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(pdf|docx|doc|txt)$/i)) {
      setError('Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      setUploadedFile({ name: file.name, size: `${sizeMB} MB` });
      onUploadComplete(data.analysisId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSampleResume = async () => {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/upload');
      const data = await res.json();
      setUploadedFile({ name: 'demo-resume.pdf', size: 'Sample' });
      onUploadComplete(data.analysisId);
    } catch {
      setError('Failed to load sample resume');
    } finally {
      setUploading(false);
    }
  };

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-success bg-[var(--success)] bg-opacity-10">
        <CheckCircle className="h-5 w-5 text-[var(--success)] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate">{uploadedFile.name}</p>
          <p className="text-xs text-muted">{uploadedFile.size}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          'flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all',
          isDragging
            ? 'border-accent bg-accent-light scale-[1.01]'
            : 'border-border hover:border-accent hover:bg-accent-light',
          uploading && 'opacity-60 pointer-events-none'
        )}
      >
        <input
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {uploading ? (
          <>
            <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-medium text-secondary">Extracting your skills...</p>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-xl bg-accent-light flex items-center justify-center mb-3">
              <Upload className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-medium text-primary mb-1">
              Drop your resume here — PDF or DOCX
            </p>
            <p className="text-xs text-muted">or click to browse</p>
          </>
        )}
      </label>

      {error && (
        <div className="flex items-center gap-2 text-sm text-[var(--danger)]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        onClick={handleSampleResume}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm text-secondary hover:text-primary hover:bg-background transition-colors"
      >
        <FileText className="h-4 w-4" />
        Try the sample resume
      </button>
    </div>
  );
}
