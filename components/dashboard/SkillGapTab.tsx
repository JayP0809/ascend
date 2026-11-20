'use client';
import { useState, useRef } from 'react';
import { DashboardData, SkillGapItem } from '@/lib/types';
import { ArrowUpRight } from 'lucide-react';

// ── Skill status config ───────────────────────────────────────────────────────

const STATUS: Record<SkillGapItem['importance'], { label: string; fg: string; bg: string }> = {
  critical:       { label: 'Critical gap',      fg: 'var(--sl-crit-fg)', bg: 'var(--sl-crit-bg)' },
  'nice-to-have': { label: 'Needs development', fg: 'var(--sl-nice-fg)', bg: 'var(--sl-nice-bg)' },
  transferable:   { label: 'Transferable',      fg: 'var(--sl-xfer-fg)', bg: 'var(--sl-xfer-bg)' },
  has:            { label: 'Already have',      fg: 'var(--sl-has-fg)',  bg: 'var(--sl-has-bg)'  },
};

const CATEGORY_LABEL: Record<string, string> = {
  technical:      'Technical',
  soft:           'Soft skill',
  tools:          'Tool',
  certifications: 'Certification',
};

// ── Urgency indicator (interpolates gradient color at position) ───────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace('#', '');
  if (h.length !== 6) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function interpolateGradientColor(position: number): string {
  if (typeof window === 'undefined') return '#888888';
  const style = getComputedStyle(document.documentElement);
  const c0 = hexToRgb(style.getPropertyValue('--sl-has-grad').trim())  ?? [77, 173, 120];
  const c1 = hexToRgb(style.getPropertyValue('--sl-xfer-grad').trim()) ?? [137, 181,  53];
  const c2 = hexToRgb(style.getPropertyValue('--sl-nice-grad').trim()) ?? [212, 137,  12];
  const c3 = hexToRgb(style.getPropertyValue('--sl-crit-grad').trim()) ?? [194,  50,  50];

  const seg = 1 / 3;
  let r: number, g: number, b: number;
  if (position <= seg) {
    const t = position / seg;
    r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
    g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
    b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
  } else if (position <= 2 * seg) {
    const t = (position - seg) / seg;
    r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  } else {
    const t = (position - 2 * seg) / seg;
    r = Math.round(c2[0] + (c3[0] - c2[0]) * t);
    g = Math.round(c2[1] + (c3[1] - c2[1]) * t);
    b = Math.round(c2[2] + (c3[2] - c2[2]) * t);
  }
  return `rgb(${r},${g},${b})`;
}

function UrgencyIndicator({ position }: { position: number }) {
  const color = interpolateGradientColor(position);
  return (
    <span
      className="urgency-indicator absolute rounded-full pointer-events-none"
      aria-hidden="true"
      style={{
        width: 16,
        height: 16,
        top: '50%',
        left: `calc(${position * 100}% - 8px)`,
        transform: 'translateY(-50%)',
        background: color,
        border: '2px solid var(--bg-primary)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.20)',
      }}
    />
  );
}

// ── Urgency legend ────────────────────────────────────────────────────────────

const URGENCY_CATEGORIES = [
  { label: 'Already have',      desc: 'This skill is in your toolkit. It carries over directly.' },
  { label: 'Transferable',      desc: 'Applies from your existing background with some adaptation.' },
  { label: 'Needs development', desc: 'Needs dedicated time and practice to reach the required level.' },
  { label: 'Critical gap',      desc: 'High priority. Central to what this role requires.' },
] as const;

