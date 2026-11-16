'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Role } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface RoleSearchProps {
  analysisId: string;
  onAnalysisStart: () => void;
  onAnalysisComplete: (data: { analysisId: string }) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function RoleSearch({ analysisId, onAnalysisStart: _onAnalysisStart, onAnalysisComplete }: RoleSearchProps) {
  const [query, setQuery] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showJD, setShowJD] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/roles?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d) => setRoles(d.roles || []))
      .catch(() => {});
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAnalyze = async () => {
    if (!selectedRole) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, targetRole: selectedRole.title, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      onAnalysisComplete({ analysisId: data.analysisId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setLoading(false);
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setQuery(role.title);
    setShowDropdown(false);
  };

  const handleSelectCustom = () => {
    const title = query.trim();
    if (!title) return;
    const customRole: Role = {
      id: 'custom',
      title,
      industry: 'Other',
      demandLevel: 'Medium',
      avgSalary: '',
      icon: 'Target',
      requiredSkillCount: 0,
    };
    setSelectedRole(customRole);
    setShowDropdown(false);
  };

  const showCustomOption =
    query.trim().length > 0 &&
    !roles.some((r) => r.title.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="space-y-4">
      <div ref={dropdownRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Search career roles across 20+ industries..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); if (selectedRole) setSelectedRole(null); }}
            onFocus={() => setShowDropdown(true)}
            className="pl-9"
          />
        </div>

        {showDropdown && (roles.length > 0 || showCustomOption) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-72 overflow-y-auto">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className="w-full flex items-center px-4 py-3 hover:bg-background text-left transition-colors border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{role.title}</p>
                  <p className="text-xs text-muted">
                    {role.industry}{role.avgSalary ? ` · ${role.avgSalary} avg` : ''}
                  </p>
                </div>
              </button>
            ))}
            {showCustomOption && (
              <button
                onClick={handleSelectCustom}
                className="w-full flex items-center px-4 py-3 hover:bg-background text-left transition-colors border-t border-border"
              >
                <div>
                  <p className="text-sm font-medium text-primary">Use &ldquo;{query.trim()}&rdquo;</p>
                  <p className="text-xs text-muted">Custom career target</p>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {selectedRole && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border" style={{ background: 'var(--bg-secondary)' }}>
          <span className="text-sm font-medium text-primary">{selectedRole.title}</span>
          <span className="text-xs text-muted">· {selectedRole.industry}</span>
          {selectedRole.avgSalary && (
            <span className="text-xs text-muted ml-auto">{selectedRole.avgSalary}</span>
          )}
        </div>
      )}

      <button
        onClick={() => setShowJD(!showJD)}
        className="flex items-center gap-2 text-xs text-muted hover:text-secondary transition-colors"
      >
        {showJD ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Paste a job description (optional, improves accuracy)
      </button>

      {showJD && (
        <Textarea
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="min-h-[100px] text-xs"
        />
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <Button
        onClick={handleAnalyze}
        disabled={!selectedRole || loading}
        loading={loading}
        className="w-full"
        size="lg"
      >
        {loading ? 'Analyzing...' : 'Analyze my career path →'}
      </Button>
    </div>
  );
}
