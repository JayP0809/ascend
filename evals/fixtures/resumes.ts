// Synthetic resume fixtures for AI evaluation.
// These contain no real personal information.
// All details are fabricated for testing purposes only.

export interface ResumeFixture {
  id: string;
  description: string;
  text: string;
  expectedSkills: string[];       // skills that should definitely be extracted
  unexpectedSkills: string[];     // skills NOT in resume — should not appear
  expectedExperienceRange: [number, number]; // [min, max] years
}

export const RESUME_FIXTURES: ResumeFixture[] = [
  {
    id: 'junior-swe',
    description: 'Junior software engineer with 2 years experience, Python and React focus',
    text: `
Alex Rivera
Software Engineer | alex.rivera@example.com

EXPERIENCE
Junior Software Engineer — TechCorp Inc. (2022–2024)
- Built REST APIs using Python and FastAPI
- Developed frontend features using React and TypeScript
- Wrote unit tests using pytest
- Used Git for version control and GitHub Actions for CI/CD
- Worked in Agile sprints with daily standups

EDUCATION
B.S. Computer Science — State University (2022)

SKILLS
Languages: Python, JavaScript, TypeScript, SQL
Frameworks: React, FastAPI, Node.js
Tools: Git, GitHub Actions, Docker (basic), PostgreSQL
Soft Skills: Communication, Problem Solving, Teamwork
    `.trim(),
    expectedSkills: ['Python', 'React', 'TypeScript', 'SQL', 'Git', 'Docker', 'FastAPI'],
    unexpectedSkills: ['Kubernetes', 'Terraform', 'Machine Learning', 'Java'],
    expectedExperienceRange: [1, 3],
  },
  {
    id: 'data-analyst',
    description: 'Data analyst with 4 years, SQL and Python heavy, no ML',
    text: `
Jordan Chen
Data Analyst | jordan.chen@example.com

EXPERIENCE
Senior Data Analyst — RetailCo (2020–2024)
- Wrote complex SQL queries against PostgreSQL and BigQuery (100M+ row tables)
- Built dashboards in Tableau and Looker for executive reporting
- Automated ETL pipelines using Python (pandas, numpy)
- Conducted A/B test analysis using statistical hypothesis testing
- Collaborated with product teams to define KPIs and success metrics

Data Analyst Intern — StartupXYZ (2019–2020)
- Analyzed customer behavior data using Excel and Python
- Created weekly performance reports

EDUCATION
B.S. Statistics — City University (2019)

SKILLS
Languages: SQL, Python
Libraries: pandas, numpy, matplotlib
BI Tools: Tableau, Looker, Google Data Studio
Databases: PostgreSQL, BigQuery, MySQL
Other: A/B testing, Excel, Git
    `.trim(),
    expectedSkills: ['SQL', 'Python', 'Tableau', 'pandas', 'PostgreSQL', 'A/B testing'],
    unexpectedSkills: ['React', 'Docker', 'Kubernetes', 'TensorFlow', 'Java'],
    expectedExperienceRange: [3, 6],
  },
  {
    id: 'cs-student-intern',
    description: 'CS student (junior year), 1 internship, Python and Java focus',
    text: `
Taylor Kim
Computer Science Student | taylor.kim@example.edu

EDUCATION
B.S. Computer Science — State University (Expected 2026, GPA 3.7)
Relevant coursework: Data Structures, Algorithms, Operating Systems, Databases, Web Development

EXPERIENCE
Software Engineering Intern — SmallStartup (Summer 2024)
- Built a REST API endpoint using Python and Flask
- Fixed 5 bugs in the existing Java codebase
- Wrote unit tests with pytest

PROJECTS
To-Do App (Personal Project, 2024)
- Full-stack web app: Python/Flask backend, HTML/CSS/JavaScript frontend
- Deployed on Heroku using basic Docker container

SKILLS
Languages: Python, Java, JavaScript, SQL (basic)
Tools: Git, GitHub, VS Code
Soft: Problem Solving, Quick Learner, Teamwork
    `.trim(),
    expectedSkills: ['Python', 'Java', 'JavaScript', 'SQL', 'Git', 'Flask', 'Docker'],
    unexpectedSkills: ['Kubernetes', 'React', 'TensorFlow', 'AWS', 'TypeScript'],
    expectedExperienceRange: [0, 2],
  },
  {
    id: 'ml-engineer',
    description: 'ML engineer with 5 years, PyTorch and Python, some cloud',
    text: `
Sam Patel
Machine Learning Engineer | sam.patel@example.com

EXPERIENCE
ML Engineer — AIStartup (2021–2024)
- Trained and deployed NLP models using PyTorch and HuggingFace Transformers
- Built ML pipelines using Apache Airflow and MLflow for experiment tracking
- Deployed models to AWS SageMaker and Lambda
- Wrote Python services wrapping model inference endpoints (FastAPI)
- Maintained feature store using Redis and S3

Data Scientist — DataCo (2019–2021)
- Built predictive models using scikit-learn (regression, classification, XGBoost)
- Performed feature engineering on structured datasets
- Presented findings to non-technical stakeholders

EDUCATION
M.S. Computer Science (ML concentration) — Tech University (2019)
B.S. Mathematics — Tech University (2017)

SKILLS
ML: PyTorch, scikit-learn, HuggingFace, XGBoost, MLflow
Languages: Python, SQL
Cloud: AWS (SageMaker, Lambda, S3), basic GCP
Tools: Airflow, Redis, Docker, Git
    `.trim(),
    expectedSkills: ['PyTorch', 'Python', 'scikit-learn', 'AWS', 'Docker', 'SQL', 'Airflow'],
    unexpectedSkills: ['React', 'Kubernetes', 'Java', 'Terraform'],
    expectedExperienceRange: [4, 7],
  },
];

