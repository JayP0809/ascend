import {
  AnalysisResult,
  SkillExtraction,
  RoleRequirements,
  GapAnalysis,
  RoadmapWeek,
} from './types';
import {
  PROMPT_VERSION,
  SkillExtractionSchema,
  RoleRequirementsSchema,
  GapAnalysisSchema,
  RoadmapResponseSchema,
} from './ai-schemas';
import { z } from 'zod';

const DEMO_ANALYSIS_ID = 'demo-analysis-001';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export function isLiveMode(): boolean {
  const key = process.env.GROQ_API_KEY;
  return !!key && key !== 'your-groq-key-here' && key.length > 10;
}

// ---------------------------------------------------------------------------
// Usage tracking
// ---------------------------------------------------------------------------
export interface GroqUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  // Groq pricing as of late 2025 for openai/gpt-oss-20b (free tier — $0)
  // Update if model changes. These are fallback estimates for other models.
  estimatedCostUsd: number;
}

// Cost per 1M tokens (input / output). Update when models change.
const MODEL_COSTS: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'openai/gpt-oss-20b': { inputPer1M: 0, outputPer1M: 0 }, // free on Groq
  'llama-3.1-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },
  'llama-3.3-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model];
  if (!costs) return 0;
  return (promptTokens * costs.inputPer1M + completionTokens * costs.outputPer1M) / 1_000_000;
}

// ---------------------------------------------------------------------------
// Core Groq call with timeout and usage reporting
// ---------------------------------------------------------------------------
interface GroqResult {
  content: string;
  usage: GroqUsage;
}

