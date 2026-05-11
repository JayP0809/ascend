'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  'Resume parsed',
  'Identifying your skills...',
  'Analyzing role requirements...',
  'Generating your roadmap...',
];

interface AnalysisLoaderProps {
  analysisId: string;
  onComplete: (data: { analysisId: string }) => void;
}

export function AnalysisLoader({ analysisId, onComplete }: AnalysisLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      setCurrentStep(stepIndex);
      if (stepIndex >= STEPS.length - 1) {
        clearInterval(interval);
        // Poll for completion
        pollForResult();
      }
    }, 1200);

    async function pollForResult() {
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const res = await fetch(`/api/analyze?id=${analysisId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.dashboard) {
              onComplete({ analysisId });
              return;
            }
          }
        } catch {
          // keep polling
        }
      }
      // Timeout fallback
      onComplete({ analysisId });
    }

    return () => clearInterval(interval);
  }, [analysisId, onComplete]);

  return (
    <div className="py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-accent-light mb-4">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-primary">Analyzing your profile</h3>
        <p className="text-sm text-secondary mt-1">This takes about 15–30 seconds</p>
      </div>

      <div className="space-y-4 max-w-xs mx-auto">
        {STEPS.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: i <= currentStep ? 1 : 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="flex-shrink-0">
              {i < currentStep ? (
                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
              ) : i === currentStep ? (
                <Loader2 className="h-5 w-5 text-accent animate-spin" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-border" />
              )}
            </div>
            <span className={`text-sm ${i <= currentStep ? 'text-primary font-medium' : 'text-muted'}`}>
              {step}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