export interface JobDescriptionFixture {
  id: string;
  targetRole: string;
  description: string;
  mustHaveSkills: string[];   // skills the role definitely requires
}

export const JOB_FIXTURES: JobDescriptionFixture[] = [
  {
    id: 'devops-engineer',
    targetRole: 'DevOps Engineer',
    description: 'Looking for a DevOps engineer with experience in Docker, Kubernetes, Terraform, and CI/CD pipelines. AWS experience required. Python scripting is a plus.',
    mustHaveSkills: ['Docker', 'Kubernetes', 'Terraform', 'AWS'],
  },
  {
    id: 'data-scientist',
    targetRole: 'Data Scientist',
    description: 'Data Scientist role requiring Python, SQL, machine learning with scikit-learn or PyTorch, and experience communicating results to stakeholders.',
    mustHaveSkills: ['Python', 'SQL', 'Machine Learning'],
  },
  {
    id: 'frontend-engineer',
    targetRole: 'Frontend Engineer',
    description: 'Frontend Engineer with React, TypeScript, and CSS expertise. Experience with testing frameworks and CI/CD pipelines preferred.',
    mustHaveSkills: ['React', 'TypeScript'],
  },
  // This fixture specifically exercises the truncation regression (phase-1a):
  // Frontend Developer has many required skills, producing a large
  // missing_critical list in gap analysis that previously caused roadmap
  // batch responses to exceed max_tokens=4096.
  {
    id: 'frontend-developer',
    targetRole: 'Frontend Developer',
    description: 'Frontend Developer with deep React, TypeScript, Next.js, and testing expertise. Must know CSS Grid, Flexbox, Webpack/Vite, and have CI/CD experience.',
    mustHaveSkills: ['React', 'TypeScript', 'Next.js', 'CSS'],
  },
  // Regression fixture for failure 1: Software Engineer returning non-canonical
  // demand_level values ("Very High", "High Demand") that broke schema validation.
  {
    id: 'software-engineer',
    targetRole: 'Software Engineer',
    description: 'Software Engineer with experience in Python, Java, or Go. Must have strong CS fundamentals, REST API design, and experience with cloud platforms.',
    mustHaveSkills: ['Python', 'REST APIs'],
  },
  // Regression fixture for failure 2: Software Engineering Intern triggering
  // truncation due to long missing_critical list and verbose internship output.
  // The employment-level classifier must detect this as internship.
  {
    id: 'software-engineering-intern',
    targetRole: 'Software Engineering Intern',
    description: 'Looking for a motivated Software Engineering Intern to join our team for a 12-week summer program. Seeking students currently enrolled in a Computer Science or related degree. No prior professional experience required.',
    mustHaveSkills: ['Python', 'Git'],
  },
  // Non-technology roles: verify the pipeline works for roles outside SWE.
  {
    id: 'product-manager',
    targetRole: 'Product Manager',
    description: 'Product Manager to own product roadmap, write PRDs, collaborate with engineering, and drive data-informed decisions. Experience with Agile, SQL, and stakeholder communication required.',
    mustHaveSkills: ['Agile', 'SQL'],
  },
  {
    id: 'marketing-analyst',
    targetRole: 'Marketing Analyst',
    description: 'Marketing Analyst to analyze campaign performance, build dashboards, and provide actionable insights. Proficiency in SQL, Excel, and Google Analytics required.',
    mustHaveSkills: ['SQL', 'Excel'],
  },
];
