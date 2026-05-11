import { AnalysisResult, SkillExtraction, RoleRequirements, GapAnalysis, RoadmapWeek } from './types';

const DEMO_ANALYSIS_ID = 'demo-analysis-001';

export function isLiveMode(): boolean {
  const key = process.env.GROQ_API_KEY;
  return !!key && key !== 'your-groq-key-here' && key.length > 10;
}

async function callGroq(prompt: string): Promise<string> {
  const Groq = (await import('groq-sdk')).default;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 4096,
  });

  return completion.choices[0]?.message?.content ?? '';
}

async function parseJson<T>(raw: string): Promise<T> {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('Failed to parse AI response as JSON');
  }
}

async function extractSkills(resumeText: string): Promise<SkillExtraction> {
  const prompt = `Analyze this resume and extract information. Respond ONLY with valid JSON. No markdown, no explanation, no backticks.

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

  const raw = await callGroq(prompt);
  try {
    return await parseJson<SkillExtraction>(raw);
  } catch {
    const retried = await callGroq(prompt);
    return parseJson<SkillExtraction>(retried);
  }
}

async function getRoleRequirements(targetRole: string, jobDescription?: string): Promise<RoleRequirements> {
  const prompt = `What are the requirements for a ${targetRole} role? ${jobDescription ? `Job description: ${jobDescription}` : ''}
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

  const raw = await callGroq(prompt);
  try {
    return await parseJson<RoleRequirements>(raw);
  } catch {
    const retried = await callGroq(prompt);
    return parseJson<RoleRequirements>(retried);
  }
}

async function analyzeGap(
  currentSkills: string[],
  roleRequirements: RoleRequirements
): Promise<GapAnalysis> {
  const prompt = `Perform a skill gap analysis. Respond ONLY with valid JSON. No markdown, no explanation, no backticks.

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

  const raw = await callGroq(prompt);
  try {
    return await parseJson<GapAnalysis>(raw);
  } catch {
    const retried = await callGroq(prompt);
    return parseJson<GapAnalysis>(retried);
  }
}

async function generateRoadmap(
  gapAnalysis: GapAnalysis,
  targetRole: string
): Promise<RoadmapWeek[]> {
  const prompt = `Create a week-by-week learning roadmap to become a ${targetRole}.
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

  const raw = await callGroq(prompt);
  try {
    const result = await parseJson<{ weeks: RoadmapWeek[] }>(raw);
    return result.weeks;
  } catch {
    const retried = await callGroq(prompt);
    const result = await parseJson<{ weeks: RoadmapWeek[] }>(retried);
    return result.weeks;
  }
}

export async function runAnalysis(
  analysisId: string,
  resumeText: string,
  targetRole: string,
  jobDescription?: string
): Promise<AnalysisResult> {
  if (!isLiveMode()) {
    return getDemoData(analysisId, targetRole);
  }

  const [skillExtraction, roleRequirements] = await Promise.all([
    extractSkills(resumeText),
    getRoleRequirements(targetRole, jobDescription),
  ]);

  const gapAnalysis = await analyzeGap(skillExtraction.current_skills, roleRequirements);
  const roadmap = await generateRoadmap(gapAnalysis, targetRole);

  return {
    analysisId,
    targetRole,
    skillExtraction,
    roleRequirements,
    gapAnalysis,
    roadmap,
    isDemoMode: false,
    createdAt: new Date().toISOString(),
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
      biggest_gap: 'Container orchestration with Docker and Kubernetes — the backbone of modern DevOps workflows.',
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
        project: { title: 'Full CI/CD Pipeline', description: 'Build a complete pipeline: code push → lint → test → Docker build → push to registry → deploy.', tech: ['GitHub Actions', 'Docker', 'Jest', 'YAML'], hours: 14 },
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
