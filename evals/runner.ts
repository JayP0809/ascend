/**
 * Ascend AI Evaluation Runner
 *
 * Two evaluation modes:
 *
 * 1. DETERMINISTIC (always run, no API calls):
 *    Tests that the schema validation, scoring logic, and data flow work
 *    correctly using the synthetic fixtures and demo data.
 *
 * 2. LIVE (opt-in via RUN_EVALS=true env var):
 *    Makes real Groq API calls and measures skill-extraction quality,
 *    readiness-score validity, structured-output success rate, and latency.
 *    Requires GROQ_API_KEY to be set.
 *
 * Run deterministic evals: npx tsx evals/runner.ts
 * Run live evals:           RUN_EVALS=true npx tsx evals/runner.ts
 */

import { RESUME_FIXTURES, JOB_FIXTURES } from './fixtures/resumes';
import {
  SkillExtractionSchema,
  RoleRequirementsSchema,
  GapAnalysisSchema,
  PROMPT_VERSION,
} from '../lib/ai-schemas';
import { getDemoData } from '../lib/ai';
import { buildDashboardData } from '../lib/scorer';

const RUN_LIVE = process.env.RUN_EVALS === 'true';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------
interface EvalResult {
  name: string;
  passed: boolean;
  details: string;
  metric?: number;
}

interface EvalReport {
  timestamp: string;
  promptVersion: string;
  mode: 'deterministic' | 'live';
  results: EvalResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  liveMetrics?: {
    avgLatencyMs: number;
    totalTokens: number;
    estimatedCostUsd: number;
    structuredOutputSuccessRate: number;
  };
}

// ---------------------------------------------------------------------------
// Deterministic evaluations
// ---------------------------------------------------------------------------
function evalDemoDataIntegrity(): EvalResult[] {
  const results: EvalResult[] = [];

  for (const jd of JOB_FIXTURES) {
    const demo = getDemoData('eval-demo', jd.targetRole);
    const dashboard = buildDashboardData(demo);

    results.push({
      name: `demo_data_integrity:${jd.id}`,
      passed: dashboard.skillGapItems.length > 0,
      details: `${dashboard.skillGapItems.length} skill gap items generated`,
    });

    results.push({
      name: `demo_readiness_score_range:${jd.id}`,
      passed: demo.gapAnalysis.readiness_score >= 0 && demo.gapAnalysis.readiness_score <= 100,
      details: `readiness_score = ${demo.gapAnalysis.readiness_score}`,
      metric: demo.gapAnalysis.readiness_score,
    });

    results.push({
      name: `demo_roadmap_non_empty:${jd.id}`,
      passed: demo.roadmap.length > 0,
      details: `${demo.roadmap.length} roadmap phases`,
    });

    // Verify market demand is deterministic
    const demand1 = buildDashboardData(demo).marketDemandData;
    const demand2 = buildDashboardData(demo).marketDemandData;
    const deterministic = JSON.stringify(demand1) === JSON.stringify(demand2);
    results.push({
      name: `market_demand_deterministic:${jd.id}`,
      passed: deterministic,
      details: deterministic ? 'outputs match across two calls' : 'MISMATCH — non-deterministic output detected',
    });
  }

  return results;
}

function evalSchemaValidation(): EvalResult[] {
  const results: EvalResult[] = [];

  // Well-formed inputs should pass
  const validSkillExtraction = {
    current_skills: ['Python', 'SQL'],
    experience_years: 3,
    strengths: ['Problem solving'],
    education: "Bachelor's",
    top_titles: ['Engineer'],
  };
  const r1 = SkillExtractionSchema.safeParse(validSkillExtraction);
  results.push({ name: 'schema_skill_extraction_valid', passed: r1.success, details: r1.success ? 'valid' : r1.error.message });

  // Missing required field should fail
  const missingSkills = { experience_years: 2, strengths: ['X'], education: 'BS', top_titles: ['E'] };
  const r2 = SkillExtractionSchema.safeParse(missingSkills);
  results.push({ name: 'schema_skill_extraction_missing_skills', passed: !r2.success, details: !r2.success ? 'correctly rejected' : 'SHOULD HAVE FAILED' });

  // Readiness score out of range
  const badGap = { missing_critical: [], missing_nice: [], transferable: [], readiness_score: 150, strengths_summary: 'X', biggest_gap: 'Y' };
  const r3 = GapAnalysisSchema.safeParse(badGap);
  results.push({ name: 'schema_gap_score_out_of_range', passed: !r3.success, details: !r3.success ? 'correctly rejected score=150' : 'SHOULD HAVE FAILED' });

  // demand_level must be enum
  const badRole = {
    required_skills: ['Python'],
    nice_to_have: [],
    categories: { technical: [], soft: [], tools: [], certifications: [] },
    typical_timeline_months: 6,
    avg_salary: '$100k',
    demand_level: 'Very High',
  };
  const r4 = RoleRequirementsSchema.safeParse(badRole);
  results.push({ name: 'schema_role_demand_level_invalid_enum', passed: !r4.success, details: !r4.success ? 'correctly rejected "Very High"' : 'SHOULD HAVE FAILED' });

  return results;
}

function evalProgressionDeterminism(): EvalResult[] {
  // Tested in scorer.test.ts — just verify the demo data produces stable progression
  const demo = getDemoData();
  const d1 = buildDashboardData(demo).progressionData;
  const d2 = buildDashboardData(demo).progressionData;
  const match = JSON.stringify(d1) === JSON.stringify(d2);
  return [{
    name: 'progression_determinism',
    passed: match,
    details: match ? `${d1.length} data points, identical across runs` : 'MISMATCH',
  }];
}

