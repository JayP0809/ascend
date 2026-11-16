import { Role } from './types';

export const ROLES: Role[] = [
  // Tech
  { id: 'software-engineer', title: 'Software Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$120,000', icon: 'Code2', requiredSkillCount: 18, aliases: ['SWE', 'software developer', 'software dev'] },
  { id: 'frontend-developer', title: 'Frontend Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$110,000', icon: 'Monitor', requiredSkillCount: 16, aliases: ['FE developer', 'front-end developer', 'frontend engineer', 'UI developer'] },
  { id: 'backend-developer', title: 'Backend Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$125,000', icon: 'Server', requiredSkillCount: 17, aliases: ['BE developer', 'back-end developer', 'backend engineer'] },
  { id: 'full-stack-developer', title: 'Full Stack Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$130,000', icon: 'Layers', requiredSkillCount: 22, aliases: ['fullstack', 'full-stack engineer'] },
  { id: 'devops-engineer', title: 'DevOps Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$135,000', icon: 'GitBranch', requiredSkillCount: 20, aliases: ['dev ops', 'infrastructure engineer', 'platform ops'] },
  { id: 'data-scientist', title: 'Data Scientist', industry: 'Tech', demandLevel: 'High', avgSalary: '$128,000', icon: 'BarChart2', requiredSkillCount: 19, aliases: ['DS', 'data science'] },
  { id: 'ml-engineer', title: 'ML Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$145,000', icon: 'Brain', requiredSkillCount: 21, aliases: ['MLE', 'machine learning engineer', 'AI/ML engineer'] },
  { id: 'cybersecurity-analyst', title: 'Cybersecurity Analyst', industry: 'Tech', demandLevel: 'High', avgSalary: '$115,000', icon: 'Shield', requiredSkillCount: 18, aliases: ['cyber security', 'infosec analyst', 'security analyst'] },
  { id: 'cloud-architect', title: 'Cloud Architect', industry: 'Tech', demandLevel: 'High', avgSalary: '$155,000', icon: 'Cloud', requiredSkillCount: 24, aliases: ['cloud engineer', 'solutions architect'] },
  { id: 'mobile-developer', title: 'Mobile Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$118,000', icon: 'Smartphone', requiredSkillCount: 17, aliases: ['iOS developer', 'Android developer', 'mobile engineer'] },
  { id: 'qa-engineer', title: 'QA Engineer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$95,000', icon: 'CheckSquare', requiredSkillCount: 14, aliases: ['quality assurance engineer', 'test engineer', 'SDET'] },
  { id: 'data-engineer', title: 'Data Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$132,000', icon: 'Database', requiredSkillCount: 20, aliases: ['DE', 'data infrastructure engineer'] },
  { id: 'ai-engineer', title: 'AI Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$150,000', icon: 'Cpu', requiredSkillCount: 22, aliases: ['artificial intelligence engineer', 'generative AI engineer'] },
  { id: 'product-manager', title: 'Product Manager', industry: 'Tech', demandLevel: 'High', avgSalary: '$140,000', icon: 'Target', requiredSkillCount: 15, aliases: ['PM', 'product'] },
  { id: 'ux-designer', title: 'UX Designer', industry: 'Tech', demandLevel: 'High', avgSalary: '$105,000', icon: 'Figma', requiredSkillCount: 16, aliases: ['UX', 'user experience designer', 'UX researcher'] },
  { id: 'ui-designer', title: 'UI Designer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$98,000', icon: 'Palette', requiredSkillCount: 14, aliases: ['UI', 'user interface designer'] },
  { id: 'site-reliability-engineer', title: 'Site Reliability Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$148,000', icon: 'Activity', requiredSkillCount: 22, aliases: ['SRE'] },
  { id: 'blockchain-developer', title: 'Blockchain Developer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$138,000', icon: 'Link', requiredSkillCount: 18, aliases: ['web3 developer', 'smart contract developer'] },
  { id: 'security-engineer', title: 'Security Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$140,000', icon: 'Lock', requiredSkillCount: 20 },
  { id: 'platform-engineer', title: 'Platform Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$142,000', icon: 'Box', requiredSkillCount: 21 },

  // Finance
  { id: 'investment-banking-analyst', title: 'Investment Banking Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$110,000', icon: 'TrendingUp', requiredSkillCount: 16, aliases: ['IB analyst', 'IBD analyst', 'investment banker'] },
  { id: 'financial-analyst', title: 'Financial Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$85,000', icon: 'DollarSign', requiredSkillCount: 14, aliases: ['FA', 'finance analyst'] },
  { id: 'portfolio-manager', title: 'Portfolio Manager', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$125,000', icon: 'PieChart', requiredSkillCount: 18 },
  { id: 'risk-analyst', title: 'Risk Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$95,000', icon: 'AlertTriangle', requiredSkillCount: 15 },
  { id: 'actuary', title: 'Actuary', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$108,000', icon: 'Calculator', requiredSkillCount: 17 },
  { id: 'accountant', title: 'Accountant', industry: 'Finance', demandLevel: 'High', avgSalary: '$75,000', icon: 'BookOpen', requiredSkillCount: 13 },
  { id: 'tax-analyst', title: 'Tax Analyst', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$80,000', icon: 'FileText', requiredSkillCount: 12 },
  { id: 'financial-planner', title: 'Financial Planner', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$90,000', icon: 'ClipboardList', requiredSkillCount: 14 },
  { id: 'hedge-fund-analyst', title: 'Hedge Fund Analyst', industry: 'Finance', demandLevel: 'Low', avgSalary: '$135,000', icon: 'TrendingUp', requiredSkillCount: 19 },
  { id: 'private-equity-associate', title: 'Private Equity Associate', industry: 'Finance', demandLevel: 'Low', avgSalary: '$145,000', icon: 'Briefcase', requiredSkillCount: 20 },
  { id: 'quantitative-analyst', title: 'Quantitative Analyst', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$140,000', icon: 'Function', requiredSkillCount: 22, aliases: ['quant', 'quant analyst', 'quantitative finance'] },

  // Business
  { id: 'management-consultant', title: 'Management Consultant', industry: 'Business', demandLevel: 'High', avgSalary: '$105,000', icon: 'Users', requiredSkillCount: 16, aliases: ['consultant', 'strategy consultant'] },
  { id: 'business-analyst', title: 'Business Analyst', industry: 'Business', demandLevel: 'High', avgSalary: '$88,000', icon: 'BarChart', requiredSkillCount: 14, aliases: ['BA', 'systems analyst'] },
  { id: 'operations-manager', title: 'Operations Manager', industry: 'Business', demandLevel: 'High', avgSalary: '$95,000', icon: 'Settings', requiredSkillCount: 15 },
  { id: 'supply-chain-analyst', title: 'Supply Chain Analyst', industry: 'Business', demandLevel: 'High', avgSalary: '$82,000', icon: 'Package', requiredSkillCount: 14 },
  { id: 'project-manager', title: 'Project Manager', industry: 'Business', demandLevel: 'High', avgSalary: '$98,000', icon: 'Calendar', requiredSkillCount: 15 },
  { id: 'strategy-analyst', title: 'Strategy Analyst', industry: 'Business', demandLevel: 'Medium', avgSalary: '$92,000', icon: 'Map', requiredSkillCount: 14 },
  { id: 'market-research-analyst', title: 'Market Research Analyst', industry: 'Business', demandLevel: 'Medium', avgSalary: '$75,000', icon: 'Search', requiredSkillCount: 13 },
  { id: 'program-manager', title: 'Program Manager', industry: 'Business', demandLevel: 'High', avgSalary: '$115,000', icon: 'Layout', requiredSkillCount: 16 },

  // Marketing
  { id: 'digital-marketing-manager', title: 'Digital Marketing Manager', industry: 'Marketing', demandLevel: 'High', avgSalary: '$85,000', icon: 'Megaphone', requiredSkillCount: 16 },
  { id: 'seo-specialist', title: 'SEO Specialist', industry: 'Marketing', demandLevel: 'High', avgSalary: '$65,000', icon: 'Search', requiredSkillCount: 12 },
  { id: 'content-strategist', title: 'Content Strategist', industry: 'Marketing', demandLevel: 'Medium', avgSalary: '$72,000', icon: 'FileText', requiredSkillCount: 13 },
  { id: 'social-media-manager', title: 'Social Media Manager', industry: 'Marketing', demandLevel: 'High', avgSalary: '$60,000', icon: 'Share2', requiredSkillCount: 12 },
  { id: 'growth-hacker', title: 'Growth Hacker', industry: 'Marketing', demandLevel: 'High', avgSalary: '$95,000', icon: 'Zap', requiredSkillCount: 15 },
  { id: 'brand-manager', title: 'Brand Manager', industry: 'Marketing', demandLevel: 'Medium', avgSalary: '$88,000', icon: 'Award', requiredSkillCount: 14 },
  { id: 'marketing-analytics-manager', title: 'Marketing Analytics Manager', industry: 'Marketing', demandLevel: 'High', avgSalary: '$98,000', icon: 'BarChart2', requiredSkillCount: 16 },
  { id: 'email-marketing-specialist', title: 'Email Marketing Specialist', industry: 'Marketing', demandLevel: 'Medium', avgSalary: '$62,000', icon: 'Mail', requiredSkillCount: 11 },
  { id: 'performance-marketing-manager', title: 'Performance Marketing Manager', industry: 'Marketing', demandLevel: 'High', avgSalary: '$95,000', icon: 'TrendingUp', requiredSkillCount: 15 },

  // Healthcare
  { id: 'healthcare-administrator', title: 'Healthcare Administrator', industry: 'Healthcare', demandLevel: 'High', avgSalary: '$82,000', icon: 'Heart', requiredSkillCount: 14 },
  { id: 'clinical-data-analyst', title: 'Clinical Data Analyst', industry: 'Healthcare', demandLevel: 'High', avgSalary: '$88,000', icon: 'Activity', requiredSkillCount: 15 },
  { id: 'health-informatics-specialist', title: 'Health Informatics Specialist', industry: 'Healthcare', demandLevel: 'High', avgSalary: '$95,000', icon: 'Database', requiredSkillCount: 16 },
  { id: 'medical-coder', title: 'Medical Coder', industry: 'Healthcare', demandLevel: 'Medium', avgSalary: '$55,000', icon: 'FileText', requiredSkillCount: 11 },
  { id: 'biomedical-engineer', title: 'Biomedical Engineer', industry: 'Healthcare', demandLevel: 'Medium', avgSalary: '$92,000', icon: 'Cpu', requiredSkillCount: 18 },

  // Legal
  { id: 'paralegal', title: 'Paralegal', industry: 'Legal', demandLevel: 'Medium', avgSalary: '$58,000', icon: 'Scale', requiredSkillCount: 12 },
  { id: 'legal-analyst', title: 'Legal Analyst', industry: 'Legal', demandLevel: 'Medium', avgSalary: '$75,000', icon: 'FileSearch', requiredSkillCount: 14 },
  { id: 'compliance-officer', title: 'Compliance Officer', industry: 'Legal', demandLevel: 'High', avgSalary: '$95,000', icon: 'ShieldCheck', requiredSkillCount: 15 },
  { id: 'legal-tech-specialist', title: 'Legal Tech Specialist', industry: 'Legal', demandLevel: 'High', avgSalary: '$98,000', icon: 'Code', requiredSkillCount: 16 },

  // HR
  { id: 'hr-coordinator', title: 'HR Coordinator', industry: 'HR', demandLevel: 'Medium', avgSalary: '$52,000', icon: 'Users', requiredSkillCount: 12 },
  { id: 'talent-acquisition-specialist', title: 'Talent Acquisition Specialist', industry: 'HR', demandLevel: 'High', avgSalary: '$68,000', icon: 'UserPlus', requiredSkillCount: 13 },
  { id: 'people-analytics', title: 'People Analytics Manager', industry: 'HR', demandLevel: 'High', avgSalary: '$105,000', icon: 'BarChart', requiredSkillCount: 17 },
  { id: 'hr-business-partner', title: 'HR Business Partner', industry: 'HR', demandLevel: 'High', avgSalary: '$88,000', icon: 'Handshake', requiredSkillCount: 15 },

  // Sales
  { id: 'account-executive', title: 'Account Executive', industry: 'Sales', demandLevel: 'High', avgSalary: '$85,000', icon: 'DollarSign', requiredSkillCount: 13 },
  { id: 'sales-operations', title: 'Sales Operations Manager', industry: 'Sales', demandLevel: 'High', avgSalary: '$92,000', icon: 'Settings', requiredSkillCount: 15 },
  { id: 'business-development-rep', title: 'Business Development Rep', industry: 'Sales', demandLevel: 'High', avgSalary: '$62,000', icon: 'TrendingUp', requiredSkillCount: 12 },
  { id: 'enterprise-sales-manager', title: 'Enterprise Sales Manager', industry: 'Sales', demandLevel: 'High', avgSalary: '$125,000', icon: 'Briefcase', requiredSkillCount: 16 },

  // Education
  { id: 'instructional-designer', title: 'Instructional Designer', industry: 'Education', demandLevel: 'Medium', avgSalary: '$72,000', icon: 'BookOpen', requiredSkillCount: 14 },
  { id: 'curriculum-developer', title: 'Curriculum Developer', industry: 'Education', demandLevel: 'Medium', avgSalary: '$68,000', icon: 'Edit', requiredSkillCount: 13 },
  { id: 'edtech-specialist', title: 'EdTech Specialist', industry: 'Education', demandLevel: 'High', avgSalary: '$78,000', icon: 'Monitor', requiredSkillCount: 15 },

  // Entrepreneurship
  { id: 'startup-founder', title: 'Startup Founder', industry: 'Entrepreneurship', demandLevel: 'High', avgSalary: '$95,000', icon: 'Rocket', requiredSkillCount: 25 },
  { id: 'product-owner', title: 'Product Owner', industry: 'Entrepreneurship', demandLevel: 'High', avgSalary: '$108,000', icon: 'Target', requiredSkillCount: 16 },
  { id: 'venture-analyst', title: 'Venture Analyst', industry: 'Entrepreneurship', demandLevel: 'Medium', avgSalary: '$92,000', icon: 'TrendingUp', requiredSkillCount: 17 },
  { id: 'chief-of-staff', title: 'Chief of Staff', industry: 'Entrepreneurship', demandLevel: 'Medium', avgSalary: '$115,000', icon: 'Star', requiredSkillCount: 18 },

  // Data & Analytics
  { id: 'data-analyst', title: 'Data Analyst', industry: 'Tech', demandLevel: 'High', avgSalary: '$82,000', icon: 'BarChart2', requiredSkillCount: 15 },
  { id: 'business-intelligence-analyst', title: 'Business Intelligence Analyst', industry: 'Tech', demandLevel: 'High', avgSalary: '$95,000', icon: 'PieChart', requiredSkillCount: 16 },
  { id: 'analytics-engineer', title: 'Analytics Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$118,000', icon: 'Database', requiredSkillCount: 18 },

  // Creative & Design
  { id: 'product-designer', title: 'Product Designer', industry: 'Tech', demandLevel: 'High', avgSalary: '$115,000', icon: 'Figma', requiredSkillCount: 17 },
  { id: 'motion-designer', title: 'Motion Designer', industry: 'Marketing', demandLevel: 'Medium', avgSalary: '$82,000', icon: 'Play', requiredSkillCount: 14 },
  { id: 'graphic-designer', title: 'Graphic Designer', industry: 'Marketing', demandLevel: 'Medium', avgSalary: '$62,000', icon: 'Palette', requiredSkillCount: 12 },

  // Customer Success
  { id: 'customer-success-manager', title: 'Customer Success Manager', industry: 'Business', demandLevel: 'High', avgSalary: '$82,000', icon: 'HeartHandshake', requiredSkillCount: 14 },
  { id: 'solutions-engineer', title: 'Solutions Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$125,000', icon: 'Wrench', requiredSkillCount: 18 },

  // Additional Tech
  { id: 'react-developer', title: 'React Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$115,000', icon: 'Code2', requiredSkillCount: 16 },
  { id: 'python-developer', title: 'Python Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$118,000', icon: 'Terminal', requiredSkillCount: 16 },
  { id: 'golang-developer', title: 'Go Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$135,000', icon: 'Code', requiredSkillCount: 17 },
  { id: 'rust-developer', title: 'Rust Developer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$140,000', icon: 'Zap', requiredSkillCount: 18 },
  { id: 'embedded-engineer', title: 'Embedded Systems Engineer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$115,000', icon: 'Cpu', requiredSkillCount: 18 },
  { id: 'technical-writer', title: 'Technical Writer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$85,000', icon: 'FileText', requiredSkillCount: 12 },

  // Finance (new)
  { id: 'cpa', title: 'CPA (Certified Public Accountant)', industry: 'Finance', demandLevel: 'High', avgSalary: '$95,000', icon: 'BadgeCheck', requiredSkillCount: 16 },
  { id: 'wealth-manager', title: 'Wealth Manager', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$115,000', icon: 'Landmark', requiredSkillCount: 16 },
  { id: 'credit-analyst', title: 'Credit Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$78,000', icon: 'CreditCard', requiredSkillCount: 14 },
  { id: 'insurance-underwriter', title: 'Insurance Underwriter', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$75,000', icon: 'ShieldCheck', requiredSkillCount: 13 },
  { id: 'mortgage-loan-officer', title: 'Mortgage Loan Officer', industry: 'Finance', demandLevel: 'High', avgSalary: '$80,000', icon: 'Home', requiredSkillCount: 13 },
  { id: 'corporate-treasurer', title: 'Corporate Treasurer', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$138,000', icon: 'Building', requiredSkillCount: 18 },
  { id: 'budget-analyst', title: 'Budget Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$82,000', icon: 'Calculator', requiredSkillCount: 13 },
  { id: 'economist', title: 'Economist', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$118,000', icon: 'TrendingUp', requiredSkillCount: 18 },
  { id: 'commercial-banker', title: 'Commercial Banker', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$88,000', icon: 'Landmark', requiredSkillCount: 14 },
  { id: 'ma-analyst', title: 'Mergers & Acquisitions Analyst', industry: 'Finance', demandLevel: 'Low', avgSalary: '$125,000', icon: 'GitMerge', requiredSkillCount: 18 },

  // Medicine
  { id: 'registered-nurse', title: 'Registered Nurse', industry: 'Medicine', demandLevel: 'High', avgSalary: '$82,000', icon: 'Heart', requiredSkillCount: 18 },
  { id: 'nurse-practitioner', title: 'Nurse Practitioner', industry: 'Medicine', demandLevel: 'High', avgSalary: '$118,000', icon: 'Stethoscope', requiredSkillCount: 20 },
  { id: 'physician-assistant', title: 'Physician Assistant', industry: 'Medicine', demandLevel: 'High', avgSalary: '$122,000', icon: 'Stethoscope', requiredSkillCount: 20 },
  { id: 'pharmacist', title: 'Pharmacist', industry: 'Medicine', demandLevel: 'Medium', avgSalary: '$128,000', icon: 'Pill', requiredSkillCount: 18 },
  { id: 'physical-therapist', title: 'Physical Therapist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$92,000', icon: 'Activity', requiredSkillCount: 17 },
  { id: 'occupational-therapist', title: 'Occupational Therapist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$88,000', icon: 'HandMetal', requiredSkillCount: 16 },
  { id: 'dentist', title: 'Dentist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$158,000', icon: 'Smile', requiredSkillCount: 20 },
  { id: 'radiologic-technologist', title: 'Radiologic Technologist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$68,000', icon: 'ScanLine', requiredSkillCount: 15 },
  { id: 'medical-lab-scientist', title: 'Medical Laboratory Scientist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$62,000', icon: 'FlaskConical', requiredSkillCount: 16 },
  { id: 'psychiatrist', title: 'Psychiatrist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$220,000', icon: 'Brain', requiredSkillCount: 22 },
  { id: 'emergency-medicine-physician', title: 'Emergency Medicine Physician', industry: 'Medicine', demandLevel: 'High', avgSalary: '$350,000', icon: 'Zap', requiredSkillCount: 24 },
  { id: 'anesthesiologist', title: 'Anesthesiologist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$330,000', icon: 'Syringe', requiredSkillCount: 24 },
  { id: 'pediatrician', title: 'Pediatrician', industry: 'Medicine', demandLevel: 'High', avgSalary: '$185,000', icon: 'Baby', requiredSkillCount: 22 },
  { id: 'surgeon', title: 'Surgeon', industry: 'Medicine', demandLevel: 'High', avgSalary: '$380,000', icon: 'Scissors', requiredSkillCount: 26 },
  { id: 'cardiologist', title: 'Cardiologist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$430,000', icon: 'HeartPulse', requiredSkillCount: 26 },

  // Law
  { id: 'corporate-lawyer', title: 'Corporate Lawyer', industry: 'Law', demandLevel: 'High', avgSalary: '$175,000', icon: 'Scale', requiredSkillCount: 20 },
  { id: 'criminal-defense-attorney', title: 'Criminal Defense Attorney', industry: 'Law', demandLevel: 'Medium', avgSalary: '$95,000', icon: 'Gavel', requiredSkillCount: 18 },
  { id: 'patent-attorney', title: 'Patent Attorney', industry: 'Law', demandLevel: 'Medium', avgSalary: '$185,000', icon: 'Award', requiredSkillCount: 22 },
  { id: 'family-law-attorney', title: 'Family Law Attorney', industry: 'Law', demandLevel: 'High', avgSalary: '$88,000', icon: 'Users', requiredSkillCount: 16 },
  { id: 'immigration-attorney', title: 'Immigration Attorney', industry: 'Law', demandLevel: 'High', avgSalary: '$92,000', icon: 'Globe', requiredSkillCount: 17 },
  { id: 'real-estate-attorney', title: 'Real Estate Attorney', industry: 'Law', demandLevel: 'Medium', avgSalary: '$105,000', icon: 'Home', requiredSkillCount: 16 },
  { id: 'tax-attorney', title: 'Tax Attorney', industry: 'Law', demandLevel: 'Medium', avgSalary: '$145,000', icon: 'FileText', requiredSkillCount: 20 },
  { id: 'prosecutor', title: 'Prosecutor / District Attorney', industry: 'Law', demandLevel: 'Medium', avgSalary: '$78,000', icon: 'Gavel', requiredSkillCount: 18 },

  // Engineering
  { id: 'mechanical-engineer', title: 'Mechanical Engineer', industry: 'Engineering', demandLevel: 'High', avgSalary: '$95,000', icon: 'Cog', requiredSkillCount: 18 },
  { id: 'civil-engineer', title: 'Civil Engineer', industry: 'Engineering', demandLevel: 'High', avgSalary: '$88,000', icon: 'Building2', requiredSkillCount: 17 },
  { id: 'electrical-engineer', title: 'Electrical Engineer', industry: 'Engineering', demandLevel: 'High', avgSalary: '$102,000', icon: 'Zap', requiredSkillCount: 18 },
  { id: 'chemical-engineer', title: 'Chemical Engineer', industry: 'Engineering', demandLevel: 'Medium', avgSalary: '$108,000', icon: 'FlaskConical', requiredSkillCount: 18 },
  { id: 'aerospace-engineer', title: 'Aerospace Engineer', industry: 'Engineering', demandLevel: 'Medium', avgSalary: '$122,000', icon: 'Rocket', requiredSkillCount: 22 },
  { id: 'structural-engineer', title: 'Structural Engineer', industry: 'Engineering', demandLevel: 'Medium', avgSalary: '$92,000', icon: 'Building2', requiredSkillCount: 17 },
  { id: 'materials-engineer', title: 'Materials Engineer', industry: 'Engineering', demandLevel: 'Medium', avgSalary: '$98,000', icon: 'Layers', requiredSkillCount: 17 },
  { id: 'nuclear-engineer', title: 'Nuclear Engineer', industry: 'Engineering', demandLevel: 'Low', avgSalary: '$118,000', icon: 'Atom', requiredSkillCount: 22 },
  { id: 'environmental-engineer', title: 'Environmental Engineer', industry: 'Engineering', demandLevel: 'High', avgSalary: '$92,000', icon: 'Leaf', requiredSkillCount: 17 },
  { id: 'industrial-engineer', title: 'Industrial Engineer', industry: 'Engineering', demandLevel: 'High', avgSalary: '$96,000', icon: 'Factory', requiredSkillCount: 17 },
  { id: 'petroleum-engineer', title: 'Petroleum Engineer', industry: 'Engineering', demandLevel: 'Low', avgSalary: '$138,000', icon: 'Fuel', requiredSkillCount: 19 },
  { id: 'biomedical-engineer-eng', title: 'Biomedical Engineer', industry: 'Engineering', demandLevel: 'High', avgSalary: '$98,000', icon: 'Microscope', requiredSkillCount: 20 },
  { id: 'robotics-engineer', title: 'Robotics Engineer', industry: 'Engineering', demandLevel: 'High', avgSalary: '$115,000', icon: 'Bot', requiredSkillCount: 22 },
  { id: 'automotive-engineer', title: 'Automotive Engineer', industry: 'Engineering', demandLevel: 'Medium', avgSalary: '$95,000', icon: 'Car', requiredSkillCount: 18 },

  // Science & Research
  { id: 'research-scientist', title: 'Research Scientist', industry: 'Science', demandLevel: 'High', avgSalary: '$98,000', icon: 'Microscope', requiredSkillCount: 20 },
  { id: 'chemist', title: 'Chemist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$82,000', icon: 'FlaskConical', requiredSkillCount: 18 },
  { id: 'biologist', title: 'Biologist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$78,000', icon: 'Dna', requiredSkillCount: 18 },
  { id: 'environmental-scientist', title: 'Environmental Scientist', industry: 'Science', demandLevel: 'High', avgSalary: '$75,000', icon: 'Leaf', requiredSkillCount: 16 },
  { id: 'epidemiologist', title: 'Epidemiologist', industry: 'Science', demandLevel: 'High', avgSalary: '$88,000', icon: 'Activity', requiredSkillCount: 18 },
  { id: 'physicist', title: 'Physicist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$138,000', icon: 'Atom', requiredSkillCount: 22 },
  { id: 'neuroscientist', title: 'Neuroscientist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$95,000', icon: 'Brain', requiredSkillCount: 22 },
  { id: 'geneticist', title: 'Geneticist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$92,000', icon: 'Dna', requiredSkillCount: 21 },
  { id: 'marine-biologist', title: 'Marine Biologist', industry: 'Science', demandLevel: 'Low', avgSalary: '$68,000', icon: 'Waves', requiredSkillCount: 18 },
  { id: 'forensic-scientist', title: 'Forensic Scientist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$62,000', icon: 'Search', requiredSkillCount: 17 },
  { id: 'geologist', title: 'Geologist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$95,000', icon: 'Mountain', requiredSkillCount: 17 },
  { id: 'statistician', title: 'Statistician', industry: 'Science', demandLevel: 'High', avgSalary: '$98,000', icon: 'BarChart2', requiredSkillCount: 18 },

  // Creative & Media
  { id: 'journalist', title: 'Journalist / Reporter', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$55,000', icon: 'Newspaper', requiredSkillCount: 13 },
  { id: 'copywriter', title: 'Copywriter', industry: 'Creative', demandLevel: 'High', avgSalary: '$68,000', icon: 'PenLine', requiredSkillCount: 12 },
  { id: 'filmmaker', title: 'Filmmaker / Video Producer', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$72,000', icon: 'Video', requiredSkillCount: 15 },
  { id: 'architect', title: 'Architect', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$92,000', icon: 'PenTool', requiredSkillCount: 20 },
  { id: 'interior-designer', title: 'Interior Designer', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$62,000', icon: 'Sofa', requiredSkillCount: 14 },
  { id: 'fashion-designer', title: 'Fashion Designer', industry: 'Creative', demandLevel: 'Low', avgSalary: '$75,000', icon: 'Shirt', requiredSkillCount: 14 },
  { id: 'photographer', title: 'Photographer', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$48,000', icon: 'Camera', requiredSkillCount: 12 },
  { id: 'animator', title: 'Animator', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$78,000', icon: 'Play', requiredSkillCount: 15 },
  { id: 'game-designer', title: 'Game Designer', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$85,000', icon: 'Gamepad2', requiredSkillCount: 16 },
  { id: 'podcast-producer', title: 'Podcast Producer', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$58,000', icon: 'Mic', requiredSkillCount: 12 },
  { id: 'book-editor', title: 'Book Editor', industry: 'Creative', demandLevel: 'Low', avgSalary: '$58,000', icon: 'BookOpen', requiredSkillCount: 13 },
  { id: 'screenwriter', title: 'Screenwriter', industry: 'Creative', demandLevel: 'Low', avgSalary: '$65,000', icon: 'Film', requiredSkillCount: 12 },
  { id: 'art-director', title: 'Art Director', industry: 'Creative', demandLevel: 'Medium', avgSalary: '$98,000', icon: 'Palette', requiredSkillCount: 15 },

  // Education (new)
  { id: 'high-school-teacher', title: 'High School Teacher', industry: 'Education', demandLevel: 'High', avgSalary: '$62,000', icon: 'GraduationCap', requiredSkillCount: 14 },
  { id: 'college-professor', title: 'College Professor', industry: 'Education', demandLevel: 'Medium', avgSalary: '$88,000', icon: 'BookOpen', requiredSkillCount: 18 },
  { id: 'school-counselor', title: 'School Counselor', industry: 'Education', demandLevel: 'High', avgSalary: '$62,000', icon: 'HeartHandshake', requiredSkillCount: 14 },
  { id: 'special-education-teacher', title: 'Special Education Teacher', industry: 'Education', demandLevel: 'High', avgSalary: '$65,000', icon: 'Users', requiredSkillCount: 15 },
  { id: 'school-principal', title: 'School Principal', industry: 'Education', demandLevel: 'Medium', avgSalary: '$98,000', icon: 'Building', requiredSkillCount: 17 },
  { id: 'academic-advisor', title: 'Academic Advisor', industry: 'Education', demandLevel: 'Medium', avgSalary: '$52,000', icon: 'ClipboardList', requiredSkillCount: 13 },
  { id: 'corporate-trainer', title: 'Corporate Trainer', industry: 'Education', demandLevel: 'High', avgSalary: '$72,000', icon: 'Presentation', requiredSkillCount: 14 },

  // Government & Public Sector
  { id: 'policy-analyst', title: 'Policy Analyst', industry: 'Government', demandLevel: 'Medium', avgSalary: '$78,000', icon: 'FileSearch', requiredSkillCount: 16 },
  { id: 'urban-planner', title: 'Urban Planner', industry: 'Government', demandLevel: 'Medium', avgSalary: '$78,000', icon: 'Map', requiredSkillCount: 16 },
  { id: 'social-worker', title: 'Social Worker', industry: 'Government', demandLevel: 'High', avgSalary: '$55,000', icon: 'HeartHandshake', requiredSkillCount: 15 },
  { id: 'foreign-service-officer', title: 'Foreign Service Officer', industry: 'Government', demandLevel: 'Low', avgSalary: '$82,000', icon: 'Globe', requiredSkillCount: 18 },
  { id: 'intelligence-analyst', title: 'Intelligence Analyst', industry: 'Government', demandLevel: 'Medium', avgSalary: '$90,000', icon: 'Eye', requiredSkillCount: 18 },
  { id: 'public-health-official', title: 'Public Health Official', industry: 'Government', demandLevel: 'High', avgSalary: '$85,000', icon: 'Shield', requiredSkillCount: 17 },
  { id: 'military-officer', title: 'Military Officer', industry: 'Government', demandLevel: 'High', avgSalary: '$85,000', icon: 'Star', requiredSkillCount: 18 },
  { id: 'legislative-aide', title: 'Legislative Aide', industry: 'Government', demandLevel: 'Medium', avgSalary: '$52,000', icon: 'ScrollText', requiredSkillCount: 14 },

  // Real Estate
  { id: 'real-estate-agent', title: 'Real Estate Agent', industry: 'Real Estate', demandLevel: 'High', avgSalary: '$68,000', icon: 'Home', requiredSkillCount: 13 },
  { id: 'commercial-real-estate-broker', title: 'Commercial Real Estate Broker', industry: 'Real Estate', demandLevel: 'Medium', avgSalary: '$105,000', icon: 'Building2', requiredSkillCount: 16 },
  { id: 'property-manager', title: 'Property Manager', industry: 'Real Estate', demandLevel: 'High', avgSalary: '$62,000', icon: 'Key', requiredSkillCount: 13 },
  { id: 'real-estate-developer', title: 'Real Estate Developer', industry: 'Real Estate', demandLevel: 'Medium', avgSalary: '$145,000', icon: 'Building', requiredSkillCount: 20 },
  { id: 'real-estate-appraiser', title: 'Real Estate Appraiser', industry: 'Real Estate', demandLevel: 'Medium', avgSalary: '$62,000', icon: 'ClipboardList', requiredSkillCount: 14 },

  // Hospitality & Tourism
  { id: 'hotel-general-manager', title: 'Hotel General Manager', industry: 'Hospitality', demandLevel: 'High', avgSalary: '$85,000', icon: 'BedDouble', requiredSkillCount: 16 },
  { id: 'restaurant-manager', title: 'Restaurant Manager', industry: 'Hospitality', demandLevel: 'High', avgSalary: '$58,000', icon: 'UtensilsCrossed', requiredSkillCount: 14 },
  { id: 'executive-chef', title: 'Executive Chef', industry: 'Hospitality', demandLevel: 'Medium', avgSalary: '$68,000', icon: 'ChefHat', requiredSkillCount: 16 },
  { id: 'event-planner', title: 'Event Planner', industry: 'Hospitality', demandLevel: 'Medium', avgSalary: '$55,000', icon: 'CalendarDays', requiredSkillCount: 14 },
  { id: 'travel-agent', title: 'Travel Agent', industry: 'Hospitality', demandLevel: 'Low', avgSalary: '$45,000', icon: 'Plane', requiredSkillCount: 11 },
  { id: 'catering-manager', title: 'Catering Manager', industry: 'Hospitality', demandLevel: 'Medium', avgSalary: '$58,000', icon: 'UtensilsCrossed', requiredSkillCount: 13 },

  // Non-profit & Social Impact
  { id: 'nonprofit-program-manager', title: 'Non-profit Program Manager', industry: 'Non-profit', demandLevel: 'High', avgSalary: '$62,000', icon: 'Heart', requiredSkillCount: 15 },
  { id: 'grant-writer', title: 'Grant Writer', industry: 'Non-profit', demandLevel: 'High', avgSalary: '$58,000', icon: 'PenLine', requiredSkillCount: 13 },
  { id: 'community-organizer', title: 'Community Organizer', industry: 'Non-profit', demandLevel: 'Medium', avgSalary: '$48,000', icon: 'Users', requiredSkillCount: 12 },
  { id: 'fundraising-manager', title: 'Fundraising Manager', industry: 'Non-profit', demandLevel: 'High', avgSalary: '$72,000', icon: 'DollarSign', requiredSkillCount: 14 },
  { id: 'volunteer-coordinator', title: 'Volunteer Coordinator', industry: 'Non-profit', demandLevel: 'Medium', avgSalary: '$45,000', icon: 'HandHeart', requiredSkillCount: 11 },

  // Construction
  { id: 'construction-manager', title: 'Construction Manager', industry: 'Construction', demandLevel: 'High', avgSalary: '$98,000', icon: 'HardHat', requiredSkillCount: 17 },
  { id: 'general-contractor', title: 'General Contractor', industry: 'Construction', demandLevel: 'High', avgSalary: '$85,000', icon: 'Hammer', requiredSkillCount: 15 },
  { id: 'site-supervisor', title: 'Site Supervisor', industry: 'Construction', demandLevel: 'High', avgSalary: '$72,000', icon: 'HardHat', requiredSkillCount: 13 },
  { id: 'estimator', title: 'Cost Estimator', industry: 'Construction', demandLevel: 'High', avgSalary: '$75,000', icon: 'Calculator', requiredSkillCount: 14 },
  { id: 'building-inspector', title: 'Building Inspector', industry: 'Construction', demandLevel: 'Medium', avgSalary: '$65,000', icon: 'ClipboardCheck', requiredSkillCount: 13 },

  // Communications & PR
  { id: 'public-relations-specialist', title: 'Public Relations Specialist', industry: 'Communications', demandLevel: 'Medium', avgSalary: '$68,000', icon: 'Megaphone', requiredSkillCount: 13, aliases: ['PR specialist', 'communications specialist', 'PR'] },
  { id: 'corporate-communications-manager', title: 'Corporate Communications Manager', industry: 'Communications', demandLevel: 'Medium', avgSalary: '$92,000', icon: 'MessageSquare', requiredSkillCount: 15 },
  { id: 'communications-coordinator', title: 'Communications Coordinator', industry: 'Communications', demandLevel: 'Medium', avgSalary: '$55,000', icon: 'MessageCircle', requiredSkillCount: 12 },

  // Supply Chain (expanded)
  { id: 'supply-chain-manager', title: 'Supply Chain Manager', industry: 'Business', demandLevel: 'High', avgSalary: '$105,000', icon: 'Package', requiredSkillCount: 17 },
  { id: 'procurement-analyst', title: 'Procurement Analyst', industry: 'Business', demandLevel: 'High', avgSalary: '$78,000', icon: 'ShoppingCart', requiredSkillCount: 14, aliases: ['sourcing analyst', 'purchasing analyst'] },
  { id: 'logistics-coordinator', title: 'Logistics Coordinator', industry: 'Business', demandLevel: 'High', avgSalary: '$62,000', icon: 'Truck', requiredSkillCount: 13, aliases: ['logistics specialist', 'shipping coordinator'] },
  { id: 'operations-research-analyst', title: 'Operations Research Analyst', industry: 'Business', demandLevel: 'High', avgSalary: '$92,000', icon: 'Network', requiredSkillCount: 17, aliases: ['OR analyst', 'optimization analyst'] },

  // Allied Health (expanded)
  { id: 'speech-language-pathologist', title: 'Speech-Language Pathologist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$92,000', icon: 'MessageCircle', requiredSkillCount: 18, aliases: ['SLP', 'speech therapist', 'speech pathologist'] },
  { id: 'dental-hygienist', title: 'Dental Hygienist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$82,000', icon: 'Smile', requiredSkillCount: 14 },
  { id: 'respiratory-therapist', title: 'Respiratory Therapist', industry: 'Medicine', demandLevel: 'High', avgSalary: '$68,000', icon: 'Wind', requiredSkillCount: 15, aliases: ['RT', 'respiratory care practitioner'] },
  { id: 'diagnostic-sonographer', title: 'Diagnostic Medical Sonographer', industry: 'Medicine', demandLevel: 'High', avgSalary: '$78,000', icon: 'ScanLine', requiredSkillCount: 15, aliases: ['ultrasound technician', 'sonographer'] },
  { id: 'clinical-social-worker', title: 'Clinical Social Worker', industry: 'Government', demandLevel: 'High', avgSalary: '$62,000', icon: 'HeartHandshake', requiredSkillCount: 16, aliases: ['LCSW', 'social worker', 'therapist'] },

  // Skilled Trades
  { id: 'electrician', title: 'Electrician', industry: 'Trades', demandLevel: 'High', avgSalary: '$62,000', icon: 'Zap', requiredSkillCount: 14 },
  { id: 'plumber', title: 'Plumber', industry: 'Trades', demandLevel: 'High', avgSalary: '$58,000', icon: 'Wrench', requiredSkillCount: 13, aliases: ['pipefitter', 'plumbing technician'] },
  { id: 'hvac-technician', title: 'HVAC Technician', industry: 'Trades', demandLevel: 'High', avgSalary: '$62,000', icon: 'Wind', requiredSkillCount: 14, aliases: ['HVAC installer', 'refrigeration technician'] },
  { id: 'welder', title: 'Welder', industry: 'Trades', demandLevel: 'High', avgSalary: '$55,000', icon: 'Flame', requiredSkillCount: 13, aliases: ['welding technician', 'pipe welder'] },
  { id: 'carpenter', title: 'Carpenter', industry: 'Trades', demandLevel: 'High', avgSalary: '$55,000', icon: 'Hammer', requiredSkillCount: 12 },

  // Science (expanded)
  { id: 'biochemist', title: 'Biochemist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$92,000', icon: 'FlaskConical', requiredSkillCount: 20 },
  { id: 'toxicologist', title: 'Toxicologist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$88,000', icon: 'AlertTriangle', requiredSkillCount: 18 },
  { id: 'pharmacologist', title: 'Pharmacologist', industry: 'Science', demandLevel: 'Medium', avgSalary: '$95,000', icon: 'Pill', requiredSkillCount: 20 },
  { id: 'clinical-research-coordinator', title: 'Clinical Research Coordinator', industry: 'Science', demandLevel: 'High', avgSalary: '$62,000', icon: 'ClipboardList', requiredSkillCount: 15, aliases: ['CRC', 'clinical trials coordinator'] },

  // IT Infrastructure
  { id: 'it-support-specialist', title: 'IT Support Specialist', industry: 'Tech', demandLevel: 'High', avgSalary: '$55,000', icon: 'HelpCircle', requiredSkillCount: 12, aliases: ['help desk', 'IT helpdesk', 'technical support'] },
  { id: 'network-engineer', title: 'Network Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$92,000', icon: 'Network', requiredSkillCount: 17, aliases: ['network administrator', 'network analyst'] },
  { id: 'database-administrator', title: 'Database Administrator', industry: 'Tech', demandLevel: 'High', avgSalary: '$98,000', icon: 'Database', requiredSkillCount: 16, aliases: ['DBA', 'database engineer'] },
  { id: 'systems-administrator', title: 'Systems Administrator', industry: 'Tech', demandLevel: 'High', avgSalary: '$85,000', icon: 'Server', requiredSkillCount: 15, aliases: ['sysadmin', 'systems engineer'] },

  // HR (expanded)
  { id: 'hr-generalist', title: 'HR Generalist', industry: 'HR', demandLevel: 'High', avgSalary: '$62,000', icon: 'Users', requiredSkillCount: 13, aliases: ['human resources generalist', 'HR specialist'] },

  // Internship & student-targeted roles
  { id: 'software-engineering-intern', title: 'Software Engineering Intern', industry: 'Tech', demandLevel: 'High', avgSalary: '$35/hr', icon: 'Code2', requiredSkillCount: 10, aliases: ['SWE intern', 'software intern', 'coding intern', 'CS intern'] },
  { id: 'data-science-intern', title: 'Data Science Intern', industry: 'Tech', demandLevel: 'High', avgSalary: '$30/hr', icon: 'BarChart2', requiredSkillCount: 9, aliases: ['data intern', 'ML intern', 'analytics intern'] },
  { id: 'product-management-intern', title: 'Product Management Intern', industry: 'Tech', demandLevel: 'High', avgSalary: '$28/hr', icon: 'Target', requiredSkillCount: 8, aliases: ['PM intern', 'product intern', 'APM intern'] },
  { id: 'ib-summer-analyst', title: 'Investment Banking Summer Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$38/hr', icon: 'TrendingUp', requiredSkillCount: 12, aliases: ['IB summer analyst', 'banking intern', 'finance intern', 'summer analyst'] },
  { id: 'marketing-intern', title: 'Marketing Intern', industry: 'Marketing', demandLevel: 'High', avgSalary: '$22/hr', icon: 'Megaphone', requiredSkillCount: 8, aliases: ['marketing coordinator intern', 'digital marketing intern'] },
  { id: 'consulting-intern', title: 'Management Consulting Intern', industry: 'Business', demandLevel: 'High', avgSalary: '$35/hr', icon: 'Users', requiredSkillCount: 10, aliases: ['consulting intern', 'strategy intern', 'business analyst intern'] },
  { id: 'research-intern', title: 'Research Intern', industry: 'Science', demandLevel: 'High', avgSalary: '$20/hr', icon: 'Microscope', requiredSkillCount: 8, aliases: ['lab intern', 'research assistant', 'undergraduate researcher'] },
];

export function searchRoles(query: string): Role[] {
  const q = query.toLowerCase().trim();
  if (!q) return ROLES.slice(0, 10);
  return ROLES.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.industry.toLowerCase().includes(q) ||
      r.aliases?.some((a) => a.toLowerCase().includes(q))
  ).slice(0, 10);
}
