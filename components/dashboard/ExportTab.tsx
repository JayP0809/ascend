'use client';
import { useState } from 'react';
import { DashboardData } from '@/lib/types';
import { Download, Link2, CheckCircle, FileText, Map, BookOpen, BarChart2 } from 'lucide-react';

interface ExportTabProps {
  data: DashboardData;
}

const PDF_SECTIONS = [
  { icon: FileText, label: 'Cover page with readiness score and skills' },
  { icon: BarChart2, label: 'Strengths and critical skill gaps' },
  { icon: Map,      label: 'Week-by-week personalized roadmap' },
  { icon: BookOpen, label: 'Recommended resources with links' },
];

export function ExportTab({ data }: ExportTabProps) {
  const [copied,     setCopied]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const { analysis } = data;
  const { gapAnalysis } = analysis;

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
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setLineHeightFactor(1.4);

      const { skillExtraction, roadmap, gapAnalysis, targetRole } = analysis;
      const allResources = roadmap.flatMap((p) => p.resources);

      // ── Tokens ───────────────────────────────────────────────────────────
      type RGB = readonly [number, number, number];
      const C = {
        charcoal: [30, 26, 22]   as RGB,
        mid:      [74, 66, 56]   as RGB,
        muted:    [126, 114, 96] as RGB,
        rule:     [210, 202, 190] as RGB,
        green:    [61, 107, 59]  as RGB,
        hdr:      [244, 241, 236] as RGB,
      };

      // Page geometry
      const ML  = 18;
      const MR  = 192;
      const W   = MR - ML;              // 174mm
      const CB  = 297 - 14 - 4;        // content bottom: 279mm
      const FY  = 297 - 14;            // footer rule y: 283mm
      const MID = ML + W * 0.40;       // mid-col x (experience/education split)

      // Roadmap two-column layout
      const LW = W * 0.56;             // topics col width ~97mm
      const RX = ML + W * 0.60;        // right col x ~122mm
      const RW = MR - RX;              // right col width ~70mm

      // ── Micro-helpers ─────────────────────────────────────────────────────
      const sc   = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
      const fc   = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
      const dc   = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
      const lh   = (pt: number) => pt * 0.352778 * 1.4;
      const sf   = (style: 'normal' | 'bold' | 'italic', pt: number) => {
        doc.setFont('helvetica', style); doc.setFontSize(pt);
      };
      const wrap = (text: string, w: number, pt: number): string[] => {
        doc.setFontSize(pt);
        return doc.splitTextToSize(text, w);
      };
      const rule = (y: number, x0 = ML, x1 = MR, lw = 0.15) => {
        dc(C.rule); doc.setLineWidth(lw); doc.line(x0, y, x1, y);
      };
      const br = (y: number, need: number): number => {
        if (y + need > CB) { doc.addPage(); return 24; }
        return y;
      };
      // Section eyebrow — thin rule then label; returns y after label
      const secLbl = (text: string, y: number): number => {
        rule(y);
        sf('bold', 7.5); sc(C.muted);
        doc.text(text.toUpperCase(), ML, y + 5);
        return y + 12;
      };
      const footer = (pg: number, total: number) => {
        rule(FY);
        sf('normal', 7.5); sc(C.muted);
        doc.text('Ascend', ML, FY + 3.5);
        doc.text(`${pg} of ${total}`, MR, FY + 3.5, { align: 'right' });
      };

      // Phase height estimator (needs LW, RW in scope)
      const phaseH = (phase: (typeof roadmap)[number]): number => {
        const fL = wrap(phase.focus_area, W, 12).length;
        const tL = wrap(phase.topics.join('  ·  '), LW, 9.5).length;
        const pL = wrap(phase.project.title, RW, 10).length;
        const mL = wrap(phase.milestone, RW, 8.5).length;
        const leftH  = fL * lh(12) + 2 + tL * lh(9.5);
        const rightH = 3.5 + pL * lh(10) + 4 + 3.5 + mL * lh(8.5);
        // header band + sub-rule + content + bottom padding
        return 7.5 + 1 + Math.max(leftH, rightH) + 7;
      };

      // ── PAGE 1: CAREER ASSESSMENT ────────────────────────────────────────

      // Top header strip
      rule(18);
      sf('normal', 8); sc(C.muted);
      doc.text('Ascend', ML, 23.5);
      doc.text(
        new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        MR, 23.5, { align: 'right' },
      );
      rule(27.5);

      let y = 36;

      // Eyebrow
      sf('bold', 7.5); sc(C.muted);
      doc.text('CAREER ASSESSMENT', ML, y);
      y += 7;

      // Role title + Score block
      const score = gapAnalysis.readiness_score;
      const roleLines = wrap(targetRole, W * 0.60, 22);
      sf('bold', 22); sc(C.charcoal);
      doc.text(roleLines, ML, y);

      sf('bold', 42); sc(C.charcoal);
      doc.text(`${score}`, MR, y, { align: 'right' });
      sf('normal', 11); sc(C.muted);
      doc.text('/100', MR, y + 11, { align: 'right' });
      sf('normal', 8.5); sc(C.muted);
      doc.text('Career readiness', MR, y + 18.5, { align: 'right' });

      y += Math.max(roleLines.length * lh(22), 22) + 8;

      // AI disclaimer
      sf('italic', 8.5); sc(C.muted);
      const discL = wrap(
        'AI-generated heuristic estimate. Not a statistical probability or guaranteed outcome.',
        W * 0.62, 8.5,
      );
      doc.text(discL, ML, y);
      y += discL.length * lh(8.5) + 13;

      // Experience / Education
      rule(y); y += 7;
      sf('bold', 7.5); sc(C.muted);
      doc.text('EXPERIENCE', ML, y);
      doc.text('EDUCATION', MID, y);
      y += 5;
      sf('normal', 11); sc(C.mid);
      doc.text(
        `${skillExtraction.experience_years} year${skillExtraction.experience_years !== 1 ? 's' : ''}`,
        ML, y,
      );
      const eduL = wrap(skillExtraction.education, MR - MID - 4, 11);
      doc.text(eduL, MID, y);
      y += Math.max(lh(11), eduL.length * lh(11)) + 13;

      // Current Skills
      y = secLbl('Current Skills', y);
      sf('normal', 10.5); sc(C.mid);
      const skillL = wrap(skillExtraction.current_skills.join('  ·  '), W, 10.5);
      doc.text(skillL, ML, y);
      y += skillL.length * lh(10.5) + 12;

      // Strengths
      y = br(y, 24);
      y = secLbl('Strengths', y);
      skillExtraction.strengths.forEach((s, i) => {
        y = br(y, 12);
        sf('bold', 9); sc(C.green);
        doc.text(`${i + 1}.`, ML, y);
        const sL = wrap(s, W - 7, 10.5);
        sf('normal', 10.5); sc(C.mid);
        doc.text(sL, ML + 7, y);
        y += sL.length * lh(10.5) + 2.5;
      });
      y += 8;

      // Critical Skill Gaps
      y = br(y, 28);
      y = secLbl('Critical Skill Gaps', y);
      if (gapAnalysis.missing_critical.length === 0) {
        sf('italic', 10.5); sc(C.muted);
        doc.text('No critical skill gaps identified.', ML, y);
        y += 12;
      } else {
        const gaps    = gapAnalysis.missing_critical;
        const cols    = gaps.length <= 6 ? 2 : 3;
        const perCol  = Math.ceil(gaps.length / cols);
        const colW    = W / cols;
        const colY: number[] = Array(cols).fill(y);

        gaps.forEach((skill, i) => {
          const c = Math.min(Math.floor(i / perCol), cols - 1);
          fc(C.green);
          doc.circle(ML + c * colW + 1.4, colY[c] - 1.4, 1.3, 'F');
          const skL = wrap(skill, colW - 7, 10.5);
          sf('normal', 10.5); sc(C.mid);
          doc.text(skL, ML + c * colW + 5.5, colY[c]);
          colY[c] += skL.length * lh(10.5) + 2.5;
        });
        y = Math.max(...colY) + 8;
      }

      // ── PERSONALIZED ROADMAP ──────────────────────────────────────────────

      // Break to new page if section header + first phase don't fit
      const firstH = roadmap.length > 0 ? Math.min(phaseH(roadmap[0]), CB - 24) : 42;
      if (y > CB - (15 + 3 + firstH)) { doc.addPage(); y = 24; } else { y += 6; }
      y = secLbl('Personalized Roadmap', y);
      y += 3;

      roadmap.forEach((phase, idx) => {
        const isLast = idx === roadmap.length - 1;
        const needed = Math.min(phaseH(phase), CB - 24);
        y = br(y, needed);

        // Phase header band
        fc(C.hdr); dc(C.rule); doc.setLineWidth(0.1);
        doc.rect(ML, y, W, 7.5, 'FD');
        sf('bold', 7.5); sc(C.muted);
        doc.text(`WK ${phase.week_start}-${phase.week_end}`, ML + 3, y + 5);
        doc.text(`Phase ${idx + 1} of ${roadmap.length}`, MR - 3, y + 5, { align: 'right' });
        y += 8.5;

        // Phase title (full width)
        sf('bold', 12); sc(C.charcoal);
        const fL = wrap(phase.focus_area, W, 12);
        doc.text(fL, ML, y);
        y += fL.length * lh(12) + 2;

        // Thin rule under title
        rule(y, ML, MR, 0.1);
        y += 4;

        // Two-column content
        let leftY  = y;
        let rightY = y;

        // Topics (left col, muted middot-joined)
        sf('normal', 9.5); sc(C.muted);
        const tL = wrap(phase.topics.join('  ·  '), LW, 9.5);
        doc.text(tL, ML, leftY);
        leftY += tL.length * lh(9.5);

        // Project (right col)
        sf('bold', 7); sc(C.green);
        doc.text('PROJECT', RX, rightY);
        rightY += 3.5;
        sf('normal', 10); sc(C.mid);
        const pL = wrap(phase.project.title, RW, 10);
        doc.text(pL, RX, rightY);
        rightY += pL.length * lh(10) + 4;

        // Milestone (right col)
        sf('bold', 7); sc(C.green);
        doc.text('MILESTONE', RX, rightY);
        rightY += 3.5;
        sf('italic', 8.5); sc(C.muted);
        const mL = wrap(phase.milestone, RW, 8.5);
        doc.text(mL, RX, rightY);
        rightY += mL.length * lh(8.5);

        y = Math.max(leftY, rightY) + 6;

        if (!isLast) {
          rule(y, ML, MR, 0.1);
          y += 4;
        } else {
          y += 8;
        }
      });

      // ── RECOMMENDED RESOURCES ─────────────────────────────────────────────

      if (allResources.length > 0) {
        const resMin = 15 + 3 + 11;
        if (y > CB - resMin) { doc.addPage(); y = 24; }
        y = secLbl('Recommended Resources', y);
        y += 3;

        allResources.forEach((res) => {
          const tL    = wrap(res.title, W - 26, 9.5);
          const rowH  = tL.length * lh(9.5) + lh(7) + 4.5;
          y = br(y, rowH + 1);

          // Title (clickable)
          sf('normal', 9.5); sc(C.mid);
          doc.text(tL, ML, y);
          try {
            doc.link(ML, y - 3.5, W - 26, tL.length * lh(9.5) + 1, { url: res.url });
          } catch { /* ignore */ }

          // Type badge right-aligned
          sf('bold', 7.5); sc(C.green);
          doc.text(res.type.toUpperCase(), MR, y, { align: 'right' });

          y += tL.length * lh(9.5) + 1.5;

          // Domain / path display
          let disp = res.url;
          try {
            const pu   = new URL(res.url);
            const host = pu.hostname.replace(/^www\./, '');
            if (pu.hostname.includes('youtube') && pu.searchParams.has('v')) {
              disp = `${host}/watch?v=${pu.searchParams.get('v')}`;
            } else if (pu.pathname !== '/' && pu.pathname.length <= 48) {
              disp = host + pu.pathname;
            } else {
              disp = host;
            }
          } catch { /* keep original */ }
          const urlTxt = disp.length > 55 ? disp.slice(0, 52) + '…' : disp;

          sf('normal', 7.5); sc(C.muted);
          doc.text(urlTxt, ML, y);
          try {
            doc.link(ML, y - 3, doc.getTextWidth(urlTxt), 3.5, { url: res.url });
          } catch { /* ignore */ }

          y += lh(7.5) + 4;
          rule(y, ML, MR, 0.08);
          y += 2;
        });
      }

      // ── Page footers ─────────────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        footer(i, totalPages);
      }

      const safeName = targetRole.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim();
      doc.save(`Ascend - ${safeName} - Roadmap.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          Export PDF
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Download your personalized career analysis as a print-ready PDF document.
        </p>
      </div>

      {/* Report contents */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '20px 24px',
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}
        >
          Report contents
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PDF_SECTIONS.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={14} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            textAlign: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1.5rem',
                fontWeight: 400,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
                marginBottom: 2,
              }}
            >
              {gapAnalysis.readiness_score}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Readiness</p>
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1.5rem',
                fontWeight: 400,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
                marginBottom: 2,
              }}
            >
              {gapAnalysis.missing_critical.length}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Skills to learn</p>
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1.5rem',
                fontWeight: 400,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
                marginBottom: 2,
              }}
            >
              {analysis.roadmap.length}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Roadmap phases</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '11px 16px',
            borderRadius: 3,
            border: '1px solid var(--border-strong)',
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            fontSize: 13,
            fontWeight: 500,
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.7 : 1,
            transition: 'opacity 0.1s',
          }}
        >
          <Download size={14} strokeWidth={2} />
          {generating ? 'Generating PDF…' : 'Download PDF report'}
        </button>

        <button
          onClick={handleCopyLink}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 16px',
            borderRadius: 3,
            border: '1px solid var(--border)',
            background: 'none',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'color 0.1s, border-color 0.1s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color      = 'var(--text-primary)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color      = 'var(--text-secondary)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          }}
        >
          {copied ? <CheckCircle size={14} strokeWidth={2} /> : <Link2 size={14} strokeWidth={1.5} />}
          {copied ? 'Link copied' : 'Copy shareable link'}
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        The PDF is generated locally in your browser. No data is sent to any server.
      </p>
    </div>
  );
}
