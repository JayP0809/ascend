'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardData } from '@/lib/types';
import { Download, Link2, CheckCircle, FileText, Map, BookOpen, BarChart2 } from 'lucide-react';
import { getReadinessColor } from '@/lib/scorer';

interface ExportTabProps {
  data: DashboardData;
}

const PDF_SECTIONS = [
  { icon: FileText, label: 'Cover page with readiness score' },
  { icon: BarChart2, label: 'Current skills summary' },
  { icon: BookOpen, label: 'Critical skill gaps table' },
  { icon: Map, label: 'Week-by-week roadmap (all phases)' },
  { icon: Link2, label: 'Recommended resources list' },
];

export function ExportTab({ data }: ExportTabProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { analysis } = data;
  const { gapAnalysis, skillExtraction, roadmap } = analysis;

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/dashboard?id=${analysis.analysisId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const accentColor: [number, number, number] = [99, 102, 241];
      const textDark: [number, number, number] = [15, 23, 42];
      const textLight: [number, number, number] = [71, 85, 105];
      const bgLight: [number, number, number] = [248, 250, 252];

      // Cover page
      doc.setFillColor(...accentColor);
      doc.rect(0, 0, 210, 60, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('Ascend Career Report', 20, 32);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Target: ${analysis.targetRole}`, 20, 42);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 50);

      // Score badge
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(150, 18, 42, 28, 4, 4, 'F');
      doc.setTextColor(...accentColor);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`${gapAnalysis.readiness_score}%`, 171, 32, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Readiness', 171, 40, { align: 'center' });

      let y = 75;

      // Summary section
      doc.setTextColor(...textDark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Current Skills', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textLight);
      const skillsText = skillExtraction.current_skills.join(', ');
      const skillLines = doc.splitTextToSize(skillsText, 170);
      doc.text(skillLines, 20, y);
      y += skillLines.length * 5 + 10;

      // Experience
      doc.setTextColor(...textDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Experience: ${skillExtraction.experience_years} years`, 20, y);
      doc.text(`Education: ${skillExtraction.education}`, 80, y);
      y += 12;

      // Strengths
      doc.setFontSize(14);
      doc.text('Strengths', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textLight);
      skillExtraction.strengths.forEach((s) => {
        doc.text(`• ${s}`, 20, y);
        y += 6;
      });
      y += 8;

      // Critical gaps table
      doc.setTextColor(...textDark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Critical Skill Gaps', 20, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [['Skill', 'Importance', 'Status']],
        body: gapAnalysis.missing_critical.map((s) => [s, 'Critical', 'To learn']),
        headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: textLight },
        alternateRowStyles: { fillColor: bgLight },
        margin: { left: 20, right: 20 },
      });

      y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40;
      y += 10;

      // Roadmap
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setTextColor(...textDark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Your Roadmap', 20, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [['Weeks', 'Focus Area', 'Topics', 'Project']],
        body: roadmap.map((phase) => [
          `${phase.week_start}–${phase.week_end}`,
          phase.focus_area,
          phase.topics.slice(0, 3).join('\n'),
          phase.project.title,
        ]),
        headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: textLight },
        columnStyles: { 2: { cellWidth: 70 } },
        alternateRowStyles: { fillColor: bgLight },
        margin: { left: 20, right: 20 },
      });

      y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40;
      y += 10;

      // Resources
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setTextColor(...textDark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Recommended Resources', 20, y);
      y += 6;

      const allResources = roadmap.flatMap((p) => p.resources).slice(0, 20);
      autoTable(doc, {
        startY: y,
        head: [['Title', 'Type', 'URL']],
        body: allResources.map((r) => [r.title, r.type, r.url]),
        headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: textLight },
        alternateRowStyles: { fillColor: bgLight },
        margin: { left: 20, right: 20 },
      });

      doc.save(`ascend-${analysis.targetRole.toLowerCase().replace(/\s+/g, '-')}-roadmap.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Your Ascend Report</h2>
        <p className="text-secondary">Download your personalized career analysis as a polished PDF.</p>
      </div>

      {/* Preview */}
      <Card>
        <h3 className="text-sm font-semibold text-primary mb-4">Report contents</h3>
        <div className="space-y-3">
          {PDF_SECTIONS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm text-secondary">{label}</span>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-accent">{gapAnalysis.readiness_score}%</p>
            <p className="text-xs text-muted">Readiness</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{gapAnalysis.missing_critical.length}</p>
            <p className="text-xs text-muted">Skills to learn</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{roadmap.length}</p>
            <p className="text-xs text-muted">Roadmap phases</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={handleDownloadPDF}
          loading={generating}
        >
          <Download className="h-4 w-4" />
          {generating ? 'Generating PDF...' : 'Download PDF Report'}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleCopyLink}
        >
          {copied ? <CheckCircle className="h-4 w-4 text-[var(--success)]" /> : <Link2 className="h-4 w-4" />}
          {copied ? 'Link copied!' : 'Copy shareable link'}
        </Button>
      </div>

      <p className="text-center text-xs text-muted">
        The PDF is generated locally in your browser — no data is sent to any server.
      </p>
    </div>
  );
}