async function callGroqWithUsage(prompt: string): Promise<GroqResult> {
  const Groq = (await import('groq-sdk')).default;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const start = Date.now();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Groq request timed out after ${REQUEST_TIMEOUT_MS}ms`)), REQUEST_TIMEOUT_MS)
  );

  const completion = await Promise.race([
    client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    }),
    timeoutPromise,
  ]);

  const latencyMs = Date.now() - start;
  const promptTokens = completion.usage?.prompt_tokens ?? 0;
  const completionTokens = completion.usage?.completion_tokens ?? 0;

  return {
    content: completion.choices[0]?.message?.content ?? '',
    usage: {
      model: MODEL,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      estimatedCostUsd: estimateCost(MODEL, promptTokens, completionTokens),
    },
  };
}

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------
function extractJson(raw: string): string {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

// ---------------------------------------------------------------------------
// Validated call with retry
// Retries up to MAX_RETRIES times on parse or validation failure.
// Returns parsed data + aggregated usage across all attempts.
// ---------------------------------------------------------------------------
async function callAndValidate<T>(
  prompt: string,
  schema: z.ZodType<T>,
  stepName: string
): Promise<{ data: T; usages: GroqUsage[] }> {
  const usages: GroqUsage[] = [];
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const { content, usage } = await callGroqWithUsage(prompt);
    usages.push(usage);

    const jsonStr = extractJson(content);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      lastError = new Error(`${stepName}: JSON parse failed on attempt ${attempt}: ${e}`);
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      return { data: result.data, usages };
    }

    lastError = new Error(
      `${stepName}: schema validation failed on attempt ${attempt}: ${result.error.issues.map((i) => i.message).join('; ')}`
    );
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Aggregate usage from all pipeline steps
// ---------------------------------------------------------------------------
export interface PipelineUsage {
  promptVersion: string;
  steps: { name: string; usage: GroqUsage }[];
  totals: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    estimatedCostUsd: number;
  };
}

function aggregateUsage(steps: { name: string; usages: GroqUsage[] }[]): PipelineUsage {
  const flat = steps.flatMap((s) => s.usages.map((u) => ({ name: s.name, usage: u })));
  const totals = flat.reduce(
    (acc, { usage }) => ({
      promptTokens: acc.promptTokens + usage.promptTokens,
      completionTokens: acc.completionTokens + usage.completionTokens,
      totalTokens: acc.totalTokens + usage.totalTokens,
      latencyMs: acc.latencyMs + usage.latencyMs,
      estimatedCostUsd: acc.estimatedCostUsd + usage.estimatedCostUsd,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: 0, estimatedCostUsd: 0 }
  );
  return { promptVersion: PROMPT_VERSION, steps: flat, totals };
}

// ---------------------------------------------------------------------------
// Prompts (versioned via PROMPT_VERSION in ai-schemas.ts)
// ---------------------------------------------------------------------------
function skillExtractionPrompt(resumeText: string): string {
  return `Analyze this resume and extract information. Respond ONLY with valid JSON. No markdown, no explanation, no backticks.

Resume:
${resumeText}

Return this exact JSON structure:
{
  "current_skills": ["skill1", "skill2"],
  "experience_years": 3,
  "strengths": ["strength1", "strength2"],
  "education": "Bachelor's in Computer Science",
  "top_titles": ["Software Engineer", "Developer"]
}`;
}

function roleRequirementsPrompt(targetRole: string, jobDescription?: string): string {
  return `What are the requirements for a ${targetRole} role?${jobDescription ? ` Job description: ${jobDescription}` : ''}
Respond ONLY with valid JSON. No markdown, no explanation, no backticks.

{
  "required_skills": ["skill1", "skill2"],
  "nice_to_have": ["skill3"],
  "categories": {
    "technical": ["Python", "SQL"],
    "soft": ["Communication", "Leadership"],
    "tools": ["Docker", "Kubernetes"],
    "certifications": ["AWS Certified"]
  },
  "typical_timeline_months": 6,
  "avg_salary": "$120,000",
  "demand_level": "High"
}`;
}

function gapAnalysisPrompt(currentSkills: string[], roleRequirements: RoleRequirements): string {
  return `Perform a skill gap analysis. Respond ONLY with valid JSON. No markdown, no explanation, no backticks.

Current skills: ${JSON.stringify(currentSkills)}
Required skills: ${JSON.stringify(roleRequirements.required_skills)}
Nice to have: ${JSON.stringify(roleRequirements.nice_to_have)}

{
  "missing_critical": ["skill1", "skill2"],
  "missing_nice": ["skill3"],
  "transferable": ["skill4"],
  "readiness_score": 67,
  "strengths_summary": "Strong background in...",
  "biggest_gap": "Docker and Kubernetes experience"
}`;
}

function roadmapPrompt(gapAnalysis: GapAnalysis, targetRole: string): string {
  return `Create a week-by-week learning roadmap to become a ${targetRole}.
Critical gaps to address: ${JSON.stringify(gapAnalysis.missing_critical)}
Respond ONLY with valid JSON. No markdown, no explanation, no backticks.

{
  "weeks": [
    {
      "week_start": 1,
      "week_end": 2,
      "focus_area": "Foundation",
      "topics": ["Topic 1", "Topic 2"],
      "resources": [
        {"title": "Resource Title", "url": "https://example.com", "type": "Video"}
      ],
      "project": {
        "title": "Project Name",
        "description": "Build a...",
        "tech": ["Python", "Docker"],
        "hours": 10
      },
      "milestone": "You will be able to..."
    }
  ]
}

Create 8 phases covering all critical gaps. Use real resource URLs from YouTube, official docs, or Coursera.`;
}

// ---------------------------------------------------------------------------
// Pipeline functions
// ---------------------------------------------------------------------------
async function extractSkills(resumeText: string): Promise<{ data: SkillExtraction; usages: GroqUsage[] }> {
  return callAndValidate(skillExtractionPrompt(resumeText), SkillExtractionSchema, 'extractSkills');
}

async function getRoleRequirements(
  targetRole: string,
  jobDescription?: string
): Promise<{ data: RoleRequirements; usages: GroqUsage[] }> {
  return callAndValidate(
    roleRequirementsPrompt(targetRole, jobDescription),
    RoleRequirementsSchema,
    'getRoleRequirements'
  );
}

async function analyzeGap(
  currentSkills: string[],
  roleRequirements: RoleRequirements
): Promise<{ data: GapAnalysis; usages: GroqUsage[] }> {
  return callAndValidate(
    gapAnalysisPrompt(currentSkills, roleRequirements),
    GapAnalysisSchema,
    'analyzeGap'
  );
}

async function generateRoadmap(
  gapAnalysis: GapAnalysis,
  targetRole: string
): Promise<{ data: RoadmapWeek[]; usages: GroqUsage[] }> {
  const { data, usages } = await callAndValidate(
    roadmapPrompt(gapAnalysis, targetRole),
    RoadmapResponseSchema,
    'generateRoadmap'
  );
  return { data: data.weeks, usages };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export interface RunAnalysisResult extends AnalysisResult {
  pipelineUsage?: PipelineUsage;
}

export async function runAnalysis(
  analysisId: string,
  resumeText: string,
  targetRole: string,
  jobDescription?: string
): Promise<RunAnalysisResult> {
  if (!isLiveMode()) {
    return getDemoData(analysisId, targetRole);
  }

  const [skillResult, roleResult] = await Promise.all([
    extractSkills(resumeText),
    getRoleRequirements(targetRole, jobDescription),
  ]);

  const gapResult = await analyzeGap(skillResult.data.current_skills, roleResult.data);
  const roadmapResult = await generateRoadmap(gapResult.data, targetRole);

  const pipelineUsage = aggregateUsage([
    { name: 'extractSkills', usages: skillResult.usages },
    { name: 'getRoleRequirements', usages: roleResult.usages },
    { name: 'analyzeGap', usages: gapResult.usages },
    { name: 'generateRoadmap', usages: roadmapResult.usages },
  ]);

  return {
    analysisId,
    targetRole,
    skillExtraction: skillResult.data,
    roleRequirements: roleResult.data,
    gapAnalysis: gapResult.data,
    roadmap: roadmapResult.data,
    isDemoMode: false,
    createdAt: new Date().toISOString(),
    pipelineUsage,
  };
}

export function getDemoData(analysisId: string = DEMO_ANALYSIS_ID, targetRole = 'DevOps Engineer'): AnalysisResult {
  return {
    analysisId,
    targetRole,
    isDemoMode: true,
    createdAt: new Date().toISOString(),
    skillExtraction: {
      current_skills: [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL',
        'Git', 'REST APIs', 'HTML/CSS', 'PostgreSQL', 'Jest', 'Agile',
        'Problem Solving', 'Communication', 'Team Collaboration',
      ],
      experience_years: 3,
      strengths: [
        'Strong programming fundamentals in multiple languages',
        'Experience with modern web development frameworks',
        'Solid understanding of databases and REST APIs',
      ],
      education: "Bachelor's in Computer Science",
      top_titles: ['Software Engineer', 'Full Stack Developer', 'Web Developer'],
    },
    roleRequirements: {
      required_skills: [
        'Docker', 'Kubernetes', 'CI/CD Pipelines', 'Linux Administration',
        'Terraform', 'AWS/GCP/Azure', 'Ansible', 'Prometheus', 'Grafana',
        'Shell Scripting', 'Nginx', 'Jenkins', 'Git', 'Python', 'Networking',
        'Security Best Practices', 'Incident Response', 'Monitoring',
      ],
      nice_to_have: ['Helm', 'ArgoCD', 'Vault', 'ELK Stack', 'Istio'],
      categories: {
        technical: ['Docker', 'Kubernetes', 'Terraform', 'Linux', 'Networking', 'Security'],
        soft: ['Incident Response', 'Communication', 'Problem Solving', 'Documentation'],
        tools: ['Jenkins', 'Prometheus', 'Grafana', 'Ansible', 'Nginx'],
        certifications: ['AWS Certified DevOps Engineer', 'CKA - Certified Kubernetes Administrator'],
      },
      typical_timeline_months: 6,
      avg_salary: '$135,000',
      demand_level: 'High',
    },
    gapAnalysis: {
      missing_critical: [
        'Docker', 'Kubernetes', 'Terraform', 'Linux Administration',
        'CI/CD Pipelines', 'AWS/GCP/Azure', 'Ansible', 'Prometheus',
        'Grafana', 'Shell Scripting', 'Nginx', 'Networking Fundamentals',
      ],
      missing_nice: ['Helm', 'ArgoCD', 'Vault', 'ELK Stack'],
      transferable: ['Python', 'Git', 'Problem Solving', 'Agile', 'REST APIs', 'SQL'],
      readiness_score: 67,
      strengths_summary:
        'Your programming background in Python, JavaScript, and SQL translates directly to scripting and automation tasks. Git proficiency and Agile experience are core DevOps skills you already have.',
      biggest_gap: 'Container orchestration with Docker and Kubernetes, the backbone of modern DevOps workflows.',
    },
    roadmap: [
      {
        week_start: 1, week_end: 2, focus_area: 'Linux & Shell Scripting Fundamentals',
        topics: ['Linux file system and permissions', 'Bash scripting: variables, loops, functions', 'Process management and systemd', 'Networking basics: TCP/IP, DNS, ports', 'SSH and remote access'],
        resources: [
          { title: 'Linux Command Line for Beginners', url: 'https://ubuntu.com/tutorials/command-line-for-beginners', type: 'Docs' },
          { title: 'Bash Scripting Full Course (FreeCodeCamp)', url: 'https://www.youtube.com/watch?v=e7BufAVwDiM', type: 'Video' },
        ],
        project: { title: 'System Health Monitor Script', description: 'Write a Bash script that monitors CPU, memory, disk usage, and running processes.', tech: ['Bash', 'Linux', 'Cron'], hours: 12 },
        milestone: 'Comfortable navigating Linux CLI, writing automation scripts, and understanding system processes.',
      },
      {
        week_start: 3, week_end: 4, focus_area: 'Docker & Containerization',
        topics: ['Container concepts vs virtual machines', 'Docker architecture: daemon, images, containers', 'Writing Dockerfiles and best practices', 'Docker Compose for multi-container apps', 'Container networking and volumes'],
        resources: [
          { title: 'Docker Official Getting Started Guide', url: 'https://docs.docker.com/get-started/', type: 'Docs' },
          { title: 'Docker Tutorial for Beginners (TechWorld)', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', type: 'Video' },
        ],
        project: { title: 'Dockerize Your Node.js App', description: 'Containerize a Node.js REST API with PostgreSQL using Docker Compose.', tech: ['Docker', 'Docker Compose', 'Node.js', 'PostgreSQL'], hours: 15 },
        milestone: 'Can containerize any application and run complex multi-service environments locally with Docker Compose.',
      },
      {
        week_start: 5, week_end: 6, focus_area: 'CI/CD Pipelines with GitHub Actions',
        topics: ['CI/CD concepts and pipeline stages', 'GitHub Actions: workflows, jobs, steps', 'Automated testing in pipelines', 'Building and pushing Docker images', 'Deployment strategies'],
        resources: [
          { title: 'GitHub Actions Documentation', url: 'https://docs.github.com/en/actions', type: 'Docs' },
          { title: 'GitHub Actions Full Course (Fireship)', url: 'https://www.youtube.com/watch?v=R8_veQiYBjI', type: 'Video' },
        ],
        project: { title: 'Full CI/CD Pipeline', description: 'Build a complete pipeline: code push to lint to test to Docker build to push to registry to deploy.', tech: ['GitHub Actions', 'Docker', 'Jest', 'YAML'], hours: 14 },
        milestone: 'Every commit triggers automated tests and deployment. Can design CI/CD pipelines for any project.',
      },
      {
        week_start: 7, week_end: 8, focus_area: 'Kubernetes Fundamentals',
        topics: ['Kubernetes architecture: control plane, nodes, pods', 'Deployments, ReplicaSets, and Services', 'ConfigMaps, Secrets, and Volumes', 'Ingress controllers and networking', 'kubectl CLI mastery'],
        resources: [
          { title: 'Kubernetes Official Docs', url: 'https://kubernetes.io/docs/home/', type: 'Docs' },
          { title: 'Kubernetes Full Course (TechWorld with Nana)', url: 'https://www.youtube.com/watch?v=X48VuDVv0do', type: 'Video' },
        ],
        project: { title: 'Deploy App to Kubernetes Cluster', description: 'Deploy your Dockerized app to a local Minikube cluster with autoscaling.', tech: ['Kubernetes', 'Minikube', 'kubectl', 'YAML'], hours: 18 },
        milestone: 'Can deploy and manage containerized applications on Kubernetes with proper scaling and health checks.',
      },
      {
        week_start: 9, week_end: 10, focus_area: 'Cloud Infrastructure with AWS',
        topics: ['AWS core services: EC2, S3, RDS, VPC', 'IAM: users, roles, policies', 'EKS (Elastic Kubernetes Service)', 'Load balancers and auto-scaling groups', 'AWS CLI and SDK'],
        resources: [
          { title: 'AWS Free Tier Account Setup', url: 'https://aws.amazon.com/free/', type: 'Docs' },
          { title: 'AWS Tutorial For Beginners (Simplilearn)', url: 'https://www.youtube.com/watch?v=IT1X42D1KeA', type: 'Video' },
        ],
        project: { title: 'Deploy to AWS EKS', description: 'Migrate your Kubernetes app to AWS. Set up EKS cluster, configure ALB ingress, connect RDS.', tech: ['AWS', 'EKS', 'EC2', 'RDS', 'CloudWatch'], hours: 20 },
        milestone: 'Can architect and deploy production-ready applications on AWS with proper security and scalability.',
      },
      {
        week_start: 11, week_end: 12, focus_area: 'Infrastructure as Code with Terraform',
        topics: ['IaC concepts and benefits', 'Terraform syntax: providers, resources, variables', 'State management and remote backends', 'Terraform modules and reusability', 'Plan, apply, destroy workflow'],
        resources: [
          { title: 'Terraform Official Documentation', url: 'https://developer.hashicorp.com/terraform/docs', type: 'Docs' },
          { title: 'Terraform Course for Beginners (freeCodeCamp)', url: 'https://www.youtube.com/watch?v=SLB_c_ayRMo', type: 'Video' },
        ],
        project: { title: 'Infrastructure as Code for AWS', description: 'Write Terraform code to provision your entire AWS infrastructure: VPC, EKS, RDS, S3, IAM.', tech: ['Terraform', 'AWS', 'HCL'], hours: 16 },
        milestone: 'Can define, version, and reproduce cloud infrastructure programmatically.',
      },
      {
        week_start: 13, week_end: 14, focus_area: 'Monitoring & Observability',
        topics: ['Observability: logs, metrics, traces', 'Prometheus architecture and configuration', 'PromQL query language', 'Grafana dashboards and alerting', 'Incident response runbooks'],
        resources: [
          { title: 'Prometheus Official Docs', url: 'https://prometheus.io/docs/introduction/overview/', type: 'Docs' },
          { title: 'Grafana + Prometheus Tutorial (TechWorld)', url: 'https://www.youtube.com/watch?v=QoDqxm7ybLc', type: 'Video' },
        ],
        project: { title: 'Full Observability Stack', description: 'Set up Prometheus + Grafana on your Kubernetes cluster with alerting.', tech: ['Prometheus', 'Grafana', 'Kubernetes', 'AlertManager'], hours: 14 },
        milestone: 'Can monitor any system proactively, create meaningful dashboards, and respond to incidents with data.',
      },
      {
        week_start: 15, week_end: 16, focus_area: 'DevOps Capstone & Job Prep',
        topics: ['Configuration management with Ansible', 'Security scanning in CI/CD', 'DevOps interview preparation', 'Portfolio documentation and case studies', 'CKA exam preparation strategy'],
        resources: [
          { title: 'Ansible for DevOps (Book)', url: 'https://www.ansiblefordevops.com/', type: 'Book' },
          { title: 'DevOps Interview Questions Guide', url: 'https://github.com/bregman-arie/devops-exercises', type: 'Docs' },
        ],
        project: { title: 'End-to-End DevOps Portfolio Project', description: 'Build a complete microservices application with full DevOps pipeline, monitoring, and auto-scaling.', tech: ['Everything learned', 'Microservices', 'ArgoCD', 'Helm'], hours: 25 },
        milestone: 'Portfolio-ready DevOps engineer. Can confidently interview for mid-level DevOps roles.',
      },
    ],
  };
}
