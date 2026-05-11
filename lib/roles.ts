import { Role } from './types';

export const ROLES: Role[] = [
  // Tech
  { id: 'software-engineer', title: 'Software Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$120,000', icon: 'Code2', requiredSkillCount: 18 },
  { id: 'frontend-developer', title: 'Frontend Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$110,000', icon: 'Monitor', requiredSkillCount: 16 },
  { id: 'backend-developer', title: 'Backend Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$125,000', icon: 'Server', requiredSkillCount: 17 },
  { id: 'full-stack-developer', title: 'Full Stack Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$130,000', icon: 'Layers', requiredSkillCount: 22 },
  { id: 'devops-engineer', title: 'DevOps Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$135,000', icon: 'GitBranch', requiredSkillCount: 20 },
  { id: 'data-scientist', title: 'Data Scientist', industry: 'Tech', demandLevel: 'High', avgSalary: '$128,000', icon: 'BarChart2', requiredSkillCount: 19 },
  { id: 'ml-engineer', title: 'ML Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$145,000', icon: 'Brain', requiredSkillCount: 21 },
  { id: 'cybersecurity-analyst', title: 'Cybersecurity Analyst', industry: 'Tech', demandLevel: 'High', avgSalary: '$115,000', icon: 'Shield', requiredSkillCount: 18 },
  { id: 'cloud-architect', title: 'Cloud Architect', industry: 'Tech', demandLevel: 'High', avgSalary: '$155,000', icon: 'Cloud', requiredSkillCount: 24 },
  { id: 'mobile-developer', title: 'Mobile Developer', industry: 'Tech', demandLevel: 'High', avgSalary: '$118,000', icon: 'Smartphone', requiredSkillCount: 17 },
  { id: 'qa-engineer', title: 'QA Engineer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$95,000', icon: 'CheckSquare', requiredSkillCount: 14 },
  { id: 'data-engineer', title: 'Data Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$132,000', icon: 'Database', requiredSkillCount: 20 },
  { id: 'ai-engineer', title: 'AI Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$150,000', icon: 'Cpu', requiredSkillCount: 22 },
  { id: 'product-manager', title: 'Product Manager', industry: 'Tech', demandLevel: 'High', avgSalary: '$140,000', icon: 'Target', requiredSkillCount: 15 },
  { id: 'ux-designer', title: 'UX Designer', industry: 'Tech', demandLevel: 'High', avgSalary: '$105,000', icon: 'Figma', requiredSkillCount: 16 },
  { id: 'ui-designer', title: 'UI Designer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$98,000', icon: 'Palette', requiredSkillCount: 14 },
  { id: 'site-reliability-engineer', title: 'Site Reliability Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$148,000', icon: 'Activity', requiredSkillCount: 22 },
  { id: 'blockchain-developer', title: 'Blockchain Developer', industry: 'Tech', demandLevel: 'Medium', avgSalary: '$138,000', icon: 'Link', requiredSkillCount: 18 },
  { id: 'security-engineer', title: 'Security Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$140,000', icon: 'Lock', requiredSkillCount: 20 },
  { id: 'platform-engineer', title: 'Platform Engineer', industry: 'Tech', demandLevel: 'High', avgSalary: '$142,000', icon: 'Box', requiredSkillCount: 21 },

  // Finance
  { id: 'investment-banking-analyst', title: 'Investment Banking Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$110,000', icon: 'TrendingUp', requiredSkillCount: 16 },
  { id: 'financial-analyst', title: 'Financial Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$85,000', icon: 'DollarSign', requiredSkillCount: 14 },
  { id: 'portfolio-manager', title: 'Portfolio Manager', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$125,000', icon: 'PieChart', requiredSkillCount: 18 },
  { id: 'risk-analyst', title: 'Risk Analyst', industry: 'Finance', demandLevel: 'High', avgSalary: '$95,000', icon: 'AlertTriangle', requiredSkillCount: 15 },
  { id: 'actuary', title: 'Actuary', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$108,000', icon: 'Calculator', requiredSkillCount: 17 },
  { id: 'accountant', title: 'Accountant', industry: 'Finance', demandLevel: 'High', avgSalary: '$75,000', icon: 'BookOpen', requiredSkillCount: 13 },
  { id: 'tax-analyst', title: 'Tax Analyst', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$80,000', icon: 'FileText', requiredSkillCount: 12 },
  { id: 'financial-planner', title: 'Financial Planner', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$90,000', icon: 'ClipboardList', requiredSkillCount: 14 },
  { id: 'hedge-fund-analyst', title: 'Hedge Fund Analyst', industry: 'Finance', demandLevel: 'Low', avgSalary: '$135,000', icon: 'TrendingUp', requiredSkillCount: 19 },
  { id: 'private-equity-associate', title: 'Private Equity Associate', industry: 'Finance', demandLevel: 'Low', avgSalary: '$145,000', icon: 'Briefcase', requiredSkillCount: 20 },
  { id: 'quantitative-analyst', title: 'Quantitative Analyst', industry: 'Finance', demandLevel: 'Medium', avgSalary: '$140,000', icon: 'Function', requiredSkillCount: 22 },

  // Business
  { id: 'management-consultant', title: 'Management Consultant', industry: 'Business', demandLevel: 'High', avgSalary: '$105,000', icon: 'Users', requiredSkillCount: 16 },
  { id: 'business-analyst', title: 'Business Analyst', industry: 'Business', demandLevel: 'High', avgSalary: '$88,000', icon: 'BarChart', requiredSkillCount: 14 },
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
];

export function searchRoles(query: string): Role[] {
  const q = query.toLowerCase().trim();
  if (!q) return ROLES.slice(0, 10);
  return ROLES.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.industry.toLowerCase().includes(q)
  ).slice(0, 10);
}
