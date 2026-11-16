'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface SampleResumePreviewProps {
  onBack: () => void;
  onContinue: () => void;
}

// Fictional resume consistent with the sample analysis (Software Engineer → DevOps).
// Skills, experience years, and education match the data returned by getDemoData().
const DEMO_RESUME = {
  name: 'Alex Rivera',
  title: 'Software Engineer',
  location: 'Jersey City, NJ',
  education: {
    degree: 'B.S. Computer Science',
    school: 'State University',
    year: '2021',
  },
  experience: [
    {
      title: 'Software Engineer',
      company: 'TechCorp',
      period: '2021 – Present · 3 years',
      bullets: [
        'Built and maintained REST APIs using Node.js and Python (FastAPI)',
        'Developed React + TypeScript frontend features across two product lines',
        'Wrote unit and integration tests with Jest; maintained 80 %+ coverage',
        'Collaborated with the operations team during on-call incidents, sparking interest in infrastructure and reliability',
        'Used Git, GitHub Actions CI/CD, Docker-based local dev, and PostgreSQL',
      ],
    },
    {
      title: 'Software Engineering Intern',
      company: 'StartupXYZ',
      period: 'Summer 2020',
      bullets: [
        'Built an internal reporting dashboard with React and PostgreSQL',
        'Wrote SQL queries for weekly business-metrics exports',
      ],
    },
  ],
  skills: [
    { label: 'Languages', items: 'JavaScript, TypeScript, Python, SQL' },
    { label: 'Frameworks', items: 'React, Node.js, FastAPI' },
    { label: 'Tools', items: 'Git, GitHub Actions, Docker (basic), PostgreSQL' },
    { label: 'Other', items: 'REST APIs, HTML/CSS, Jest, Agile/Scrum' },
  ],
};

export function SampleResumePreview({ onBack, onContinue }: SampleResumePreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Resume card */}
      <div
        className="rounded-xl border border-border overflow-y-auto"
        style={{ maxHeight: '55vh', background: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-primary">{DEMO_RESUME.name}</h3>
          <p className="text-sm text-secondary">
            {DEMO_RESUME.title} · {DEMO_RESUME.location}
          </p>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Education */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Education
            </h4>
            <p className="text-sm text-primary font-medium">{DEMO_RESUME.education.degree}</p>
            <p className="text-xs text-secondary">
              {DEMO_RESUME.education.school} · {DEMO_RESUME.education.year}
            </p>
          </section>

          {/* Experience */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
              Experience
            </h4>
            <div className="space-y-4">
              {DEMO_RESUME.experience.map((job) => (
                <div key={job.company}>
                  <p className="text-sm font-medium text-primary">{job.title}</p>
                  <p className="text-xs text-muted mb-1.5">
                    {job.company} · {job.period}
                  </p>
                  <ul className="space-y-1">
                    {job.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2 text-xs text-secondary">
                        <span className="mt-1 h-1 w-1 rounded-full bg-muted flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Skills
            </h4>
            <div className="space-y-1">
              {DEMO_RESUME.skills.map((s) => (
                <p key={s.label} className="text-xs text-secondary">
                  <span className="font-medium text-primary">{s.label}:</span> {s.items}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Sample label */}
      <p className="text-xs text-muted text-center">
        This is a fictional sample resume. No real personal data is used.
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue} className="flex-1">
          Continue to sample analysis
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
