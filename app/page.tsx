'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { Hero } from '@/components/landing/Hero';
import { RoleSampleCards } from '@/components/landing/RoleSampleCards';
import { SampleResumePreview } from '@/components/landing/SampleResumePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResumeDropzone } from '@/components/upload/ResumeDropzone';
import { RoleSearch } from '@/components/upload/RoleSearch';
import { AnalysisLoader } from '@/components/upload/AnalysisLoader';

// Stable demo ID for the sample resume flow — matches the GET /api/analyze handler.
const DEMO_ANALYSIS_ID = 'demo-sample-001';

type Step = 'upload' | 'resume-preview' | 'role' | 'analyzing';

export default function HomePage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [analysisId, setAnalysisId] = useState<string>('');

  // Auto-open the sample resume preview when navigating back from the demo dashboard.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('step') === 'preview') {
      setAnalysisId(DEMO_ANALYSIS_ID);
      setStep('resume-preview');
      setOpen(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleOpen = () => {
    setStep('upload');
    setOpen(true);
  };

  const handleViewSample = (id: string) => {
    router.push(`/dashboard?id=${id}`);
  };

  const handleSampleResumePreview = () => {
    setAnalysisId(DEMO_ANALYSIS_ID);
    setStep('resume-preview');
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

  const isPreviewStep = step === 'resume-preview';

  return (
    <div style={{ background: 'var(--bg-primary)' }} className="min-h-screen">
      <Navbar />

      <Hero onStartAnalysis={handleOpen} />
      <RoleSampleCards onViewSample={handleViewSample} />

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            AI-generated results are heuristic estimates, not professional career advice.
          </p>
          <nav className="flex items-center gap-5 text-sm text-secondary" aria-label="Legal">
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="/settings" className="hover:text-primary transition-colors">Account Settings</a>
          </nav>
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
              <ResumeDropzone
                onUploadComplete={handleUploadComplete}
                onSampleResumePreview={handleSampleResumePreview}
              />
            </>
          )}

          {isPreviewStep && (
            <>
              <DialogHeader>
                <DialogTitle>Sample resume</DialogTitle>
                <DialogDescription>
                  Explore the sample analysis using this fictional resume.
                </DialogDescription>
              </DialogHeader>
              <SampleResumePreview
                onBack={() => setStep('upload')}
                onContinue={() => setStep('role')}
              />
            </>
          )}

          {step === 'role' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {analysisId === DEMO_ANALYSIS_ID ? 'Pick a target role' : 'Where do you want to go?'}
                </DialogTitle>
                <DialogDescription>
                  {analysisId === DEMO_ANALYSIS_ID
                    ? "Choose a role to see a sample roadmap. No sign-in required."
                    : "Search for your target role and we'll generate a personalized roadmap."}
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
