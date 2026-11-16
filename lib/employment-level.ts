import { EmploymentContext, EmploymentLevel } from './types';

// Role-title keywords that strongly signal an internship or co-op.
const INTERN_TITLE_RE = /\bintern(?:ship)?\b|\bco-?op\b|\bcooperative education\b|\bsummer analyst\b|\bsummer associate\b|\bspring analyst\b|\bfall analyst\b/i;

// Signals in JD body indicating the writer will *supervise* interns,
// not that the reader IS an intern.  Guards against false positives like
// "Senior Engineer: will mentor interns on the team."
const MENTORING_INTERN_RE = /\b(?:mentor(?:ing)?|supervise?|supervising|manage[sd]?|managing|guide[sd]?|guiding|coach(?:ing)?)\s+interns?\b/i;

// Explicit seniority signals that override intern detection in body text.
const SENIOR_RE = /\b(?:senior|sr\.?|lead|principal|staff|director|manager|head of|vp|vice president)\s+\w|\b(?:3|4|5|6|7|8|9|10|\d{2})\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience\b/i;

// Entry-level / new-grad signals.
const ENTRY_LEVEL_RE = /\bnew\s*grad(?:uate)?\b|\buniversity\s+graduate\b|\brecent\s+grad(?:uate)?\b|\bentry[- ]?level\b|\b0[- ]?2\s+years?\b|\bcollege\s+(?:graduate|grad|senior)\b|\bgraduate\s+hire\b/i;

// Academic / student context signals that increase confidence for internship.
const STUDENT_SIGNALS_RE = /\bcurrently\s+enrolled\b|\bundergraduate\s+student\b|\bpursuing\s+a\s+(?:bachelor|master|b\.?s\.?|m\.?s\.?)\b|\bexpected\s+graduation\b|\b(?:3|6|8|10|12)[- ]?week\s+(?:program|internship|position)\b/i;

function classifyFromTitle(title: string): EmploymentContext {
  const signals: string[] = [];

  if (INTERN_TITLE_RE.test(title)) {
    if (/\bco-?op\b|\bcooperative\b/i.test(title)) {
      signals.push('"co-op" in role title');
      return { level: 'coop', confidence: 'high', inferredFrom: 'role_title', signals };
    }
    signals.push('internship keyword in role title');
    return { level: 'internship', confidence: 'high', inferredFrom: 'role_title', signals };
  }

  if (ENTRY_LEVEL_RE.test(title)) {
    signals.push('entry-level keyword in role title');
    return { level: 'entry-level', confidence: 'medium', inferredFrom: 'role_title', signals };
  }

  signals.push('no entry-level signals in role title');
  return { level: 'experienced', confidence: 'low', inferredFrom: 'default', signals };
}

export function classifyEmploymentLevel(
  targetRole: string,
  jobDescription?: string
): EmploymentContext {
  if (!jobDescription || jobDescription.trim().length < 20) {
    return classifyFromTitle(targetRole);
  }

  const signals: string[] = [];

  // Seniority in JD overrides intern detection in the body (but not the title).
  const hasSeniorSignal = SENIOR_RE.test(jobDescription);

  // Role title is highest-weight signal: not affected by senior override.
  if (INTERN_TITLE_RE.test(targetRole)) {
    if (/\bco-?op\b|\bcooperative\b/i.test(targetRole)) {
      signals.push('"co-op" in role title');
      return { level: 'coop', confidence: 'high', inferredFrom: 'role_title', signals };
    }
    signals.push('internship keyword in role title');
    return { level: 'internship', confidence: 'high', inferredFrom: 'role_title', signals };
  }

  // JD header (first 300 chars) is next-highest weight, before full-body scan.
  const jdHeader = jobDescription.slice(0, 300);

  if (/\bco-?op\b|\bcooperative education\b/i.test(jdHeader) && !hasSeniorSignal) {
    signals.push('co-op keyword in job description header');
    return { level: 'coop', confidence: 'high', inferredFrom: 'job_description', signals };
  }

  if (INTERN_TITLE_RE.test(jdHeader) && !hasSeniorSignal) {
    signals.push('internship keyword in job description header');
    return { level: 'internship', confidence: 'high', inferredFrom: 'job_description', signals };
  }

  // Full JD body: guard against "mentors interns" false positives.
  const isMentoringContext = MENTORING_INTERN_RE.test(jobDescription);
  const internInBody = INTERN_TITLE_RE.test(jobDescription);

  if (internInBody && !isMentoringContext && !hasSeniorSignal) {
    if (STUDENT_SIGNALS_RE.test(jobDescription)) {
      signals.push('internship language and student signals in job description');
      return { level: 'internship', confidence: 'high', inferredFrom: 'job_description', signals };
    }
    signals.push('internship language in job description body');
    return { level: 'internship', confidence: 'medium', inferredFrom: 'job_description', signals };
  }

  // Entry-level detection (role title or JD body).
  if ((ENTRY_LEVEL_RE.test(targetRole) || ENTRY_LEVEL_RE.test(jobDescription)) && !hasSeniorSignal) {
    signals.push('entry-level signals detected');
    return { level: 'entry-level', confidence: 'medium', inferredFrom: 'job_description', signals };
  }

  signals.push('no entry-level or internship signals found');
  return { level: 'experienced', confidence: 'medium', inferredFrom: 'job_description', signals };
}

export function employmentLevelLabel(level: EmploymentLevel): string {
  switch (level) {
    case 'internship':  return 'Internship';
    case 'coop':        return 'Co-op';
    case 'entry-level': return 'Entry-Level';
    case 'experienced': return 'Professional';
  }
}
