'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { Hero } from '@/components/landing/Hero';
import { RoleSampleCards } from '@/components/landing/RoleSampleCards';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResumeDropzone } from '@/components/upload/ResumeDropzone';
import { RoleSearch } from '@/components/upload/RoleSearch';
import { AnalysisLoader } from '@/components/upload/AnalysisLoader';

type Step = 'upload' | 'role' | 'analyzing';

export default function HomePage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [analysisId, setAnalysisId] = useState<string>('');

  const handleOpen = () => {
    setStep('upload');
    setOpen(true);
  };

  const handleViewSample = (id: string) => {
    router.push(`/dashboard?id=${id}`);
  };

  const handleUploadComplete = (id: string) => {
    setAnalysisId(id);
    setStep('role');
  };

  const handleAnalysisStart = () => {
    setStep('analyzing');
  };

  const handleAnalysisComplete = (data: { analysisId: string }) => {
    setOpen(false);
    router.push(`/dashboard?id=${data.analysisId}`);
  };

  return (
    <div style={{ background: 'var(--bg-primary)' }} className="min-h-screen">
      <Navbar />

      <Hero onStartAnalysis={handleOpen} />
      <RoleSampleCards onViewSample={handleViewSample} />

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            Built with Next.js + Claude AI · Open source on GitHub
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </footer>

      {/* Upload Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" showClose={step !== 'analyzing'}>
          {step === 'upload' && (
            <>
              <DialogHeader>
                <DialogTitle>Upload your resume</DialogTitle>
                <DialogDescription>
                  We&apos;ll analyze your skills and match them to your target role.
                </DialogDescription>
              </DialogHeader>
              <ResumeDropzone onUploadComplete={handleUploadComplete} />
            </>
          )}

          {step === 'role' && (
            <>
              <DialogHeader>
                <DialogTitle>Where do you want to go?</DialogTitle>
                <DialogDescription>
                  Search for your target role and we&apos;ll generate a personalized roadmap.
                </DialogDescription>
              </DialogHeader>
              <RoleSearch
                analysisId={analysisId}
                onAnalysisStart={handleAnalysisStart}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </>
          )}

          {step === 'analyzing' && (
            <>
              <DialogTitle className="sr-only">Analyzing your resume</DialogTitle>
              <AnalysisLoader onComplete={handleAnalysisComplete} analysisId={analysisId} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