// ---------------------------------------------------------------------------
// Live evaluations (require GROQ_API_KEY + RUN_EVALS=true)
// ---------------------------------------------------------------------------
async function evalLiveSkillExtraction(): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  // Dynamic import to avoid loading Groq SDK in deterministic mode
  const { runAnalysis } = await import('../lib/ai');

  for (const fixture of RESUME_FIXTURES) {
    const start = Date.now();
    try {
      const analysisResult = await runAnalysis(
        `eval-${fixture.id}`,
        fixture.text,
        JOB_FIXTURES[0].targetRole,
        JOB_FIXTURES[0].description
      );
      const latencyMs = Date.now() - start;

      const extracted = analysisResult.skillExtraction.current_skills.map((s) => s.toLowerCase());

      // Skill recall: how many expected skills were found
      const found = fixture.expectedSkills.filter((s) =>
        extracted.some((e) => e.includes(s.toLowerCase()) || s.toLowerCase().includes(e))
      );
      const recall = found.length / fixture.expectedSkills.length;

      results.push({
        name: `live_skill_recall:${fixture.id}`,
        passed: recall >= 0.6,
        details: `${found.length}/${fixture.expectedSkills.length} expected skills extracted (recall=${(recall * 100).toFixed(0)}%)`,
        metric: recall,
      });

      // Hallucination check: unexpected skills should not appear
      const hallucinated = fixture.unexpectedSkills.filter((s) =>
        extracted.some((e) => e.includes(s.toLowerCase()) || s.toLowerCase().includes(e))
      );
      results.push({
        name: `live_no_hallucination:${fixture.id}`,
        passed: hallucinated.length === 0,
        details: hallucinated.length === 0 ? 'no hallucinated skills' : `hallucinated: ${hallucinated.join(', ')}`,
        metric: hallucinated.length,
      });

      // Experience year range
      const years = analysisResult.skillExtraction.experience_years;
      const inRange = years >= fixture.expectedExperienceRange[0] && years <= fixture.expectedExperienceRange[1];
      results.push({
        name: `live_experience_years:${fixture.id}`,
        passed: inRange,
        details: `extracted=${years}, expected=[${fixture.expectedExperienceRange}]`,
        metric: years,
      });

      // Readiness score sanity
      const score = analysisResult.gapAnalysis.readiness_score;
      results.push({
        name: `live_readiness_score_valid:${fixture.id}`,
        passed: score >= 0 && score <= 100,
        details: `score=${score}`,
        metric: score,
      });

      // Pipeline usage reported
      const hasUsage = !!analysisResult.pipelineUsage;
      results.push({
        name: `live_usage_reported:${fixture.id}`,
        passed: hasUsage,
        details: hasUsage
          ? `tokens=${analysisResult.pipelineUsage!.totals.totalTokens}, latency=${latencyMs}ms, cost=$${analysisResult.pipelineUsage!.totals.estimatedCostUsd.toFixed(6)}`
          : 'no usage data',
      });
    } catch (err) {
      const latencyMs = Date.now() - start;
      results.push({
        name: `live_skill_extraction:${fixture.id}`,
        passed: false,
        details: `FAILED after ${latencyMs}ms: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function run(): Promise<void> {
  console.log('\n========================================');
  console.log('  Ascend AI Evaluation Runner');
  console.log(`  Prompt version: ${PROMPT_VERSION}`);
  console.log(`  Mode: ${RUN_LIVE ? 'LIVE (real API calls)' : 'DETERMINISTIC (no API calls)'}`);
  console.log('========================================\n');

  const allResults: EvalResult[] = [
    ...evalDemoDataIntegrity(),
    ...evalSchemaValidation(),
    ...evalProgressionDeterminism(),
  ];

  if (RUN_LIVE) {
    if (!process.env.GROQ_API_KEY) {
      console.error('ERROR: RUN_EVALS=true but GROQ_API_KEY is not set.');
      process.exit(1);
    }
    console.log('Running live evaluations against Groq API...\n');
    const liveResults = await evalLiveSkillExtraction();
    allResults.push(...liveResults);
  }

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;
  const passRate = allResults.length > 0 ? passed / allResults.length : 0;

  // Print results
  for (const result of allResults) {
    const icon = result.passed ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${result.name}`);
    if (!result.passed || process.env.VERBOSE === 'true') {
      console.log(`       ${result.details}`);
    }
  }

  // Summary
  console.log('\n----------------------------------------');
  console.log(`Results: ${passed}/${allResults.length} passed (${(passRate * 100).toFixed(0)}%)`);

  if (RUN_LIVE) {
    const liveResults = allResults.filter((r) => r.name.startsWith('live_'));
    console.log(`Live evals: ${liveResults.filter((r) => r.passed).length}/${liveResults.length} passed`);
  }

  console.log('----------------------------------------\n');

  const report: EvalReport = {
    timestamp: new Date().toISOString(),
    promptVersion: PROMPT_VERSION,
    mode: RUN_LIVE ? 'live' : 'deterministic',
    results: allResults,
    summary: { total: allResults.length, passed, failed, passRate },
  };

  // Write report to file
  const reportPath = `evals/reports/eval-${Date.now()}.json`;
  try {
    const { writeFileSync, mkdirSync } = await import('fs');
    mkdirSync('evals/reports', { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${reportPath}`);
  } catch {
    // Non-fatal
  }

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Eval runner error:', err);
  process.exit(1);
});
