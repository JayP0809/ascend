// Shared constants referenced by both the landing page and tests.

// Stable demo analysis ID: matches the demo-* branch in POST /api/analyze.
// The API schema regex is: /^demo-[a-z0-9-]+$/i
export const DEMO_ANALYSIS_ID = 'demo-sample-001';

// Regex from analyzeBodySchema in app/api/analyze/route.ts.
// Tests use this to verify DEMO_ANALYSIS_ID stays compatible with the API.
export const DEMO_ID_REGEX = /^demo-[a-z0-9-]+$/i;
