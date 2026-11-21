/**
 * Deterministic sample analysis system.
 *
 * Rules:
 * - Zero Groq calls; zero quota consumption; zero DB persistence.
 * - One consistent fictional candidate across all sample analyses.
 * - 6 curated high-quality fixtures + metadata-driven generation for other supported roles.
 * - For unrecognized roles: return null so the caller can surface a clear message.
 */

import { AnalysisResult, GapAnalysis, RoleRequirements, RoadmapWeek } from './types';
import { searchRoles } from './roles';

// ---------------------------------------------------------------------------
// Fictional candidate: constant across all sample analyses
// ---------------------------------------------------------------------------
const FICTIONAL_CANDIDATE = {
  current_skills: [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL',
    'Git', 'REST APIs', 'HTML/CSS', 'PostgreSQL', 'Jest', 'Agile',
    'Problem Solving', 'Communication', 'Team Collaboration',
  ],
  experience_years: 3,
  education: "Bachelor's in Computer Science",
  top_titles: ['Software Engineer', 'Full Stack Developer', 'Web Developer'],
  strengths: [
    'Strong programming fundamentals in multiple languages',
    'Experience with modern web development frameworks',
    'Solid understanding of databases and REST APIs',
  ],
};

// ---------------------------------------------------------------------------
// Utility: compute gap analysis from candidate skills vs role requirements
// ---------------------------------------------------------------------------
function computeGap(
  required: string[],
  niceToHave: string[],
  baseScore?: number
): Pick<GapAnalysis, 'missing_critical' | 'missing_nice' | 'transferable' | 'readiness_score'> {
  const have = new Set(FICTIONAL_CANDIDATE.current_skills.map((s) => s.toLowerCase()));
  const missing_critical = required.filter((s) => !have.has(s.toLowerCase()));
  const missing_nice = niceToHave.filter((s) => !have.has(s.toLowerCase()));
  const transferable = FICTIONAL_CANDIDATE.current_skills.filter((s) =>
    required.some((r) => r.toLowerCase() === s.toLowerCase())
  );
  const matched = required.length - missing_critical.length;
  const score = baseScore ?? Math.round(Math.min(90, Math.max(20, (matched / required.length) * 100)));
  return { missing_critical, missing_nice, transferable, readiness_score: score };
}

// ---------------------------------------------------------------------------
// Role metadata for metadata-driven sample generation
// ---------------------------------------------------------------------------
interface RoleMetadata {
  required_skills: string[];
  nice_to_have: string[];
  categories: RoleRequirements['categories'];
  typical_timeline_months: number;
  avg_salary: string;
  strengths_summary: string;
  biggest_gap: string;
  roadmap_phases: Array<{ focus_area: string; topics: string[]; project_title: string; project_description: string; tech: string[] }>;
}