function UrgencyLegend() {
  const [position, setPosition] = useState<number | null>(null);
  const isDragging = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const posFromX = (clientX: number): number => {
    if (!barRef.current) return 0.5;
    // barRef is the padded wrapper; use its left/width which matches the visual strip's x-axis.
    const rect = barRef.current.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    barRef.current?.setPointerCapture(e.pointerId);
    isDragging.current = true;
    setPosition(posFromX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    setPosition(posFromX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    barRef.current?.releasePointerCapture(e.pointerId);
  };

  // Mouse event fallbacks for environments where pointer events are not synthesised.
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    setPosition(posFromX(e.clientX));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    setPosition(posFromX(e.clientX));
  };

  const handleMouseUp = () => { isDragging.current = false; };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 1 / 20; // 5% per key press
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setPosition(prev => clamp((prev ?? 0.5) - step));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setPosition(prev => clamp((prev ?? 0.5) + step));
    } else if (e.key === 'Home') {
      e.preventDefault(); setPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault(); setPosition(1);
    } else if (e.key === 'Escape') {
      e.preventDefault(); setPosition(null);
    } else if ((e.key === 'Enter' || e.key === ' ') && position === null) {
      e.preventDefault(); setPosition(0.5);
    }
  };

  const pct = position !== null ? Math.round(position * 100) : 50;
  const catIdx = position !== null ? Math.min(3, Math.floor(position * 4)) : null;
  const category = catIdx !== null ? URGENCY_CATEGORIES[catIdx] : null;

  return (
    <div className="mb-7 pb-7 border-b" style={{ borderColor: 'var(--border)' }}>
      <p
        className="text-xs uppercase tracking-widest font-medium mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Development urgency
      </p>

      {/* Gradient bar — outer div provides a larger touch/click target while inner div is the visible strip */}
      <div
        ref={barRef}
        className="urgency-bar relative cursor-pointer select-none"
        style={{ padding: '10px 0' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-label="Explore development urgency scale"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={category ? `${category.label}: ${category.desc}` : 'Hidden; press Enter or Space to show'}
        tabIndex={0}
      >
        {/* Visual strip */}
        <div
          className="relative h-2 rounded-full"
          style={{
            background: 'linear-gradient(to right, var(--sl-has-grad), var(--sl-xfer-grad), var(--sl-nice-grad), var(--sl-crit-grad))',
          }}
        >
          {position !== null && (
            <UrgencyIndicator position={position} />
          )}
        </div>
      </div>

      {/* Description area — fixed height prevents layout shift */}
      <div className="mt-2.5" style={{ minHeight: 36 }}>
        {category ? (
          <p
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
            aria-live="polite"
            aria-atomic="true"
          >
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{category.label}.</span>
            {' '}{category.desc}
          </p>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Click or tap to explore the scale. Use arrow keys to move.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Skill row ─────────────────────────────────────────────────────────────────

function SkillRow({ skill }: { skill: SkillGapItem }) {
  const status = STATUS[skill.importance];
  const categoryLabel = CATEGORY_LABEL[skill.category] || skill.category;

  return (
    <div
      className="flex items-center gap-4 py-4 border-b last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Name + roadmap tag */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {skill.name}
        </span>
        {skill.importance === 'critical' && (
          <span
            className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded"
            style={{ color: 'var(--emerald-text)', background: 'var(--emerald-light)' }}
          >
            <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
            In roadmap
          </span>
        )}
      </div>

      {/* Category label — hidden on mobile to keep rows compact */}
      <span
        className="text-xs whitespace-nowrap hidden sm:block flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        {categoryLabel}
      </span>

      {/* Status badge */}
      <span
        className="text-xs px-2.5 py-1 rounded font-medium whitespace-nowrap flex-shrink-0"
        style={{ color: status.fg, background: status.bg }}
      >
        {status.label}
      </span>
    </div>
  );
}

// ── Skill group (shown when filter = All and no search) ───────────────────────

function SkillGroup({ title, skills }: { title: string; skills: SkillGapItem[] }) {
  if (skills.length === 0) return null;
  return (
    <div className="mb-8">
      <p
        className="text-xs uppercase tracking-widest font-medium mb-0 pb-3 border-b"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
      >
        {title} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({skills.length})</span>
      </p>
      {skills.map((s) => <SkillRow key={s.name} skill={s} />)}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface SkillGapTabProps {
  data: DashboardData;
}

export function SkillGapTab({ data }: SkillGapTabProps) {
  const { skillGapItems, analysis } = data;

  const has          = skillGapItems.filter(s => s.importance === 'has');
  const transferable = skillGapItems.filter(s => s.importance === 'transferable');
  const niceToHave   = skillGapItems.filter(s => s.importance === 'nice-to-have');
  const critical     = skillGapItems.filter(s => s.importance === 'critical');

  return (
    <div>
      {/* Interactive urgency legend */}
      <UrgencyLegend />

      {/* Grouped skill list: Already have → Transferable → Needs development → Critical gap */}
      <div>
        <SkillGroup title="Already have"      skills={has}          />
        <SkillGroup title="Transferable"      skills={transferable} />
        <SkillGroup title="Needs development" skills={niceToHave}   />
        <SkillGroup title="Critical gaps"     skills={critical}     />
      </div>

      {/* Transferable skills detail */}
      {transferable.length > 0 && (
        <div className="mt-10 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
          <p
            className="text-xs uppercase tracking-widest font-medium mb-5"
            style={{ color: 'var(--text-muted)' }}
          >
            Transferable skills
          </p>
          <div className="space-y-0">
            {transferable.map((skill) => (
              <div
                key={skill.name}
                className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 py-4 border-b last:border-b-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <span
                  className="text-sm font-medium flex-shrink-0 sm:w-48"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {skill.name}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Carries over from your current experience and applies directly to{' '}
                  {analysis.targetRole}.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