const ROLE_METADATA: Record<string, RoleMetadata> = {
  'frontend-developer': {
    required_skills: ['React', 'TypeScript', 'HTML/CSS', 'JavaScript', 'State Management', 'Webpack/Vite', 'CSS-in-JS', 'Web Performance', 'Accessibility (a11y)', 'Testing (Jest/Vitest)', 'REST APIs', 'Git'],
    nice_to_have: ['Next.js', 'GraphQL', 'Storybook', 'Cypress', 'WebSockets'],
    categories: {
      technical: ['React', 'TypeScript', 'HTML/CSS', 'State Management', 'Web Performance'],
      soft: ['Communication', 'Attention to Detail', 'Collaboration'],
      tools: ['Webpack/Vite', 'Git', 'Storybook', 'Cypress'],
      certifications: [],
    },
    typical_timeline_months: 3,
    avg_salary: '$110,000',
    strengths_summary: 'Your React, TypeScript, and JavaScript background puts you in a strong position. HTML/CSS expertise and REST API experience transfer directly.',
    biggest_gap: 'Deeper front-end performance optimization and accessibility (a11y) practices.',
    roadmap_phases: [
      { focus_area: 'Advanced React Patterns', topics: ['React hooks deep dive', 'Context API vs Zustand/Redux', 'Server components (React 18)', 'Performance with memo/useMemo'], project_title: 'State Management Refactor', project_description: 'Refactor a medium-sized React app to use Zustand for global state and measure bundle size reduction.', tech: ['React', 'Zustand', 'TypeScript'] },
      { focus_area: 'Web Performance & Tooling', topics: ['Webpack/Vite configuration', 'Code splitting and lazy loading', 'Core Web Vitals optimization', 'Bundle analysis'], project_title: 'Performance Audit Tool', project_description: 'Build a Lighthouse-integrated CI check that fails builds with CWV regressions.', tech: ['Vite', 'Lighthouse', 'GitHub Actions'] },
      { focus_area: 'Accessibility & Testing', topics: ['WCAG 2.1 AA guidelines', 'ARIA roles and semantic HTML', 'Jest + React Testing Library', 'Cypress E2E testing'], project_title: 'Accessible Component Library', project_description: 'Build a small accessible component library with 100% WCAG AA compliance and full test coverage.', tech: ['React', 'Jest', 'Cypress', 'Storybook'] },
      { focus_area: 'Portfolio & Interview Prep', topics: ['System design for front-end', 'JavaScript internals (event loop, closures)', 'CSS architecture patterns', 'Live coding interview strategy'], project_title: 'Production-Grade SPA', project_description: 'Ship a full SPA with real-time features, offline support, and sub-2s LCP.', tech: ['React', 'TypeScript', 'WebSockets', 'Service Workers'] },
    ],
  },

  'backend-developer': {
    required_skills: ['Node.js', 'Python', 'SQL', 'REST APIs', 'PostgreSQL', 'Redis', 'Message Queues', 'Authentication/JWT', 'Docker', 'System Design', 'Git'],
    nice_to_have: ['gRPC', 'Kafka', 'Elasticsearch', 'GraphQL', 'Kubernetes'],
    categories: {
      technical: ['Node.js', 'Python', 'SQL', 'System Design', 'Databases'],
      soft: ['Communication', 'Problem Solving', 'Documentation'],
      tools: ['Docker', 'Redis', 'Git', 'Kafka'],
      certifications: [],
    },
    typical_timeline_months: 4,
    avg_salary: '$125,000',
    strengths_summary: 'Node.js, Python, SQL, and REST API experience are core backend skills. PostgreSQL knowledge is a direct match.',
    biggest_gap: 'Distributed systems knowledge is the main gap: message queues, caching, and horizontal scaling patterns.',
    roadmap_phases: [
      { focus_area: 'Databases & Caching', topics: ['PostgreSQL advanced queries and indexing', 'Redis caching patterns', 'Database connection pooling', 'Transactions and ACID'], project_title: 'Cached API Server', project_description: 'Build a Node.js API with Redis caching that reduces DB load by 80% under load testing.', tech: ['Node.js', 'PostgreSQL', 'Redis'] },
      { focus_area: 'Auth & Security', topics: ['JWT vs session auth', 'OAuth 2.0 / OIDC flow', 'API rate limiting', 'OWASP Top 10 prevention'], project_title: 'Auth Microservice', project_description: 'Implement a standalone auth service with JWT refresh tokens, rate limiting, and audit logs.', tech: ['Node.js', 'JWT', 'PostgreSQL'] },
      { focus_area: 'Containerization & Queues', topics: ['Docker multi-stage builds', 'Message queue patterns (pub/sub, work queues)', 'Graceful shutdown and health checks', 'API versioning'], project_title: 'Event-Driven API', project_description: 'Add a RabbitMQ-backed job queue to process async background tasks (emails, reports).', tech: ['Docker', 'RabbitMQ', 'Node.js'] },
      { focus_area: 'System Design & Scale', topics: ['CAP theorem and consistency tradeoffs', 'Load balancing strategies', 'Horizontal vs vertical scaling', 'Backend interview prep'], project_title: 'Scalable Microservice', project_description: 'Design and implement a horizontally scalable backend service with observability.', tech: ['Node.js', 'Docker', 'PostgreSQL', 'Redis'] },
    ],
  },

  'full-stack-developer': {
    required_skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'REST APIs', 'Git', 'HTML/CSS', 'Docker', 'Auth/Sessions', 'CI/CD', 'SQL'],
    nice_to_have: ['Next.js', 'Redis', 'GraphQL', 'Kubernetes', 'AWS'],
    categories: {
      technical: ['React', 'Node.js', 'TypeScript', 'SQL', 'Docker'],
      soft: ['Communication', 'Problem Solving', 'Self-direction'],
      tools: ['Git', 'Docker', 'CI/CD'],
      certifications: [],
    },
    typical_timeline_months: 3,
    avg_salary: '$115,000',
    strengths_summary: 'Your skill set is already a strong full-stack foundation. React, Node.js, TypeScript, PostgreSQL, and REST APIs are direct matches.',
    biggest_gap: 'Production-grade deployment, containerization, and CI/CD pipeline experience.',
    roadmap_phases: [
      { focus_area: 'Full-Stack Architecture', topics: ['Monolith vs microservices tradeoffs', 'Next.js App Router patterns', 'Database design and migrations', 'API design best practices'], project_title: 'Production-Ready App', project_description: 'Build a full-stack app with Next.js, PostgreSQL, and proper error boundaries.', tech: ['Next.js', 'TypeScript', 'PostgreSQL'] },
      { focus_area: 'Auth & State', topics: ['Auth.js / NextAuth patterns', 'Session management and JWTs', 'Server vs client state', 'Optimistic UI updates'], project_title: 'Auth-Gated Dashboard', project_description: 'Add Google/GitHub OAuth, role-based access, and a user dashboard.', tech: ['Next.js', 'Auth.js', 'PostgreSQL'] },
      { focus_area: 'DevOps Basics', topics: ['Docker Compose for local dev', 'GitHub Actions CI/CD', 'Environment management', 'Zero-downtime deployments'], project_title: 'CI/CD Pipeline', project_description: 'Ship a full pipeline: lint, test, build, Docker push, deploy on merge.', tech: ['Docker', 'GitHub Actions', 'Vercel/Railway'] },
      { focus_area: 'Portfolio Polish', topics: ['Performance optimization', 'SEO and Core Web Vitals', 'Accessibility basics', 'Full-stack interview prep'], project_title: 'Portfolio Showcase App', project_description: 'Ship a polished app with 90+ Lighthouse score, auth, and real users.', tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Docker'] },
    ],
  },

  'data-engineer': {
    required_skills: ['Python', 'SQL', 'Apache Spark', 'Apache Airflow', 'Data Warehousing', 'ETL Pipelines', 'AWS/GCP/Azure', 'Kafka', 'dbt', 'Docker', 'Git'],
    nice_to_have: ['Flink', 'Delta Lake', 'Databricks', 'Kubernetes', 'Terraform'],
    categories: {
      technical: ['Python', 'SQL', 'Spark', 'ETL', 'Data Warehousing'],
      soft: ['Problem Solving', 'Communication', 'Documentation'],
      tools: ['Airflow', 'dbt', 'Kafka', 'Docker'],
      certifications: ['AWS Certified Data Analytics', 'GCP Professional Data Engineer'],
    },
    typical_timeline_months: 6,
    avg_salary: '$130,000',
    strengths_summary: 'Python and SQL are foundational data engineering skills you already have. Git and problem-solving transfer directly.',
    biggest_gap: 'Distributed computing frameworks (Spark) and pipeline orchestration tools (Airflow, dbt).',
    roadmap_phases: [
      { focus_area: 'SQL & Data Modeling', topics: ['Advanced SQL: window functions, CTEs', 'Data warehouse modeling (star/snowflake)', 'dbt fundamentals', 'Query optimization'], project_title: 'Analytics Data Model', project_description: 'Model a sales database into a star schema using dbt with documentation and tests.', tech: ['PostgreSQL', 'dbt', 'SQL'] },
      { focus_area: 'ETL & Orchestration', topics: ['ETL vs ELT patterns', 'Apache Airflow: DAGs, operators, sensors', 'Error handling and retries', 'Pipeline monitoring'], project_title: 'Airflow ETL Pipeline', project_description: 'Build an Airflow DAG that extracts data from a public API, transforms it, and loads it to PostgreSQL.', tech: ['Python', 'Airflow', 'PostgreSQL'] },
      { focus_area: 'Distributed Processing', topics: ['Spark architecture (RDDs, DataFrames)', 'PySpark fundamentals', 'Batch vs streaming processing', 'Kafka introduction'], project_title: 'PySpark Data Pipeline', project_description: 'Process 1GB+ dataset with PySpark: aggregate, clean, write to Parquet.', tech: ['PySpark', 'Kafka', 'Python'] },
      { focus_area: 'Cloud & Production', topics: ['AWS S3, Glue, Redshift', 'Infrastructure as Code for data', 'Data quality and observability', 'Data engineering interview prep'], project_title: 'Cloud Data Platform', project_description: 'Build an end-to-end data platform on AWS free tier with S3, Glue, and Athena.', tech: ['AWS', 'Python', 'Airflow', 'dbt'] },
    ],
  },

  'data-analyst': {
    required_skills: ['SQL', 'Python', 'Excel/Sheets', 'Tableau/Power BI', 'Statistics', 'Data Visualization', 'A/B Testing', 'Business Intelligence', 'Communication', 'Git'],
    nice_to_have: ['R', 'Looker', 'Mixpanel', 'Google Analytics', 'dbt'],
    categories: {
      technical: ['SQL', 'Python', 'Statistics', 'Data Visualization'],
      soft: ['Communication', 'Storytelling', 'Business Acumen'],
      tools: ['Tableau', 'Excel', 'Looker', 'Google Analytics'],
      certifications: ['Google Data Analytics Certificate', 'Tableau Desktop Specialist'],
    },
    typical_timeline_months: 3,
    avg_salary: '$85,000',
    strengths_summary: 'SQL and Python are your biggest assets. Combined with strong communication skills, you are well-positioned for analytics roles.',
    biggest_gap: 'Business intelligence tooling (Tableau/Power BI) and statistical analysis depth.',
    roadmap_phases: [
      { focus_area: 'SQL Mastery & BI Tools', topics: ['Advanced SQL: window functions, recursive CTEs', 'Tableau fundamentals and dashboarding', 'Power BI basics', 'Data storytelling principles'], project_title: 'Sales Dashboard', project_description: 'Build an interactive Tableau dashboard from a public dataset with KPIs and drill-downs.', tech: ['SQL', 'Tableau', 'Excel'] },
      { focus_area: 'Statistics & Python Analytics', topics: ['Descriptive vs inferential statistics', 'Pandas and NumPy for analysis', 'Matplotlib/Seaborn visualizations', 'Hypothesis testing'], project_title: 'A/B Test Analysis', project_description: 'Analyze a simulated A/B test using Python: significance testing, power analysis, and recommendation.', tech: ['Python', 'Pandas', 'Matplotlib'] },
      { focus_area: 'Business Intelligence', topics: ['A/B testing frameworks', 'Funnel and cohort analysis', 'Metric definition and tracking', 'Product analytics tools'], project_title: 'Product Metrics Report', project_description: 'Build an end-to-end analytics report: data extraction, Python analysis, Tableau visualization.', tech: ['SQL', 'Python', 'Tableau'] },
      { focus_area: 'Portfolio & Communication', topics: ['Presenting data to non-technical stakeholders', 'SQL interview patterns', 'Case study frameworks', 'Analytics take-home projects'], project_title: 'Case Study Portfolio', project_description: 'Complete 3 analyst case studies covering marketing, product, and operations use cases.', tech: ['SQL', 'Python', 'Tableau'] },
    ],
  },

  'ux-designer': {
    required_skills: ['Figma', 'User Research', 'Wireframing', 'Prototyping', 'Usability Testing', 'Information Architecture', 'Design Systems', 'Interaction Design', 'Communication', 'Accessibility'],
    nice_to_have: ['Framer', 'Adobe XD', 'Motion Design', 'HTML/CSS', 'User Interviews'],
    categories: {
      technical: ['Figma', 'Prototyping', 'Information Architecture', 'Design Systems'],
      soft: ['Empathy', 'Communication', 'Facilitation', 'Storytelling'],
      tools: ['Figma', 'Framer', 'Hotjar', 'Maze'],
      certifications: ['Google UX Design Certificate', 'NN/g UX Certification'],
    },
    typical_timeline_months: 5,
    avg_salary: '$95,000',
    strengths_summary: 'Your communication skills and analytical problem-solving transfer well to UX. Technical background helps you collaborate with engineers effectively.',
    biggest_gap: 'Figma proficiency and a portfolio of end-to-end UX case studies demonstrating the full design process.',
    roadmap_phases: [
      { focus_area: 'Figma & Visual Design', topics: ['Figma components, auto layout, variants', 'Typography and color theory', 'UI design principles', 'Design system fundamentals'], project_title: 'Design System', project_description: 'Build a Figma component library with 20+ components, design tokens, and documentation.', tech: ['Figma'] },
      { focus_area: 'User Research', topics: ['User interview methods', 'Affinity mapping and synthesis', 'Competitive analysis', 'Persona creation'], project_title: 'Research Sprint', project_description: 'Conduct 5 user interviews, synthesize findings, and present actionable insights.', tech: ['Figma', 'Miro', 'Notion'] },
      { focus_area: 'Prototyping & Testing', topics: ['High-fidelity prototyping in Figma', 'Usability testing methods', 'Think-aloud protocols', 'Iterating on feedback'], project_title: 'Mobile App Redesign', project_description: 'Redesign a popular app screen based on usability research and test with 5 users.', tech: ['Figma', 'Maze'] },
      { focus_area: 'Portfolio & Process', topics: ['Case study writing', 'Information architecture (sitemaps, card sorting)', 'Accessibility design principles', 'UX interview preparation'], project_title: 'End-to-End Case Study', project_description: 'Ship a full UX case study: research, ideation, wireframes, prototype, testing, iteration.', tech: ['Figma', 'Notion'] },
    ],
  },

  'cloud-architect': {
    required_skills: ['AWS/GCP/Azure', 'Terraform', 'Kubernetes', 'Networking', 'Security Architecture', 'Docker', 'Microservices', 'Cost Optimization', 'CI/CD', 'System Design', 'Git'],
    nice_to_have: ['Istio', 'HashiCorp Vault', 'ArgoCD', 'CloudFormation', 'Helm'],
    categories: {
      technical: ['AWS', 'Terraform', 'Kubernetes', 'Networking', 'Security'],
      soft: ['Leadership', 'Communication', 'Strategic Thinking'],
      tools: ['Terraform', 'Kubernetes', 'Docker', 'ArgoCD'],
      certifications: ['AWS Solutions Architect Professional', 'Google Cloud Professional Cloud Architect'],
    },
    typical_timeline_months: 8,
    avg_salary: '$155,000',
    strengths_summary: 'Your development background in Python, Node.js, and SQL provides a solid foundation for understanding cloud-native application requirements.',
    biggest_gap: 'Multi-account AWS architecture, networking (VPC, transit gateways), and cloud security best practices at scale.',
    roadmap_phases: [
      { focus_area: 'AWS Core Services', topics: ['VPC, subnets, security groups', 'EC2, ECS, EKS, Lambda', 'IAM policies and roles', 'S3, RDS, ElastiCache'], project_title: 'Multi-Tier AWS Architecture', project_description: 'Design and deploy a 3-tier web app on AWS with proper networking and IAM.', tech: ['AWS', 'Terraform', 'Docker'] },
      { focus_area: 'Infrastructure as Code', topics: ['Terraform modules and state management', 'AWS CDK basics', 'Policy as Code', 'GitOps workflows'], project_title: 'IaC-Based Infrastructure', project_description: 'Provision a complete AWS environment via Terraform: VPC, EKS, RDS, ALB.', tech: ['Terraform', 'AWS', 'Kubernetes'] },
      { focus_area: 'Security & Compliance', topics: ['Zero-trust networking', 'Secrets management with Vault', 'Cloud security frameworks (CIS, SOC 2)', 'Threat modeling'], project_title: 'Security Hardened Cluster', project_description: 'Harden an EKS cluster against CIS benchmarks with network policies and Vault integration.', tech: ['Kubernetes', 'Vault', 'AWS'] },
      { focus_area: 'Scale & Cost', topics: ['Auto-scaling patterns', 'FinOps and cost optimization', 'Multi-region architectures', 'Well-Architected Framework review'], project_title: 'Architecture Review', project_description: 'Conduct a Well-Architected review of an existing workload and implement top 5 recommendations.', tech: ['AWS', 'Terraform', 'Kubernetes'] },
    ],
  },

  'site-reliability-engineer': {
    required_skills: ['Linux Administration', 'Python', 'Go', 'Kubernetes', 'Prometheus', 'Grafana', 'SLOs/SLAs/SLIs', 'Incident Response', 'CI/CD', 'Terraform', 'Git'],
    nice_to_have: ['Jaeger', 'OpenTelemetry', 'Chaos Engineering', 'PagerDuty', 'Helm'],
    categories: {
      technical: ['Linux', 'Python', 'Kubernetes', 'Observability', 'SRE Principles'],
      soft: ['Incident Management', 'Communication', 'On-call discipline'],
      tools: ['Prometheus', 'Grafana', 'Terraform', 'PagerDuty'],
      certifications: ['CKA', 'Google SRE Book certification (community)'],
    },
    typical_timeline_months: 7,
    avg_salary: '$140,000',
    strengths_summary: 'Python and Git are core SRE skills. Your development background means you can read and reason about production code, which is critical for incident response.',
    biggest_gap: 'Observability tooling (Prometheus, Grafana, distributed tracing) and SLO-based reliability engineering.',
    roadmap_phases: [
      { focus_area: 'Observability Foundations', topics: ['SLOs, SLIs, error budgets', 'Prometheus metrics and PromQL', 'Grafana dashboards', 'Distributed tracing with OpenTelemetry'], project_title: 'Observability Stack', project_description: 'Instrument a Node.js app with Prometheus metrics, set up Grafana dashboards, and define SLOs.', tech: ['Prometheus', 'Grafana', 'OpenTelemetry'] },
      { focus_area: 'Kubernetes Operations', topics: ['Kubernetes troubleshooting', 'Resource quotas and limits', 'Horizontal pod autoscaling', 'Cluster upgrades'], project_title: 'Production Kubernetes Setup', project_description: 'Set up a production-grade Kubernetes cluster with autoscaling, monitoring, and runbooks.', tech: ['Kubernetes', 'Prometheus', 'Helm'] },
      { focus_area: 'Incident Management', topics: ['On-call best practices', 'Incident runbooks', 'Post-mortem culture', 'Chaos engineering basics'], project_title: 'Chaos Engineering Lab', project_description: 'Run Chaos Monkey experiments on a test cluster and validate SLO recovery.', tech: ['Kubernetes', 'Chaos Mesh', 'PagerDuty'] },
      { focus_area: 'Automation & Go', topics: ['Go basics for SRE tooling', 'CLI tool development', 'Kubernetes operators (intro)', 'SRE interview preparation'], project_title: 'SRE Toolkit CLI', project_description: 'Write a Go CLI tool that checks cluster health and pages on SLO violations.', tech: ['Go', 'Kubernetes', 'Prometheus'] },
    ],
  },

  'cybersecurity-analyst': {
    required_skills: ['Network Security', 'SIEM Tools', 'Incident Response', 'Vulnerability Assessment', 'Threat Analysis', 'Log Analysis', 'Security Frameworks', 'Python', 'SQL', 'Communication', 'Git'],
    nice_to_have: ['Penetration Testing', 'Cloud Security', 'Wireshark', 'CompTIA Security+', 'Scripting (Bash)'],
    categories: {
      technical: ['Network Security', 'SIEM Tools', 'Incident Response', 'Vulnerability Assessment', 'Log Analysis'],
      soft: ['Analytical Thinking', 'Communication', 'Attention to Detail', 'Ethics'],
      tools: ['Splunk', 'Wireshark', 'Nessus', 'Nmap', 'CrowdStrike'],
      certifications: ['CompTIA Security+', 'CompTIA CySA+', 'CEH', 'GCIH'],
    },
    typical_timeline_months: 5,
    avg_salary: '$85,000 – $105,000',
    strengths_summary: 'Python and SQL map directly to threat hunting and log analysis. Your analytical problem-solving background is exactly what security operations requires.',
    biggest_gap: 'Network security fundamentals, hands-on SIEM experience, and incident response procedures are the primary gaps, and they require dedicated lab practice.',
    roadmap_phases: [
      { focus_area: 'Security Fundamentals', topics: ['CIA triad and security principles', 'Networking: TCP/IP, DNS, HTTP/HTTPS', 'Common attack vectors (OWASP Top 10)', 'Threat modeling basics'], project_title: 'Threat Modeling Report', project_description: 'Model threats for a sample web app using STRIDE. Identify attack surfaces and mitigations.', tech: ['STRIDE', 'draw.io', 'OWASP ZAP'] },
      { focus_area: 'Network Security & Monitoring', topics: ['Wireshark packet analysis', 'IDS/IPS concepts (Snort/Suricata)', 'Firewall rules and ACLs', 'Log analysis with Python'], project_title: 'Network Traffic Analyzer', project_description: 'Capture and analyze 1 hour of network traffic, identify suspicious patterns, and document findings.', tech: ['Wireshark', 'Python', 'tcpdump'] },
      { focus_area: 'SIEM & Incident Response', topics: ['SIEM fundamentals (Splunk/Elastic)', 'Log ingestion and correlation rules', 'Incident response lifecycle (NIST)', 'Digital forensics basics'], project_title: 'SIEM Detection Rules', project_description: 'Write 5 Splunk/Elastic detection rules for common attack patterns (brute force, lateral movement).', tech: ['Splunk', 'Elastic SIEM', 'Python'] },
      { focus_area: 'Vulnerability Assessment & Certification', topics: ['Nessus/OpenVAS scanning', 'CVE research and CVSS scoring', 'Patch management lifecycle', 'CompTIA Security+ exam prep'], project_title: 'Vulnerability Assessment Report', project_description: 'Scan a lab environment, triage findings by CVSS score, and produce a remediation plan.', tech: ['Nessus', 'OpenVAS', 'Markdown'] },
    ],
  },

  'security-engineer': {
    required_skills: ['Network Security', 'Python', 'Linux', 'SIEM Tools', 'Vulnerability Assessment', 'Penetration Testing', 'Cryptography', 'Cloud Security', 'Incident Response', 'Git'],
    nice_to_have: ['Burp Suite', 'Metasploit', 'Wireshark', 'Terraform', 'SOC2/ISO27001'],
    categories: {
      technical: ['Networking', 'Python', 'Penetration Testing', 'Cryptography', 'Cloud Security'],
      soft: ['Analytical Thinking', 'Communication', 'Ethics'],
      tools: ['Burp Suite', 'Nmap', 'Wireshark', 'SIEM'],
      certifications: ['CompTIA Security+', 'CEH', 'OSCP'],
    },
    typical_timeline_months: 7,
    avg_salary: '$125,000',
    strengths_summary: 'Python scripting and Linux knowledge are core security skills. Your development background helps you understand the codebases you will be testing.',
    biggest_gap: 'Hands-on penetration testing experience and deep understanding of network protocols and exploit techniques.',
    roadmap_phases: [
      { focus_area: 'Security Fundamentals', topics: ['OWASP Top 10 deep dive', 'Network security (TCP/IP, firewalls, IDS)', 'Cryptography fundamentals', 'Linux security hardening'], project_title: 'Security Audit Report', project_description: 'Perform an OWASP Top 10 audit on a deliberately vulnerable app (DVWA) and write a findings report.', tech: ['Burp Suite', 'DVWA', 'Linux'] },
      { focus_area: 'Penetration Testing', topics: ['Recon and OSINT techniques', 'Web application testing methodology', 'Metasploit basics', 'Reporting vulnerabilities'], project_title: 'CTF Competition', project_description: 'Complete 10 HackTheBox/TryHackMe machines and document methodology for each.', tech: ['Kali Linux', 'Metasploit', 'Burp Suite'] },
      { focus_area: 'Cloud & DevSecOps', topics: ['AWS security services (GuardDuty, Inspector)', 'Secret scanning in CI/CD', 'Container security', 'SIEM fundamentals'], project_title: 'DevSecOps Pipeline', project_description: 'Add SAST, DAST, and secrets scanning to a GitHub Actions pipeline.', tech: ['AWS', 'GitHub Actions', 'Trivy', 'Semgrep'] },
      { focus_area: 'Certifications & Interview', topics: ['CompTIA Security+ prep', 'Incident response playbooks', 'Security interview patterns', 'Bug bounty strategy'], project_title: 'Bug Bounty Report', project_description: 'Submit 3 valid vulnerability reports to a bug bounty program (HackerOne/Bugcrowd).', tech: ['Burp Suite', 'Python', 'Recon tools'] },
    ],
  },

  'financial-analyst': {
    required_skills: ['Financial Modeling', 'Excel', 'DCF Valuation', 'Accounting', 'SQL', 'Python', 'Bloomberg Terminal', 'PowerPoint', 'Communication', 'Business Analysis'],
    nice_to_have: ['VBA/Macros', 'Power BI', 'Capital IQ', 'CFA Level 1'],
    categories: {
      technical: ['Financial Modeling', 'DCF', 'Accounting', 'SQL', 'Python'],
      soft: ['Communication', 'Attention to Detail', 'Analytical Thinking'],
      tools: ['Excel', 'Bloomberg', 'PowerPoint', 'Capital IQ'],
      certifications: ['CFA Level 1', 'Financial Modeling & Valuation Analyst (FMVA)'],
    },
    typical_timeline_months: 5,
    avg_salary: '$90,000',
    strengths_summary: 'SQL and Python provide strong quantitative analysis skills. Your analytical problem-solving background is directly applicable.',
    biggest_gap: 'Financial modeling techniques (DCF, LBO, comparables) and accounting fundamentals (income statement, balance sheet, cash flow statement).',
    roadmap_phases: [
      { focus_area: 'Accounting & Finance Foundations', topics: ['Three financial statements', 'Accounting equations and journal entries', 'Ratio analysis', 'Time value of money'], project_title: 'Financial Statement Analysis', project_description: 'Analyze a public company\'s 3-year financials: ratios, trends, and investment thesis.', tech: ['Excel', 'SEC EDGAR'] },
      { focus_area: 'Financial Modeling', topics: ['DCF valuation methodology', 'Three-statement model building', 'Sensitivity and scenario analysis', 'Comparable companies analysis'], project_title: '3-Statement Model', project_description: 'Build a fully integrated 3-statement model from scratch for a mid-cap public company.', tech: ['Excel', 'Capital IQ'] },
      { focus_area: 'Python & Data for Finance', topics: ['Pandas for financial data', 'yfinance and financial APIs', 'Portfolio analysis and risk metrics', 'Automation with Python'], project_title: 'Automated Comps Model', project_description: 'Write a Python script that pulls comparable company data and builds a comps table automatically.', tech: ['Python', 'Pandas', 'yfinance'] },
      { focus_area: 'Communication & Interview', topics: ['Presenting financial analysis', 'Pitch book structure', 'Finance interview case studies', 'Networking and CFA prep'], project_title: 'Investment Pitch', project_description: 'Write a 10-page investment pitch deck for a stock of your choice with full financial analysis.', tech: ['Excel', 'PowerPoint'] },
    ],
  },

  'technical-program-manager': {
    required_skills: ['Project Management', 'Agile/Scrum', 'Technical Communication', 'Risk Management', 'Stakeholder Management', 'SQL', 'Systems Thinking', 'JIRA/Linear', 'Roadmapping', 'Communication'],
    nice_to_have: ['PMP Certification', 'OKR frameworks', 'Python', 'API integrations', 'Cross-functional leadership'],
    categories: {
      technical: ['Systems Thinking', 'SQL', 'API Knowledge', 'Architecture Reviews'],
      soft: ['Communication', 'Leadership', 'Conflict Resolution', 'Stakeholder Management'],
      tools: ['JIRA', 'Confluence', 'Linear', 'Notion'],
      certifications: ['PMP', 'CSM (Certified Scrum Master)', 'Google Project Management Certificate'],
    },
    typical_timeline_months: 4,
    avg_salary: '$130,000',
    strengths_summary: 'Your technical background and Agile experience are exactly what TPM roles require. SQL skills and communication ability set you apart.',
    biggest_gap: 'Managing large cross-functional programs, risk registers, and executive stakeholder communication at scale.',
    roadmap_phases: [
      { focus_area: 'Program Management Foundations', topics: ['SDLC and Agile at scale', 'Program vs project management', 'Risk registers and mitigation', 'OKR alignment'], project_title: 'Program Plan', project_description: 'Create a 6-month program plan for a fictional product launch with milestones, risks, and dependencies.', tech: ['JIRA', 'Confluence', 'Notion'] },
      { focus_area: 'Technical Depth for TPMs', topics: ['How to read architecture diagrams', 'API and system integration review', 'Technical debt triage', 'Engineering estimation techniques'], project_title: 'Technical Spec Review', project_description: 'Write a technical review of a system design, identifying risks and asking clarifying questions.', tech: ['Notion', 'Draw.io'] },
      { focus_area: 'Stakeholder Communication', topics: ['Executive status updates', 'Managing up and sideways', 'Difficult conversations frameworks', 'Metrics and OKR reporting'], project_title: 'Executive Dashboard', project_description: 'Build a weekly executive status template covering velocity, risks, and decisions needed.', tech: ['Notion', 'Sheets'] },
      { focus_area: 'Portfolio & Interview', topics: ['TPM interview case studies', 'Conflict resolution scenarios', 'Program scoping exercises', 'PMP exam strategy'], project_title: 'Case Study Collection', project_description: 'Write 3 program management case studies covering a launch, an incident, and a cross-team dependency.', tech: ['Notion', 'JIRA'] },
    ],
  },

  'growth-engineer': {
    required_skills: ['JavaScript', 'Python', 'SQL', 'A/B Testing', 'Analytics Tools', 'Funnel Optimization', 'REST APIs', 'Git', 'Data Analysis', 'Experimentation Frameworks'],
    nice_to_have: ['React', 'Mixpanel', 'Amplitude', 'Segment', 'Statistics'],
    categories: {
      technical: ['JavaScript', 'Python', 'SQL', 'A/B Testing', 'Experimentation'],
      soft: ['Curiosity', 'Communication', 'Business Acumen'],
      tools: ['Mixpanel', 'Amplitude', 'Segment', 'Optimizely'],
      certifications: [],
    },
    typical_timeline_months: 4,
    avg_salary: '$120,000',
    strengths_summary: 'JavaScript, Python, SQL, and REST APIs directly map to growth engineering work. Your full-stack background means you can ship experiments end-to-end.',
    biggest_gap: 'Deep knowledge of experimentation frameworks (A/B testing at scale, statistical significance) and product analytics tools.',
    roadmap_phases: [
      { focus_area: 'Product Analytics', topics: ['Funnel analysis and cohort analysis', 'Setting up Mixpanel/Amplitude', 'Defining and tracking metrics', 'SQL for product analytics'], project_title: 'Analytics Implementation', project_description: 'Instrument a web app with Mixpanel, build a funnel dashboard, and identify top drop-off points.', tech: ['JavaScript', 'Mixpanel', 'SQL'] },
      { focus_area: 'Experimentation', topics: ['A/B test design and statistical significance', 'Multi-variate testing', 'Feature flags with LaunchDarkly', 'Bayesian vs frequentist stats'], project_title: 'A/B Test Framework', project_description: 'Build a minimal A/B testing framework using feature flags and log statistical results.', tech: ['JavaScript', 'LaunchDarkly', 'Python'] },
      { focus_area: 'Growth Channels', topics: ['SEO fundamentals for growth', 'Email automation and lifecycle', 'Referral program mechanics', 'Viral coefficient analysis'], project_title: 'Growth Experiment', project_description: 'Run a full growth experiment: hypothesis, instrumentation, test, analysis, decision.', tech: ['Python', 'SQL', 'Mixpanel'] },
      { focus_area: 'Portfolio & Interview', topics: ['Growth case studies', 'Metric-driven storytelling', 'Technical growth interview prep', 'Side project acquisition strategy'], project_title: 'Growth Case Study', project_description: 'Write a 5-page case study on a growth lever you tested: hypothesis, method, result, next step.', tech: ['Notion', 'Python', 'SQL'] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Curated full fixtures (6 roles)
// ---------------------------------------------------------------------------

function makeDevOpsFixture(analysisId: string): AnalysisResult {
  return {
    analysisId,
    targetRole: 'DevOps Engineer',
    isDemoMode: true,
    createdAt: new Date().toISOString(),
    skillExtraction: { ...FICTIONAL_CANDIDATE },
    roleRequirements: {
      required_skills: ['Docker', 'Kubernetes', 'CI/CD Pipelines', 'Linux Administration', 'Terraform', 'AWS/GCP/Azure', 'Ansible', 'Prometheus', 'Grafana', 'Shell Scripting', 'Nginx', 'Jenkins', 'Git', 'Python', 'Networking', 'Security Best Practices', 'Incident Response', 'Monitoring'],
      nice_to_have: ['Helm', 'ArgoCD', 'Vault', 'ELK Stack', 'Istio'],
      categories: {
        technical: ['Docker', 'Kubernetes', 'Terraform', 'Linux', 'Networking', 'Security'],
        soft: ['Incident Response', 'Communication', 'Problem Solving', 'Documentation'],
        tools: ['Jenkins', 'Prometheus', 'Grafana', 'Ansible', 'Nginx'],
        certifications: ['AWS Certified DevOps Engineer', 'CKA - Certified Kubernetes Administrator'],
      },
      typical_timeline_months: 6,
      avg_salary: '$135,000',
    },
    gapAnalysis: {
      missing_critical: ['Docker', 'Kubernetes', 'Terraform', 'Linux Administration', 'CI/CD Pipelines', 'AWS/GCP/Azure', 'Ansible', 'Prometheus', 'Grafana', 'Shell Scripting', 'Nginx', 'Networking Fundamentals'],
      missing_nice: ['Helm', 'ArgoCD', 'Vault', 'ELK Stack'],
      transferable: ['Python', 'Git', 'Problem Solving', 'Agile', 'REST APIs', 'SQL'],
      readiness_score: 67,
      strengths_summary: 'Your programming background in Python, JavaScript, and SQL translates directly to scripting and automation tasks. Git proficiency and Agile experience are core DevOps skills you already have.',
      biggest_gap: 'Container orchestration with Docker and Kubernetes, the backbone of modern DevOps workflows.',
    },
    roadmap: [
      { week_start: 1, week_end: 2, focus_area: 'Linux & Shell Scripting Fundamentals', topics: ['Linux file system and permissions', 'Bash scripting: variables, loops, functions', 'Process management and systemd', 'Networking basics: TCP/IP, DNS, ports', 'SSH and remote access'], resources: [{ title: 'Linux Command Line for Beginners', url: 'https://ubuntu.com/tutorials/command-line-for-beginners', type: 'Docs' }, { title: 'Bash Scripting Full Course (FreeCodeCamp)', url: 'https://www.youtube.com/watch?v=e7BufAVwDiM', type: 'Video' }], project: { title: 'System Health Monitor Script', description: 'Write a Bash script that monitors CPU, memory, disk usage, and running processes.', tech: ['Bash', 'Linux', 'Cron'], hours: 12 }, milestone: 'Comfortable navigating Linux CLI, writing automation scripts, and understanding system processes.' },
      { week_start: 3, week_end: 4, focus_area: 'Docker & Containerization', topics: ['Container concepts vs virtual machines', 'Docker architecture: daemon, images, containers', 'Writing Dockerfiles and best practices', 'Docker Compose for multi-container apps', 'Container networking and volumes'], resources: [{ title: 'Docker Official Getting Started Guide', url: 'https://docs.docker.com/get-started/', type: 'Docs' }, { title: 'Docker Tutorial for Beginners (TechWorld)', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', type: 'Video' }], project: { title: 'Dockerize Your Node.js App', description: 'Containerize a Node.js REST API with PostgreSQL using Docker Compose.', tech: ['Docker', 'Docker Compose', 'Node.js', 'PostgreSQL'], hours: 15 }, milestone: 'Can containerize any application and run complex multi-service environments locally with Docker Compose.' },
      { week_start: 5, week_end: 6, focus_area: 'CI/CD Pipelines with GitHub Actions', topics: ['CI/CD concepts and pipeline stages', 'GitHub Actions: workflows, jobs, steps', 'Automated testing in pipelines', 'Building and pushing Docker images', 'Deployment strategies'], resources: [{ title: 'GitHub Actions Documentation', url: 'https://docs.github.com/en/actions', type: 'Docs' }, { title: 'GitHub Actions Full Course (Fireship)', url: 'https://www.youtube.com/watch?v=R8_veQiYBjI', type: 'Video' }], project: { title: 'Full CI/CD Pipeline', description: 'Build a complete pipeline: code push to lint to test to Docker build to push to registry to deploy.', tech: ['GitHub Actions', 'Docker', 'Jest', 'YAML'], hours: 14 }, milestone: 'Every commit triggers automated tests and deployment. Can design CI/CD pipelines for any project.' },
      { week_start: 7, week_end: 8, focus_area: 'Kubernetes Fundamentals', topics: ['Kubernetes architecture: control plane, nodes, pods', 'Deployments, ReplicaSets, and Services', 'ConfigMaps, Secrets, and Volumes', 'Ingress controllers and networking', 'kubectl CLI mastery'], resources: [{ title: 'Kubernetes Official Docs', url: 'https://kubernetes.io/docs/home/', type: 'Docs' }, { title: 'Kubernetes Full Course (TechWorld with Nana)', url: 'https://www.youtube.com/watch?v=X48VuDVv0do', type: 'Video' }], project: { title: 'Deploy App to Kubernetes Cluster', description: 'Deploy your Dockerized app to a local Minikube cluster with autoscaling.', tech: ['Kubernetes', 'Minikube', 'kubectl', 'YAML'], hours: 18 }, milestone: 'Can deploy and manage containerized applications on Kubernetes with proper scaling and health checks.' },
      { week_start: 9, week_end: 10, focus_area: 'Cloud Infrastructure with AWS', topics: ['AWS core services: EC2, S3, RDS, VPC', 'IAM: users, roles, policies', 'EKS (Elastic Kubernetes Service)', 'Load balancers and auto-scaling groups', 'AWS CLI and SDK'], resources: [{ title: 'AWS Free Tier Account Setup', url: 'https://aws.amazon.com/free/', type: 'Docs' }, { title: 'AWS Tutorial For Beginners (Simplilearn)', url: 'https://www.youtube.com/watch?v=IT1X42D1KeA', type: 'Video' }], project: { title: 'Deploy to AWS EKS', description: 'Migrate your Kubernetes app to AWS. Set up EKS cluster, configure ALB ingress, connect RDS.', tech: ['AWS', 'EKS', 'EC2', 'RDS', 'CloudWatch'], hours: 20 }, milestone: 'Can architect and deploy production-ready applications on AWS with proper security and scalability.' },
      { week_start: 11, week_end: 12, focus_area: 'Infrastructure as Code with Terraform', topics: ['IaC concepts and benefits', 'Terraform syntax: providers, resources, variables', 'State management and remote backends', 'Terraform modules and reusability', 'Plan, apply, destroy workflow'], resources: [{ title: 'Terraform Official Documentation', url: 'https://developer.hashicorp.com/terraform/docs', type: 'Docs' }, { title: 'Terraform Course for Beginners (freeCodeCamp)', url: 'https://www.youtube.com/watch?v=SLB_c_ayRMo', type: 'Video' }], project: { title: 'Infrastructure as Code for AWS', description: 'Write Terraform code to provision your entire AWS infrastructure: VPC, EKS, RDS, S3, IAM.', tech: ['Terraform', 'AWS', 'HCL'], hours: 16 }, milestone: 'Can define, version, and reproduce cloud infrastructure programmatically.' },
      { week_start: 13, week_end: 14, focus_area: 'Monitoring & Observability', topics: ['Observability: logs, metrics, traces', 'Prometheus architecture and configuration', 'PromQL query language', 'Grafana dashboards and alerting', 'Incident response runbooks'], resources: [{ title: 'Prometheus Official Docs', url: 'https://prometheus.io/docs/introduction/overview/', type: 'Docs' }, { title: 'Grafana + Prometheus Tutorial (TechWorld)', url: 'https://www.youtube.com/watch?v=QoDqxm7ybLc', type: 'Video' }], project: { title: 'Full Observability Stack', description: 'Set up Prometheus + Grafana on your Kubernetes cluster with alerting.', tech: ['Prometheus', 'Grafana', 'Kubernetes', 'AlertManager'], hours: 14 }, milestone: 'Can monitor any system proactively, create meaningful dashboards, and respond to incidents with data.' },
      { week_start: 15, week_end: 16, focus_area: 'DevOps Capstone & Job Prep', topics: ['Configuration management with Ansible', 'Security scanning in CI/CD', 'DevOps interview preparation', 'Portfolio documentation and case studies', 'CKA exam preparation strategy'], resources: [{ title: 'Ansible for DevOps (Book)', url: 'https://www.ansiblefordevops.com/', type: 'Book' }, { title: 'DevOps Interview Questions Guide', url: 'https://github.com/bregman-arie/devops-exercises', type: 'Docs' }], project: { title: 'End-to-End DevOps Portfolio Project', description: 'Build a complete microservices application with full DevOps pipeline, monitoring, and auto-scaling.', tech: ['Everything learned', 'Microservices', 'ArgoCD', 'Helm'], hours: 25 }, milestone: 'Portfolio-ready DevOps engineer. Can confidently interview for mid-level DevOps roles.' },
    ],
  };
}

function makeDataScientistFixture(analysisId: string): AnalysisResult {
  const required = ['Python', 'Statistics & Probability', 'Machine Learning', 'pandas', 'scikit-learn', 'SQL', 'Data Visualization', 'Feature Engineering', 'Model Evaluation', 'Jupyter Notebooks', 'Git', 'A/B Testing', 'Deep Learning Fundamentals', 'Communication'];
  const nice = ['PyTorch/TensorFlow', 'Spark', 'Airflow', 'MLflow', 'Tableau', 'R', 'Bayesian Methods'];
  const { missing_critical, missing_nice, transferable, readiness_score } = computeGap(required, nice, 62);
  return {
    analysisId,
    targetRole: 'Data Scientist',
    isDemoMode: true,
    createdAt: new Date().toISOString(),
    skillExtraction: { ...FICTIONAL_CANDIDATE },
    roleRequirements: {
      required_skills: required,
      nice_to_have: nice,
      categories: {
        technical: ['Python', 'Statistics', 'Machine Learning', 'pandas', 'scikit-learn', 'SQL'],
        soft: ['Communication', 'Storytelling', 'Problem Solving', 'Business Acumen'],
        tools: ['Jupyter', 'Git', 'MLflow', 'Tableau'],
        certifications: ['AWS Certified Machine Learning Specialty', 'Google Professional Data Engineer'],
      },
      typical_timeline_months: 6,
      avg_salary: '$125,000',
    },
    gapAnalysis: {
      missing_critical,
      missing_nice,
      transferable,
      readiness_score,
      strengths_summary: 'Python and SQL are foundational data science skills you already have. Your analytical problem-solving background and software engineering discipline will help you write production-quality model code.',
      biggest_gap: 'Applied machine learning is the core gap: feature engineering, model selection, evaluation methodology, and communicating results to non-technical stakeholders.',
    },
    roadmap: [
      { week_start: 1, week_end: 2, focus_area: 'Statistics & Exploratory Analysis', topics: ['Descriptive statistics: mean, median, variance, percentiles', 'Probability distributions (normal, binomial, Poisson)', 'Hypothesis testing: t-tests, chi-square, ANOVA', 'Pandas for EDA: groupby, merge, pivot', 'Data visualization with Matplotlib and Seaborn'], resources: [{ title: 'StatQuest with Josh Starmer (YouTube)', url: 'https://www.youtube.com/c/joshstarmer', type: 'Video' }, { title: 'Pandas Documentation', url: 'https://pandas.pydata.org/docs/', type: 'Docs' }], project: { title: 'EDA on Kaggle Dataset', description: 'Download a real Kaggle dataset, perform full EDA, test 3 hypotheses, and present findings in a Jupyter notebook.', tech: ['Python', 'pandas', 'Matplotlib', 'Seaborn', 'Jupyter'], hours: 12 }, milestone: 'Can explore any dataset systematically, generate hypotheses, and communicate findings clearly.' },
      { week_start: 3, week_end: 4, focus_area: 'Classical Machine Learning', topics: ['Supervised learning: regression and classification', 'scikit-learn pipeline and preprocessing', 'Model evaluation: cross-validation, ROC-AUC, RMSE', 'Bias-variance tradeoff and regularization', 'Ensemble methods: Random Forest, XGBoost'], resources: [{ title: 'Hands-On Machine Learning (Aurélien Géron)', url: 'https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/', type: 'Book' }, { title: 'scikit-learn User Guide', url: 'https://scikit-learn.org/stable/user_guide.html', type: 'Docs' }], project: { title: 'End-to-End ML Pipeline', description: 'Build a churn prediction model: feature engineering, model selection, hyperparameter tuning, and performance report.', tech: ['Python', 'scikit-learn', 'pandas', 'XGBoost'], hours: 16 }, milestone: 'Can train, evaluate, and iterate on ML models using best practices. Understands when each algorithm is appropriate.' },
      { week_start: 5, week_end: 6, focus_area: 'Feature Engineering & Model Validation', topics: ['Feature selection techniques (mutual information, RFE)', 'Handling missing data and imbalanced classes', 'Time series features and leakage prevention', 'A/B testing and causal inference basics', 'SQL for feature extraction'], resources: [{ title: 'Feature Engineering for ML (Alice Zheng)', url: 'https://www.oreilly.com/library/view/feature-engineering-for/9781491953235/', type: 'Book' }, { title: 'Kaggle Learn: Feature Engineering', url: 'https://www.kaggle.com/learn/feature-engineering', type: 'Course' }], project: { title: 'Feature Engineering Challenge', description: 'Take a Kaggle competition dataset and improve a baseline model by 5+ points through feature engineering alone.', tech: ['Python', 'pandas', 'scikit-learn', 'SQL'], hours: 14 }, milestone: 'Can extract signal from raw data, prevent leakage, and validate models properly on held-out sets.' },
      { week_start: 7, week_end: 8, focus_area: 'Deep Learning Foundations', topics: ['Neural network architecture basics', 'PyTorch fundamentals: tensors, autograd', 'Training loops and backpropagation', 'CNNs for image, RNNs for sequences', 'Transfer learning with pretrained models'], resources: [{ title: 'fast.ai Practical Deep Learning', url: 'https://course.fast.ai/', type: 'Course' }, { title: 'PyTorch Official Tutorials', url: 'https://pytorch.org/tutorials/', type: 'Docs' }], project: { title: 'Text Classifier with PyTorch', description: 'Fine-tune a pretrained BERT model on a text classification task with training, evaluation, and inference.', tech: ['PyTorch', 'HuggingFace', 'Python'], hours: 18 }, milestone: 'Understands neural network training end-to-end. Can apply transfer learning to practical NLP/vision problems.' },
      { week_start: 9, week_end: 10, focus_area: 'SQL & Data Infrastructure', topics: ['Advanced SQL: window functions, CTEs, recursive queries', 'Writing efficient queries for large datasets', 'Introduction to dbt', 'Data pipeline basics with Airflow', 'BigQuery / Snowflake fundamentals'], resources: [{ title: 'Mode Analytics SQL Tutorial', url: 'https://mode.com/sql-tutorial/', type: 'Course' }, { title: 'dbt Fundamentals Course', url: 'https://courses.getdbt.com/courses/fundamentals', type: 'Course' }], project: { title: 'SQL Feature Store', description: 'Write 10+ complex SQL queries to generate model features from a relational dataset, documented in dbt.', tech: ['SQL', 'PostgreSQL', 'dbt'], hours: 10 }, milestone: 'Can write production-quality SQL for feature engineering and work with data infrastructure tools.' },
      { week_start: 11, week_end: 12, focus_area: 'Model Deployment & MLOps', topics: ['Serving models with FastAPI', 'MLflow for experiment tracking', 'Model monitoring and data drift', 'Docker for ML applications', 'Communicating results to stakeholders'], resources: [{ title: 'MLflow Documentation', url: 'https://mlflow.org/docs/latest/index.html', type: 'Docs' }, { title: 'FastAPI Documentation', url: 'https://fastapi.tiangolo.com/', type: 'Docs' }], project: { title: 'Deployed ML API', description: 'Package your best model into a FastAPI endpoint, track experiments with MLflow, and add model monitoring.', tech: ['Python', 'FastAPI', 'MLflow', 'Docker'], hours: 16 }, milestone: 'Can take a model from notebook to deployed API with experiment tracking and monitoring.' },
      { week_start: 13, week_end: 14, focus_area: 'Capstone & Portfolio', topics: ['End-to-end project documentation', 'Kaggle competition strategy', 'Data science interview: statistics, ML, SQL, case study', 'Business communication for DS findings', 'AWS ML Specialty exam prep'], resources: [{ title: 'Data Science Interview Handbook', url: 'https://www.teamblind.com/post/data-science-interview-handbook', type: 'Docs' }, { title: 'Ace the Data Science Interview (book)', url: 'https://www.acethedatascienceinterview.com/', type: 'Book' }], project: { title: 'Capstone Data Science Project', description: 'Build an end-to-end DS project: problem statement, EDA, modeling, MLflow tracking, deployed API, and a written business memo.', tech: ['Python', 'scikit-learn', 'MLflow', 'FastAPI', 'SQL'], hours: 24 }, milestone: 'Portfolio-ready data scientist. Can articulate technical decisions in business terms and handle DS interview loops.' },
    ],
  };
}

function makeSoftwareEngineerFixture(analysisId: string): AnalysisResult {
  const required = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'REST APIs', 'Git', 'System Design', 'Algorithms & Data Structures', 'Testing', 'Code Review', 'CI/CD'];
  const nice = ['GraphQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'gRPC', 'Microservices'];
  const { missing_critical, missing_nice, transferable, readiness_score } = computeGap(required, nice, 82);
  return {
    analysisId,
    targetRole: 'Software Engineer',
    isDemoMode: true,
    createdAt: new Date().toISOString(),
    skillExtraction: { ...FICTIONAL_CANDIDATE },
    roleRequirements: {
      required_skills: required,
      nice_to_have: nice,
      categories: {
        technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'System Design', 'Algorithms'],
        soft: ['Communication', 'Code Review', 'Collaboration', 'Problem Solving'],
        tools: ['Git', 'CI/CD', 'Docker', 'AWS'],
        certifications: [],
      },
      typical_timeline_months: 2,
      avg_salary: '$120,000',
    },
    gapAnalysis: {
      missing_critical,
      missing_nice,
      transferable,
      readiness_score,
      strengths_summary: 'Your skill set is an excellent match for software engineering roles. JavaScript, TypeScript, React, Node.js, SQL, and REST APIs are core requirements you already have.',
      biggest_gap: 'System design knowledge and algorithms/data structures depth needed for technical interview loops at competitive companies.',
    },
    roadmap: [
      { week_start: 1, week_end: 2, focus_area: 'Algorithms & Data Structures', topics: ['Arrays, strings, hashmaps: common patterns', 'Trees and graphs: BFS, DFS, traversal', 'Dynamic programming foundations', 'Two-pointer and sliding window techniques', 'Time/space complexity analysis'], resources: [{ title: 'Neetcode 150 (YouTube)', url: 'https://neetcode.io/', type: 'Course' }, { title: 'LeetCode Problem Sets', url: 'https://leetcode.com/', type: 'Docs' }], project: { title: 'Leetcode Consistency Streak', description: 'Complete 2 Leetcode problems daily for 2 weeks, targeting medium difficulty. Document your approach for each.', tech: ['JavaScript', 'TypeScript'], hours: 20 }, milestone: 'Can solve medium Leetcode problems in 20–30 minutes. Comfortable explaining time/space tradeoffs.' },
      { week_start: 3, week_end: 4, focus_area: 'System Design Fundamentals', topics: ['Scaling: horizontal vs vertical, load balancing', 'Databases: SQL vs NoSQL, sharding, replication', 'Caching strategies (Redis, CDN)', 'Designing APIs and microservices', 'CAP theorem and consistency models'], resources: [{ title: 'System Design Primer (GitHub)', url: 'https://github.com/donnemartin/system-design-primer', type: 'Docs' }, { title: 'Grokking System Design Interview', url: 'https://www.designgurus.io/course/grokking-the-system-design-interview', type: 'Course' }], project: { title: 'Design a URL Shortener', description: 'Write a detailed design doc for a URL shortener: DB schema, API design, caching, scaling to 1B URLs.', tech: ['Markdown', 'Draw.io'], hours: 8 }, milestone: 'Can articulate system design decisions with tradeoffs in a 45-minute interview.' },
      { week_start: 5, week_end: 6, focus_area: 'TypeScript & Testing Depth', topics: ['Advanced TypeScript: generics, conditional types, mapped types', 'Testing strategy: unit, integration, E2E', 'Jest + Testing Library patterns', 'Code review best practices', 'Performance profiling in Node.js'], resources: [{ title: 'TypeScript Deep Dive (book)', url: 'https://basarat.gitbook.io/typescript/', type: 'Book' }, { title: 'Testing JavaScript with Kent C. Dodds', url: 'https://testingjavascript.com/', type: 'Course' }], project: { title: 'Full Test Suite', description: 'Add comprehensive tests to an existing Node.js project: unit, integration, and E2E with 80%+ coverage.', tech: ['TypeScript', 'Jest', 'Supertest', 'Playwright'], hours: 14 }, milestone: 'Can write idiomatic TypeScript and design a test pyramid for any project.' },
      { week_start: 7, week_end: 8, focus_area: 'Portfolio & Interview Preparation', topics: ['Behavioral interview STAR framework', 'Coding interview communication techniques', 'Take-home project strategy', 'Negotiation basics', 'Open source contribution'], project: { title: 'Open Source Contribution', description: 'Make a meaningful contribution to a popular open source project: bug fix, feature, or documentation.', tech: ['TypeScript', 'GitHub'], hours: 10 }, resources: [{ title: 'Tech Interview Handbook', url: 'https://www.techinterviewhandbook.org/', type: 'Docs' }, { title: 'Blind 75 Leetcode List', url: 'https://neetcode.io/practice', type: 'Docs' }], milestone: 'Ready for SWE interview loops at top companies. Portfolio shows technical depth and software quality.' },
    ],
  };
}

function makeProductManagerFixture(analysisId: string): AnalysisResult {
  const required = ['Product Strategy', 'Roadmapping', 'Stakeholder Management', 'User Research', 'Agile/Scrum', 'Data Analysis', 'SQL', 'Communication', 'A/B Testing', 'PRD Writing', 'Go-to-Market', 'Competitive Analysis'];
  const nice = ['Python', 'Figma', 'SQL Advanced', 'OKRs', 'Growth Frameworks', 'Product Analytics'];
  const { missing_critical, missing_nice, transferable, readiness_score } = computeGap(required, nice, 55);
  return {
    analysisId,
    targetRole: 'Product Manager',
    isDemoMode: true,
    createdAt: new Date().toISOString(),
    skillExtraction: { ...FICTIONAL_CANDIDATE },
    roleRequirements: {
      required_skills: required,
      nice_to_have: nice,
      categories: {
        technical: ['SQL', 'Data Analysis', 'A/B Testing', 'Product Analytics'],
        soft: ['Communication', 'Stakeholder Management', 'Empathy', 'Strategic Thinking'],
        tools: ['JIRA', 'Figma', 'Mixpanel', 'Confluence'],
        certifications: ['Product Management Certificate (Pragmatic Institute)', 'Google Product Manager Certificate'],
      },
      typical_timeline_months: 5,
      avg_salary: '$130,000',
    },
    gapAnalysis: {
      missing_critical,
      missing_nice,
      transferable,
      readiness_score,
      strengths_summary: 'Your technical background is a significant advantage in PM roles. SQL, Agile experience, and communication skills are directly applicable. Engineers who become PMs are highly valued for bridging the technical-business gap.',
      biggest_gap: 'Product strategy frameworks, PRD writing, and experience running the full product lifecycle from discovery to launch.',
    },
    roadmap: [
      { week_start: 1, week_end: 2, focus_area: 'PM Foundations & Frameworks', topics: ['Product discovery: Jobs to Be Done (JTBD)', 'Opportunity solution trees', 'PRD structure and writing', 'Prioritization: RICE, MoSCoW, Kano model', 'OKRs and outcome-based roadmaps'], resources: [{ title: 'Inspired (Marty Cagan)', url: 'https://www.svpg.com/inspired/', type: 'Book' }, { title: 'Lenny\'s Newsletter (Substack)', url: 'https://www.lennysnewsletter.com/', type: 'Article' }], project: { title: 'Product Critique', description: 'Write a 3-page product critique of a consumer app: strengths, gaps, proposed improvements with evidence.', tech: ['Notion', 'Figma'], hours: 8 }, milestone: 'Can articulate a product\'s user problems, business goals, and improvement hypothesis clearly.' },
      { week_start: 3, week_end: 4, focus_area: 'User Research & Metrics', topics: ['User interview techniques', 'Usability testing methods', 'Defining and tracking North Star metrics', 'A/B testing for product decisions', 'Funnel and cohort analysis in SQL'], resources: [{ title: 'The Mom Test (Rob Fitzpatrick)', url: 'https://www.momtestbook.com/', type: 'Book' }, { title: 'Mixpanel Product Analytics', url: 'https://mixpanel.com/blog/', type: 'Docs' }], project: { title: 'User Research Sprint', description: 'Recruit and interview 5 users about a product problem. Synthesize findings into themes and recommendations.', tech: ['Notion', 'Calendly', 'Miro'], hours: 10 }, milestone: 'Can run a research sprint, extract insights, and translate them into product decisions with data.' },
      { week_start: 5, week_end: 6, focus_area: 'SQL & Product Analytics', topics: ['SQL for product: funnels, retention, DAU/MAU', 'Cohort analysis queries', 'AB test significance calculation', 'Defining and tracking metrics in Amplitude/Mixpanel'], resources: [{ title: 'Mode Analytics SQL for Product', url: 'https://mode.com/sql-tutorial/', type: 'Course' }, { title: 'Amplitude Analytics Academy', url: 'https://academy.amplitude.com/', type: 'Course' }], project: { title: 'SQL Product Analysis', description: 'Analyze a sample product database: calculate 7-day retention, funnel conversion, and feature adoption rate.', tech: ['SQL', 'PostgreSQL', 'Python'], hours: 10 }, milestone: 'Can pull product metrics independently and identify meaningful signals without an analyst.' },
      { week_start: 7, week_end: 8, focus_area: 'Roadmapping & Stakeholder Management', topics: ['Stakeholder alignment techniques', 'Negotiating priorities with engineering', 'Go-to-Market planning basics', 'Managing up: executive communication', 'Technical debt and PM responsibilities'], resources: [{ title: 'Continuous Discovery Habits (Teresa Torres)', url: 'https://www.producttalk.org/continuous-discovery-habits/', type: 'Book' }, { title: 'Product School YouTube', url: 'https://www.youtube.com/@ProductSchool', type: 'Video' }], project: { title: 'Full Product Roadmap', description: 'Build a 6-month outcome-based roadmap with RICE prioritization, stakeholder communication plan, and launch checklist.', tech: ['Notion', 'Figma', 'Linear'], hours: 10 }, milestone: 'Can align cross-functional stakeholders, communicate decisions clearly, and manage a product roadmap.' },
      { week_start: 9, week_end: 10, focus_area: 'Capstone & PM Interview Prep', topics: ['PM interview case study frameworks', 'Estimation questions (market sizing)', 'Behavioral questions for PMs', 'Figma basics for mocking ideas', 'APM and RPM program applications'], resources: [{ title: 'Cracking the PM Interview', url: 'https://www.crackingthepminterview.com/', type: 'Book' }, { title: 'Exponent PM Interview Practice', url: 'https://www.tryexponent.com/', type: 'Course' }], project: { title: 'PM Portfolio Case Study', description: 'Build a 2-page case study of a product you would build: problem, users, solution, metrics, roadmap.', tech: ['Notion', 'Figma'], hours: 12 }, milestone: 'Ready for PM interview loops. Can handle product design, estimation, strategy, and behavioral questions.' },
    ],
  };
}

function makeIBAFixture(analysisId: string): AnalysisResult {
  const required = ['Financial Modeling', 'Excel', 'DCF Valuation', 'LBO Modeling', 'Comparable Analysis', 'Accounting', 'PowerPoint', 'Bloomberg Terminal', 'Communication', 'Attention to Detail', 'SQL', 'Capital Markets'];
  const nice = ['Python', 'VBA', 'Capital IQ', 'Factset', 'CFA Level 1', 'FactSet'];
  const { missing_critical, missing_nice, transferable, readiness_score } = computeGap(required, nice, 42);
  return {
    analysisId,
    targetRole: 'Investment Banking Analyst',
    isDemoMode: true,
    createdAt: new Date().toISOString(),
    skillExtraction: { ...FICTIONAL_CANDIDATE },
    roleRequirements: {
      required_skills: required,
      nice_to_have: nice,
      categories: {
        technical: ['Financial Modeling', 'DCF', 'LBO', 'Comparable Analysis', 'Accounting'],
        soft: ['Communication', 'Attention to Detail', 'Work Ethic', 'Presentation Skills'],
        tools: ['Excel', 'Bloomberg', 'PowerPoint', 'Capital IQ'],
        certifications: ['SIE Exam', 'CFA Level 1', 'FMVA (CFI)'],
      },
      typical_timeline_months: 7,
      avg_salary: '$95,000 base + significant bonus',
    },
    gapAnalysis: {
      missing_critical,
      missing_nice,
      transferable,
      readiness_score,
      strengths_summary: 'Your analytical background and SQL skills are genuine advantages. Quantitative problem-solving from software engineering translates to financial modeling. Attention to detail from debugging code is directly applicable.',
      biggest_gap: 'Financial modeling skills (DCF, LBO, 3-statement models) and accounting fundamentals are the primary barriers, and they require significant dedicated study.',
    },
    roadmap: [
      { week_start: 1, week_end: 2, focus_area: 'Accounting & Finance Foundations', topics: ['Three financial statements (IS, BS, CF)', 'Accounting equations and journal entries', 'Working capital and cash flow analysis', 'Financial ratio analysis', 'Time value of money (NPV, IRR)'], resources: [{ title: 'Accounting Principles (OpenStax)', url: 'https://openstax.org/books/principles-financial-accounting/pages/1-introduction', type: 'Book' }, { title: 'Khan Academy Finance', url: 'https://www.khanacademy.org/economics-finance-domain/core-finance', type: 'Course' }], project: { title: 'Public Company Financial Analysis', description: 'Analyze a public company\'s 10-K: reconstruct the 3 financial statements, compute key ratios, and write a 1-page thesis.', tech: ['Excel', 'SEC EDGAR'], hours: 12 }, milestone: 'Can read and interpret financial statements and explain the relationship between all three.' },
      { week_start: 3, week_end: 4, focus_area: 'Excel & Financial Modeling', topics: ['Excel for finance: shortcuts, INDEX/MATCH, arrays', 'Three-statement model construction', 'Assumptions and drivers best practices', 'Sensitivity tables and scenario analysis', 'Error-checking models'], resources: [{ title: 'Wall Street Prep - Excel Crash Course', url: 'https://www.wallstreetprep.com/knowledge/excel-shortcuts/', type: 'Course' }, { title: 'CFI Free Financial Modeling Courses', url: 'https://corporatefinanceinstitute.com/resources/excel/', type: 'Course' }], project: { title: '3-Statement Financial Model', description: 'Build a fully integrated 3-statement model from scratch: IS, BS, and CF with working capital schedules.', tech: ['Excel'], hours: 20 }, milestone: 'Can build a 3-statement model from scratch with proper structure, formulas, and error checks.' },
      { week_start: 5, week_end: 6, focus_area: 'Valuation Methodologies', topics: ['DCF: unlevered free cash flow, WACC', 'Comparable companies analysis (trading comps)', 'Precedent transaction analysis (deal comps)', 'Football field valuation summary', 'Enterprise value vs equity value'], resources: [{ title: 'Investment Banking (Rosenbaum & Pearl)', url: 'https://www.wiley.com/en-us/Investment+Banking%3A+Valuation%2C+LBOs%2C+M%26A%2C+and+IPOs-p-9781119706008', type: 'Book' }, { title: 'WSP DCF Modeling Course', url: 'https://www.wallstreetprep.com/self-study-programs/premium-package/', type: 'Course' }], project: { title: 'Full Valuation Analysis', description: 'Build a DCF + comps valuation for a mid-cap company and present a football field chart.', tech: ['Excel', 'Capital IQ'], hours: 20 }, milestone: 'Can value a company using 3 methodologies and present the results in an IB-quality format.' },
      { week_start: 7, week_end: 8, focus_area: 'LBO Modeling & M&A', topics: ['LBO model mechanics and return analysis', 'Sources and uses of funds', 'M&A deal structure basics', 'Accretion/dilution analysis', 'Deal process overview'], resources: [{ title: 'Wall Street Prep LBO Tutorial', url: 'https://www.wallstreetprep.com/knowledge/lbo-model/', type: 'Docs' }, { title: 'Mergers & Inquisitions (Breaking Into Wall Street)', url: 'https://breakingintowallstreet.com/', type: 'Course' }], project: { title: 'LBO Model', description: 'Build a leveraged buyout model for a hypothetical deal with debt paydown, return analysis, and sensitivity tables.', tech: ['Excel'], hours: 20 }, milestone: 'Can build an LBO model from scratch and analyze returns under different leverage and exit scenarios.' },
      { week_start: 9, week_end: 10, focus_area: 'PowerPoint & Pitchbooks', topics: ['Pitchbook structure and best practices', 'PowerPoint for finance: table of contents, tombstones', 'Presenting financial analysis clearly', 'Capital markets overview slides', 'Proofreading and quality control'], resources: [{ title: 'Wall Street Oasis Pitchbook Template', url: 'https://www.wallstreetoasis.com/', type: 'Docs' }, { title: 'Mergers & Inquisitions Pitchbook', url: 'https://mergersandinquisitions.com/investment-banking-pitchbook/', type: 'Docs' }], project: { title: 'Sample Pitchbook', description: 'Build a 15-slide pitchbook for a hypothetical M&A deal: situation overview, valuation, deal rationale.', tech: ['PowerPoint', 'Excel'], hours: 14 }, milestone: 'Can produce IB-quality presentation materials independently.' },
      { week_start: 11, week_end: 14, focus_area: 'Networking & Interview Preparation', topics: ['IB interview: technical questions (accounting, valuation, modeling)', 'Behavioral questions for finance', 'Cold email and LinkedIn networking', 'Superday preparation', 'SIE exam study plan'], resources: [{ title: 'Vault Guide to Investment Banking', url: 'https://www.vault.com/', type: 'Book' }, { title: 'WSO Investment Banking Interview Guide', url: 'https://www.wallstreetoasis.com/resources/interviews/investment-banking-interview-questions', type: 'Docs' }], project: { title: 'IB Interview Packet', description: 'Complete 100 technical IB interview questions in writing. Record and review 5 behavioral answers.', tech: ['Notion', 'Excel'], hours: 20 }, milestone: 'Ready for IB superday interviews. Can handle accounting, valuation, deal structure, and behavioral questions fluently.' },
    ],
  };
}

function makeMLEngineerFixture(analysisId: string): AnalysisResult {
  const required = ['Python', 'PyTorch/TensorFlow', 'Machine Learning', 'MLOps', 'SQL', 'Docker', 'REST APIs', 'Git', 'Model Deployment', 'Feature Engineering', 'Statistics', 'Data Pipelines'];
  const nice = ['Kubernetes', 'Spark', 'Airflow', 'MLflow', 'Ray', 'AWS SageMaker', 'Transformers/HuggingFace'];
  const { missing_critical, missing_nice, transferable, readiness_score } = computeGap(required, nice, 60);
  return {
    analysisId,
    targetRole: 'Machine Learning Engineer',
    isDemoMode: true,
    createdAt: new Date().toISOString(),
    skillExtraction: { ...FICTIONAL_CANDIDATE },
    roleRequirements: {
      required_skills: required,
      nice_to_have: nice,
      categories: {
        technical: ['Python', 'PyTorch', 'Machine Learning', 'MLOps', 'Statistics', 'Docker'],
        soft: ['Problem Solving', 'Communication', 'Systems Thinking'],
        tools: ['MLflow', 'Docker', 'Airflow', 'SageMaker'],
        certifications: ['AWS Certified Machine Learning Specialty', 'TensorFlow Developer Certificate'],
      },
      typical_timeline_months: 7,
      avg_salary: '$145,000',
    },
    gapAnalysis: {
      missing_critical,
      missing_nice,
      transferable,
      readiness_score,
      strengths_summary: 'Your Python, Node.js, SQL, Docker, and REST API experience maps directly to ML engineering. Software engineering discipline (testing, versioning, CI/CD) is exactly what separates ML engineers from data scientists.',
      biggest_gap: 'Deep learning frameworks (PyTorch/TensorFlow), MLOps tooling (MLflow, feature stores), and experience taking models from experiment to production.',
    },
    roadmap: [
      { week_start: 1, week_end: 2, focus_area: 'ML Foundations with Python', topics: ['Linear algebra and calculus for ML (practical overview)', 'Probability and statistics fundamentals', 'scikit-learn: supervised and unsupervised learning', 'Model evaluation metrics', 'pandas for feature engineering'], resources: [{ title: 'fast.ai Practical Deep Learning (Part 1)', url: 'https://course.fast.ai/', type: 'Course' }, { title: '3Blue1Brown: Essence of Calculus', url: 'https://www.youtube.com/watch?v=WUvTyaaNkzM', type: 'Video' }], project: { title: 'Classical ML Benchmark', description: 'Train and compare 5 classifiers on a Kaggle dataset using scikit-learn. Write a model selection report.', tech: ['Python', 'scikit-learn', 'pandas', 'Jupyter'], hours: 12 }, milestone: 'Understands core ML algorithms, can train and evaluate models, and knows when each is appropriate.' },
      { week_start: 3, week_end: 4, focus_area: 'PyTorch & Deep Learning', topics: ['PyTorch tensors and autograd', 'Building and training neural networks', 'CNNs for vision tasks', 'Transfer learning with pretrained models', 'Debugging training failures'], resources: [{ title: 'PyTorch Official Tutorials', url: 'https://pytorch.org/tutorials/', type: 'Docs' }, { title: 'Stanford CS231n (YouTube)', url: 'https://www.youtube.com/playlist?list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv', type: 'Video' }], project: { title: 'Image Classifier', description: 'Build a CNN from scratch in PyTorch, then fine-tune a ResNet to exceed 95% on CIFAR-10.', tech: ['PyTorch', 'Python', 'CUDA'], hours: 18 }, milestone: 'Can implement, train, and debug neural networks in PyTorch. Understands forward pass, loss, backpropagation.' },
      { week_start: 5, week_end: 6, focus_area: 'NLP & Transformers', topics: ['Transformer architecture (attention mechanisms)', 'HuggingFace Transformers library', 'Fine-tuning BERT/GPT for downstream tasks', 'Tokenization and preprocessing', 'Prompt engineering fundamentals'], resources: [{ title: 'HuggingFace NLP Course', url: 'https://huggingface.co/learn/nlp-course/chapter1/1', type: 'Course' }, { title: 'Illustrated Transformer (Jay Alammar)', url: 'https://jalammar.github.io/illustrated-transformer/', type: 'Docs' }], project: { title: 'Fine-tuned NLP Model', description: 'Fine-tune DistilBERT for sentiment classification and serve it via a FastAPI endpoint.', tech: ['PyTorch', 'HuggingFace', 'FastAPI'], hours: 16 }, milestone: 'Can apply transformer models to practical NLP tasks and serve predictions via an API.' },
      { week_start: 7, week_end: 8, focus_area: 'MLOps & Model Serving', topics: ['MLflow: experiment tracking, model registry', 'Model serving with TorchServe/FastAPI/BentoML', 'Docker for ML applications', 'Feature stores (intro)', 'CI/CD for ML pipelines'], resources: [{ title: 'MLflow Documentation', url: 'https://mlflow.org/docs/latest/index.html', type: 'Docs' }, { title: 'Full Stack Deep Learning 2022', url: 'https://fullstackdeeplearning.com/course/2022/', type: 'Course' }], project: { title: 'MLOps Pipeline', description: 'Build a full MLOps pipeline: experiment tracking with MLflow, containerized model server, and GitHub Actions CI.', tech: ['MLflow', 'Docker', 'FastAPI', 'GitHub Actions'], hours: 18 }, milestone: 'Can package, track, and serve ML models in production with proper versioning and CI.' },
      { week_start: 9, week_end: 10, focus_area: 'Data Pipelines & Feature Engineering', topics: ['ETL with Python and Airflow', 'Feature store patterns', 'Data versioning with DVC', 'Batch vs online inference', 'Model monitoring and data drift'], resources: [{ title: 'Apache Airflow Documentation', url: 'https://airflow.apache.org/docs/', type: 'Docs' }, { title: 'DVC Documentation', url: 'https://dvc.org/doc', type: 'Docs' }], project: { title: 'Feature Engineering Pipeline', description: 'Build an Airflow DAG that computes features, stores them, and triggers model retraining on new data.', tech: ['Airflow', 'Python', 'PostgreSQL', 'DVC'], hours: 16 }, milestone: 'Can design and maintain ML data pipelines with feature versioning and scheduled retraining.' },
      { week_start: 11, week_end: 12, focus_area: 'AWS ML & System Design', topics: ['SageMaker for training and deployment', 'AWS Lambda for serverless inference', 'Designing ML systems at scale', 'Model latency and throughput optimization', 'ML system design interview prep'], resources: [{ title: 'AWS ML Specialty Exam Guide', url: 'https://aws.amazon.com/certification/certified-machine-learning-specialty/', type: 'Docs' }, { title: 'Designing Machine Learning Systems (Chip Huyen)', url: 'https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/', type: 'Book' }], project: { title: 'Cloud-Deployed ML System', description: 'Deploy a model to AWS SageMaker with autoscaling, A/B testing, and CloudWatch monitoring.', tech: ['AWS', 'SageMaker', 'Python', 'Docker'], hours: 18 }, milestone: 'Can design and deploy ML systems at scale on AWS. Ready for ML system design interviews.' },
      { week_start: 13, week_end: 14, focus_area: 'Capstone & Interview Prep', topics: ['ML interview: coding + ML theory + system design', 'Take-home project strategy', 'Contributing to open source ML projects', 'TensorFlow vs PyTorch in production', 'AWS ML Specialty exam prep'], resources: [{ title: 'ML Interview Prep (GitHub)', url: 'https://github.com/khangich/machine-learning-interview', type: 'Docs' }, { title: 'Ace the ML Interview (Chip Huyen)', url: 'https://huyenchip.com/ml-interviews-book/', type: 'Book' }], project: { title: 'End-to-End ML Portfolio Project', description: 'Build and deploy a complete ML system: data pipeline, model training with MLflow, FastAPI serving, monitoring, and documentation.', tech: ['PyTorch', 'MLflow', 'FastAPI', 'Docker', 'AWS'], hours: 24 }, milestone: 'Portfolio-ready ML engineer. Can handle coding, ML theory, and system design questions in MLE loops.' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Catalog ID → curated fixture builder
// ---------------------------------------------------------------------------
const CURATED_BUILDERS: Record<string, (id: string) => AnalysisResult> = {
  'devops-engineer': makeDevOpsFixture,
  'data-scientist': makeDataScientistFixture,
  'software-engineer': makeSoftwareEngineerFixture,
  'product-manager': makeProductManagerFixture,
  'investment-banking-analyst': makeIBAFixture,
  'ml-engineer': makeMLEngineerFixture,
};

// ---------------------------------------------------------------------------
// Metadata-driven fixture builder (for roles with metadata but no full fixture)
// ---------------------------------------------------------------------------
function buildFromMetadata(analysisId: string, roleTitle: string, meta: RoleMetadata): AnalysisResult {
  const { missing_critical, missing_nice, transferable, readiness_score } = computeGap(
    meta.required_skills,
    meta.nice_to_have
  );

  const roadmap: RoadmapWeek[] = meta.roadmap_phases.map((phase, i) => ({
    week_start: i * 3 + 1,
    week_end: i * 3 + 3,
    focus_area: phase.focus_area,
    topics: phase.topics,
    resources: [
      { title: `${phase.focus_area}: Official Documentation`, url: 'https://developer.mozilla.org/', type: 'Docs' as const },
      { title: `${phase.focus_area}: Beginner to Advanced (YouTube)`, url: 'https://www.youtube.com/', type: 'Video' as const },
    ],
    project: {
      title: phase.project_title,
      description: phase.project_description,
      tech: phase.tech,
      hours: 14,
    },
    milestone: `Proficient in ${phase.focus_area.toLowerCase()}.`,
  }));

  return {
    analysisId,
    targetRole: roleTitle,
    isDemoMode: true,
    createdAt: new Date().toISOString(),
    skillExtraction: { ...FICTIONAL_CANDIDATE },
    roleRequirements: {
      required_skills: meta.required_skills,
      nice_to_have: meta.nice_to_have,
      categories: meta.categories,
      typical_timeline_months: meta.typical_timeline_months,
      avg_salary: meta.avg_salary,
    },
    gapAnalysis: {
      missing_critical,
      missing_nice,
      transferable,
      readiness_score,
      strengths_summary: meta.strengths_summary,
      biggest_gap: meta.biggest_gap,
    },
    roadmap,
  };
}

// ---------------------------------------------------------------------------
// Role ID normalization helpers
// ---------------------------------------------------------------------------

// Map role IDs from lib/roles.ts that should delegate to a different curated fixture
const ROLE_ID_ALIASES: Record<string, string> = {
  'senior-software-engineer': 'software-engineer',
  'staff-engineer': 'software-engineer',
  'junior-software-engineer': 'software-engineer',
  'software-engineer-intern': 'software-engineer',
  'senior-data-scientist': 'data-scientist',
  'senior-ml-engineer': 'ml-engineer',
  'ai-engineer': 'ml-engineer',
  'senior-devops-engineer': 'devops-engineer',
  'platform-engineer': 'devops-engineer',
  'senior-product-manager': 'product-manager',
  'associate-product-manager': 'product-manager',
  'junior-product-manager': 'product-manager',
};

// Map role IDs to metadata keys
const ROLE_ID_TO_METADATA: Record<string, string> = {
  'frontend-developer': 'frontend-developer',
  'backend-developer': 'backend-developer',
  'full-stack-developer': 'full-stack-developer',
  'data-engineer': 'data-engineer',
  'data-analyst': 'data-analyst',
  'ux-designer': 'ux-designer',
  'ui-designer': 'ux-designer',
  'product-designer': 'ux-designer',
  'cloud-architect': 'cloud-architect',
  'solutions-architect': 'cloud-architect',
  'site-reliability-engineer': 'site-reliability-engineer',
  'cybersecurity-analyst': 'cybersecurity-analyst',
  'security-analyst': 'cybersecurity-analyst',
  'security-engineer': 'security-engineer',
  'penetration-tester': 'security-engineer',
  'financial-analyst': 'financial-analyst',
  'technical-program-manager': 'technical-program-manager',
  'program-manager': 'technical-program-manager',
  'growth-engineer': 'growth-engineer',
  'growth-hacker': 'growth-engineer',
};

// ---------------------------------------------------------------------------
// Main exported builder
// ---------------------------------------------------------------------------
// Pre-normalize common role titles that aren't in the catalog verbatim
// but should map to a catalog entry we have metadata for.
const QUERY_PRE_NORMALIZE: Record<string, string> = {
  'technical program manager': 'program manager',
  'tpm': 'program manager',
  'technical program management': 'program manager',
  'growth engineer': 'growth hacker',
  'growth marketing engineer': 'growth hacker',
};

function findBestRoleMatch(query: string) {
  const q = query.toLowerCase().trim();
  const normalizedQuery = QUERY_PRE_NORMALIZE[q] ?? query;
  const matches = searchRoles(normalizedQuery);
  if (matches.length === 0) return null;
  const nq = normalizedQuery.toLowerCase().trim();
  // Prefer exact title match, then exact alias match, then first partial
  return (
    matches.find((r) => r.title.toLowerCase() === nq) ??
    matches.find((r) => r.aliases?.some((a) => a.toLowerCase() === nq)) ??
    matches[0]
  );
}

export function buildDemoAnalysis(analysisId: string, targetRole: string): AnalysisResult | null {
  // 1. Try to find the role in the catalog
  const topMatch = findBestRoleMatch(targetRole);

  if (!topMatch) {
    return null;
  }

  const roleId = topMatch.id;
  const resolvedId = ROLE_ID_ALIASES[roleId] ?? roleId;

  // 2. Curated fixture?
  const curatedBuilder = CURATED_BUILDERS[resolvedId];
  if (curatedBuilder) {
    return curatedBuilder(analysisId);
  }

  // 3. Metadata-driven?
  const metaKey = ROLE_ID_TO_METADATA[resolvedId] ?? ROLE_ID_TO_METADATA[roleId];
  const meta = metaKey ? ROLE_METADATA[metaKey] : undefined;
  if (meta) {
    return buildFromMetadata(analysisId, topMatch.title, meta);
  }

  // 4. No deterministic sample available for this role
  return null;
}
