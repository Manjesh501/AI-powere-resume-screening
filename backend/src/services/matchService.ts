import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Define preferred models in order of preference - prioritizing models with higher quotas to avoid rate limits
const PREFERRED_MODELS = [
  'models/gemini-2.5-flash-lite',  // 0/15 RPM - Medium quota lite model
  'models/gemini-2.0-flash-lite', // 0/30 RPM - High quota lite model

  'models/gemini-2.0-flash',      
  'models/gemini-2.5-flash',      
  'models/gemini-2.5-pro', 
];

// Cache for the working model
let workingModel: any = null;
let workingModelName: string = '';

// Get or initialize the best available model
async function getBestModel() {
  // If we already have a working model, return it
  if (workingModel && workingModelName) {
    console.log(`✅ Using cached model: ${workingModelName}`);
    return { model: workingModel, modelName: workingModelName };
  }
  
  console.log('🔍 Searching for available models...');
  
  // Try to find the best available model
  for (const modelName of PREFERRED_MODELS) {
    try {
      console.log(`🧪 Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      // Test the model with a simple request
      await model.generateContent('Hello');
      workingModel = model;
      workingModelName = modelName;
      console.log(`✅ Model ${modelName} is available and working`);
      return { model, modelName };
    } catch (error: any) {
      console.log(`❌ Model ${modelName} not available: ${error.message || error}`);
      continue;
    }
  }
  
  // If none of our preferred models work, try the project default
  console.log('🔄 Trying fallback model...');
  try {
    const fallbackModelName = 'models/gemini-pro-latest';
    console.log(`🧪 Testing fallback model: ${fallbackModelName}`);
    const model = genAI.getGenerativeModel({ model: fallbackModelName });
    await model.generateContent('Hello');
    workingModel = model;
    workingModelName = fallbackModelName;
    console.log(`✅ Fallback model ${fallbackModelName} is available and working`);
    return { model, modelName: fallbackModelName };
  } catch (error: any) {
    console.error('💥 No models available:', error.message || error);
    throw new Error('No available models found. Please check your API key and network connection.');
  }
}

// Extract comprehensive skills using multiple approaches
async function extractSkillsWithAI(text: string): Promise<string[]> {
  try {
    // Method 1: Direct regex extraction (most reliable)
    const regexSkills = extractSkillsWithRegex(text);
    
    // Method 2: AI-based extraction for validation
    const aiSkills = await extractSkillsWithAIBackup(text);
    
    // Combine and deduplicate
    const allSkills = [...new Set([...regexSkills, ...aiSkills])];
    
    // Filter out generic terms and clean up
    const filteredSkills = filterGenericTerms(allSkills);
    
    console.log(`📊 Extracted ${filteredSkills.length} clean skills`);
    return filteredSkills.slice(0, 50); // Limit to prevent overload
  } catch (error) {
    console.error('Error in skill extraction:', error);
    // Fallback to regex-only extraction
    return filterGenericTerms(extractSkillsWithRegex(text));
  }
}

// Regex-based skill extraction
function extractSkillsWithRegex(text: string): string[] {
  const skills: string[] = [];
  
  // Comprehensive technical patterns
  const techPatterns = [
    // Cloud Platforms & Services
    /AWS|Amazon Web Services/gi,
    /GCP|Google Cloud Platform|Google Cloud/gi,
    /Azure|Microsoft Azure/gi,
    /EC2|Elastic Compute Cloud/gi,
    /S3|Simple Storage Service/gi,
    /IAM|Identity and Access Management/gi,
    /Lambda|AWS Lambda/gi,
    /EKS|Elastic Kubernetes Service/gi,
    /ECS|Elastic Container Service/gi,
    /Fargate/gi,
    /Glue/gi,
    /Athena/gi,
    /CloudWatch/gi,
    /GKE|Google Kubernetes Engine/gi,
    /GCE|Google Compute Engine/gi,
    /VPC|Virtual Private Cloud/gi,
    
    // Containerization & Orchestration
    /Kubernetes|k8s/gi,
    /Docker/gi,
    /Helm/gi,
    /ArgoCD/gi,
    /GitOps/gi,
    
    // CI/CD Tools
    /Jenkins/gi,
    /GitLab CI/gi,
    /GitHub Actions/gi,
    /CircleCI/gi,
    /Travis CI/gi,
    /CI\/CD|Continuous Integration|Continuous Deployment/gi,
    
    // Monitoring & Logging
    /Prometheus/gi,
    /Grafana/gi,
    /ELK Stack/gi,
    /Elasticsearch/gi,
    /Logstash/gi,
    /Kibana/gi,
    /Splunk/gi,
    /Datadog/gi,
    
    // Web Servers & Networking
    /Nginx/gi,
    /Apache/gi,
    /HTTPS/gi,
    /SSL|TLS/gi,
    /DNS/gi,
    /Load Balancer/gi,
    
    // Programming Languages
    /Python/gi,
    /Java/gi,
    /JavaScript/gi,
    /TypeScript/gi,
    /Go|Golang/gi,
    /C\+\+/gi,
    /C#/gi,
    /PHP/gi,
    /Ruby/gi,
    /Rust/gi,
    /Bash/gi,
    /Shell scripting/gi,
    
    // Web Development
    /React/gi,
    /Angular/gi,
    /Vue\.js/gi,
    /Node\.js/gi,
    /Express/gi,
    /HTML/gi,
    /CSS/gi,
    /JSP|Java Server Pages/gi,
    /Servlet/gi,
    /MVC|Model View Controller/gi,
    /Bootstrap/gi,
    /MERN/gi,
    
    // Databases
    /MySQL/gi,
    /PostgreSQL/gi,
    /MongoDB/gi,
    /Redis/gi,
    /Oracle/gi,
    /SQL/gi,
    /PL\/SQL/gi,
    
    // Infrastructure as Code
    /Terraform/gi,
    /CloudFormation/gi,
    /Ansible/gi,
    
    // Methodologies & Practices
    /Agile/gi,
    /Scrum/gi,
    /DevOps/gi,
    /SRE|Site Reliability Engineer/gi,
    /Microservices/gi,
    /REST|RESTful/gi,
    /GraphQL/gi,
    
    // Security
    /OAuth/gi,
    /JWT/gi,
    /Encryption/gi,
    /Firewall/gi,
    /Trivy/gi,
    /SonarQube/gi,
    
    // Operating Systems
    /Linux/gi,
    /Unix/gi,
    /Windows/gi,
    /Ubuntu/gi,
    /CentOS/gi,
    
    // Other Technical Terms
    /ERP/gi,
    /CRM/gi,
    /API/gi,
    /JSON/gi,
    /XML/gi,
    /Git/gi,
    /Troubleshooting/gi,
    /Debugging/gi,
    /VPS|Virtual Private Server/gi,
    /RCA|Root Cause Analysis/gi,
    /On-call/gi,
    /Incident Response/gi
  ];
  
  // Extract skills using patterns
  for (const pattern of techPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        let cleanMatch = match.trim();
        // Remove common prefixes/suffixes
        cleanMatch = cleanMatch.replace(/^(Experience with|Knowledge of|Proficiency in|Skills in)\s+/i, '');
        cleanMatch = cleanMatch.replace(/\s+(experience|knowledge|skills|proficiency)$/i, '');
        
        if (cleanMatch.length > 1) {
          skills.push(cleanMatch);
        }
      });
    }
  }
  
  // Also extract capitalized terms that look like skills
  const capitalizedTerms = text.match(/[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*/g) || [];
  for (const term of capitalizedTerms) {
    if (term.length > 1 && term.length < 30 && !/^(The|And|Or|In|On|At|To|For|With|Of|As|By|Is|Are|Was|Were|That|This|Which|What|How|When|Where|Why|Who|Whom|Whose)$/i.test(term)) {
      skills.push(term);
    }
  }
  
  return [...new Set(skills)]; // Remove duplicates
}

// AI-based backup extraction
async function extractSkillsWithAIBackup(text: string): Promise<string[]> {
  try {
    const { model } = await getBestModel();
    
    const prompt = `Extract technical skills, tools, technologies, and certifications from this text.
    Return ONLY a comma-separated list of specific technical terms.
    Focus on concrete skills, not generic business terms.
    
    Examples of what to extract: Kubernetes, Docker, AWS, Python, Terraform, GitLab CI
    Examples of what NOT to extract: experience, knowledge, skills, ability, proficiency
    
    Text: "${text.substring(0, 2000)}"  // Limit text length
    
    Response format: skill1, skill2, skill3, ...
    
    Response:`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();
    
    // Split by commas and clean up
    return textResponse
      .split(',')
      .map((skill: string) => skill.trim())
      .filter((skill: string) => skill.length > 1 && !/^(and|or|the|of|in|on|at|to|for|with)$/i.test(skill));
  } catch (error) {
    console.error('AI backup extraction failed:', error);
    return [];
  }
}

// Filter out generic terms
function filterGenericTerms(skills: string[]): string[] {
  const genericTerms = [
    'experience', 'knowledge', 'skills', 'ability', 'proficiency',
    'familiarity', 'understanding', 'expertise', 'competency',
    'capabilities', 'qualifications', 'requirements', 'responsibilities',
    'duties', 'tasks', 'role', 'position', 'job', 'work',
    'development', 'implementation', 'management', 'support',
    'assistance', 'help', 'aid', 'guidance', 'direction',
    'leadership', 'supervision', 'oversight', 'control',
    'planning', 'organizing', 'coordinating', 'executing',
    'performing', 'accomplishing', 'achieving', 'delivering',
    'providing', 'offering', 'giving', 'contributing',
    'participating', 'engaging', 'involving', 'partaking',
    'collaborating', 'cooperating', 'working', 'teamwork',
    'communication', 'interaction', 'discussion', 'conversation',
    'meeting', 'gathering', 'assembly', 'conference',
    'problem', 'issue', 'challenge', 'difficulty', 'obstacle',
    'solution', 'resolution', 'answer', 'response', 'reply',
    'improvement', 'enhancement', 'optimization', 'refinement',
    'process', 'procedure', 'method', 'approach', 'technique',
    'tool', 'instrument', 'device', 'equipment', 'resource',
    'system', 'platform', 'environment', 'infrastructure',
    'technology', 'tech', 'digital', 'virtual', 'online',
    'service', 'product', 'solution', 'application', 'app',
    'software', 'program', 'code', 'script', 'algorithm',
    'data', 'information', 'content', 'material', 'document',
    'project', 'initiative', 'program', 'campaign', 'effort',
    'goal', 'objective', 'target', 'aim', 'purpose',
    'result', 'outcome', 'achievement', 'accomplishment',
    'benefit', 'advantage', 'value', 'gain', 'profit',
    'quality', 'standard', 'level', 'degree', 'extent',
    'performance', 'execution', 'operation', 'function',
    'activity', 'action', 'task', 'assignment', 'responsibility',
    'duty', 'obligation', 'requirement', 'necessity',
    'need', 'demand', 'request', 'desire', 'want',
    'preference', 'choice', 'option', 'alternative', 'possibility',
    'opportunity', 'chance', 'prospect', 'potential', 'capability',
    'capacity', 'ability', 'skill', 'competence', 'proficiency',
    'while', 'using', 'with', 'in', 'on', 'at', 'to', 'for', 'of', 'from', 'about',
    'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    'this', 'that', 'these', 'those', 'a', 'an', 'as', 'by', 'if', 'it', 'so', 'up', 'us', 'we',
    'what', 'how', 'when', 'where', 'why', 'who', 'whom', 'whose', 'which',
    'assist', 'contribute', 'collaborate', 'monitor', 'qualifications', 'bachelor',
    'computer', 'science', 'information', 'technology', 'solid', 'hands', 'compute',
    'engine', 'interest', 'strong', 'awareness', 'exposure', 'what', 'we', 'offer',
    'responsibilities', 'rest'
  ];
  
  return skills
    .map(skill => skill.trim())
    .filter(skill => {
      const lowerSkill = skill.toLowerCase();
      return skill.length > 2 && 
             !genericTerms.includes(lowerSkill) && 
             !/^\d+$/.test(lowerSkill) && // Exclude pure numbers
             skill.length < 30; // Exclude very long terms
    });
}

// Generate structured, professional match analysis
async function generateStructuredAnalysis(resumeText: string, jobDescriptionText: string): Promise<any> {
  try {
    const { model, modelName } = await getBestModel();
    const generativeModel = genAI.getGenerativeModel({ model: modelName });
    
    const prompt = `You are an expert HR analyst and technical recruiter. Analyze this resume and job description to provide a detailed, professional match analysis in the exact format shown in the example.

Example format to follow:
Resume Uploaded: candidate_resume.pdf
Job Description Uploaded: job_description.txt

⭐ Match Score: 82% — Strong Match
✅ Strengths Identified

3+ years experience with Node.js / REST API development

Strong backend fundamentals: authentication, routing, database operations

Hands-on work with Docker and basic CI/CD pipelines

Solid experience with PostgreSQL & MongoDB

Clear exposure to microservices and distributed components

Demonstrated code optimization and SQL performance tuning

❌ Gaps Identified

No explicit experience with Kubernetes or container orchestration

Limited exposure to AWS Lambda / Serverless functions

Does not mention experience with GraphQL (important for this JD)

No mention of high-scale distributed tracing or observability tools

Might need guidance on advanced cloud security best practices

📝 Key Insights

Candidate is strong on backend, databases, and API design, aligning well with 70–80% of the JD needs

Experience suggests confidence in handling backend ownership independently

Cloud exposure is present (Docker, Nginx, deployments), but not deeply production-level cloud-native

Could excel with moderate onboarding

Well-suited for a mid-level backend developer position

🎯 Resume Summary (Extracted Automatically)

Backend engineer with experience in REST APIs, SQL/NoSQL databases, and deploying microservices using Node.js and Docker. Skilled in building scalable API layers, optimizing database queries, and integrating third-party services. Strong problem-solving mindset with hands-on project experience.

JOB DESCRIPTION:
"${jobDescriptionText.substring(0, 2000)}"

CANDIDATE RESUME:
"${resumeText.substring(0, 2000)}"

Provide the analysis in the EXACT format as the example above. Do not include any other text, explanations, or markdown formatting. Just the pure analysis following the exact structure with:
- Resume Uploaded and Job Description Uploaded lines
- Match Score with star rating
- Strengths Identified section with bullet points
- Gaps Identified section with bullet points
- Key Insights section with bullet points
- Resume Summary section

IMPORTANT: Return ONLY the formatted analysis. Do not include JSON or any other formatting.`;

    console.log(`🤖 Generating structured analysis using model: ${modelName}`);
    
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('✅ Structured analysis generated successfully');
    
    // Parse the text response into a structured object
    return parseAnalysisText(analysisText);
  } catch (error) {
    console.error('❌ Error in generateStructuredAnalysis:', error);
    throw error;
  }
}

// Helper function to parse the analysis text into a structured object
function parseAnalysisText(text: string): any {
  try {
    // Extract match score
    const scoreMatch = text.match(/⭐ Match Score: (\d+)%/);
    const overallMatch = scoreMatch ? `${scoreMatch[1]}%` : 'N/A';
    
    // Split the text into sections
    const sections = text.split('\n\n');
    
    // Extract strengths (between "Strengths Identified" and "Gaps Identified")
    const strengthsStartIndex = sections.findIndex(section => section.includes('Strengths Identified'));
    const gapsStartIndex = sections.findIndex(section => section.includes('Gaps Identified'));
    const strengths = strengthsStartIndex !== -1 && gapsStartIndex !== -1 ? 
      sections.slice(strengthsStartIndex + 1, gapsStartIndex).filter(s => s.trim() !== '') : [];
    
    // Extract gaps (between "Gaps Identified" and "Key Insights")
    const insightsStartIndex = sections.findIndex(section => section.includes('Key Insights'));
    const gaps = gapsStartIndex !== -1 && insightsStartIndex !== -1 ? 
      sections.slice(gapsStartIndex + 1, insightsStartIndex).filter(s => s.trim() !== '') : [];
    
    // Extract insights (between "Key Insights" and "Resume Summary")
    const summaryStartIndex = sections.findIndex(section => section.includes('Resume Summary'));
    const insights = insightsStartIndex !== -1 && summaryStartIndex !== -1 ? 
      sections.slice(insightsStartIndex + 1, summaryStartIndex).filter(s => s.trim() !== '') : [];
    
    // Extract summary (after "Resume Summary")
    const summary = summaryStartIndex !== -1 ? 
      sections.slice(summaryStartIndex + 1).join('\n\n') : '';
    
    return {
      overallMatch,
      strengths,
      gaps,
      insights,
      summary
    };
  } catch (error) {
    console.error('❌ Error parsing analysis text:', error);
    return {
      overallMatch: 'N/A',
      strengths: [],
      gaps: [],
      insights: [],
      summary: ''
    };
  }
}

// Fallback basic analysis
function generateBasicAnalysis(resumeText: string, jobDescriptionText: string): any {
  console.log('🔄 Using fallback basic analysis');
  
  // Extract skills from both texts
  const resumeSkills = filterGenericTerms(extractSkillsWithRegex(resumeText));
  const jobSkills = filterGenericTerms(extractSkillsWithRegex(jobDescriptionText));
  
  // Find matches
  const matchedSkills: string[] = [];
  const unmatchedSkills: string[] = [];
  
  for (const jobSkill of jobSkills) {
    const normalizedJobSkill = jobSkill.toLowerCase();
    const isMatched = resumeSkills.some(resumeSkill => 
      resumeSkill.toLowerCase().includes(normalizedJobSkill) || 
      normalizedJobSkill.includes(resumeSkill.toLowerCase())
    );
    
    if (isMatched) {
      matchedSkills.push(jobSkill);
    } else {
      unmatchedSkills.push(jobSkill);
    }
  }
  
  const score = jobSkills.length > 0 ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 0;
  
  // Create insights as strings
  const insights: string[] = [
    `Match score: ${score}%. ${score >= 80 ? 'Strong match' : score >= 60 ? 'Moderate match' : 'Weak match'} for this role.`,
    `Key strengths: ${matchedSkills.slice(0, 5).join(', ')}`,
    `Missing skills: ${unmatchedSkills.slice(0, 5).join(', ')}`
  ];
  
  // Create a structured analysis even for the fallback
  return {
    overallMatch: `${score}%`,
    summary: `Based on skill matching analysis, you have ${matchedSkills.length} out of ${jobSkills.length} required skills. You are a ${score >= 80 ? 'strong' : score >= 60 ? 'moderate' : 'weak'} match for this role.`,
    skillsBreakdown: {
      coreCloud: {
        title: "Key Skills Analysis",
        requirements: [
          {
            requirement: "Matched Skills",
            match: "Strong",
            notes: matchedSkills.slice(0, 10).join(", ")
          },
          {
            requirement: "Missing Skills",
            match: "Weak",
            notes: unmatchedSkills.slice(0, 10).join(", ")
          }
        ]
      }
    },
    experienceMatch: {
      strong: matchedSkills.slice(0, 10),
      medium: [],
      weak: unmatchedSkills.slice(0, 10)
    },
    projectsRelevance: [],
    improvements: [
      "Focus on developing the missing skills to improve your match score.",
      "Consider gaining practical experience through projects or internships.",
      "Tailor your resume to better highlight your existing skills and experience."
    ],
    finalVerdict: {
      technicalSkills: `${score}% match`,
      projectsAlignment: "N/A",
      cloudRequirements: "N/A",
      devOpsTooling: "N/A",
      overallReadiness: `${score}%`,
      assessment: "Analysis completed with basic matching. For a more detailed analysis, ensure your API key is configured correctly."
    }
  };
}

export const calculateMatchScore = async (resumeText: string, jobDescriptionText: string) => {
  console.log('📈 Generating professional match analysis...');
  const startTime = Date.now();
  
  try {
    // Generate structured, professional analysis
    console.log('🔍 Creating structured analysis...');
    const analysis = await generateStructuredAnalysis(resumeText, jobDescriptionText);
    
    console.log(`✅ Analysis completed in ${Date.now() - startTime}ms`);
    console.log('📊 Analysis result:', JSON.stringify(analysis, null, 2).substring(0, 200) + '...');
    
    // Ensure insights are strings
    let insights: string[] = [];
    if (analysis.improvements && Array.isArray(analysis.improvements)) {
      insights = analysis.improvements.filter((item: any) => typeof item === 'string');
    }
    if (analysis.finalVerdict?.assessment) {
      insights.push(analysis.finalVerdict.assessment);
    }
    
    return {
      score: analysis.finalVerdict ? parseInt(analysis.finalVerdict.overallReadiness) || 85 : 85,
      strengths: analysis.experienceMatch?.strong || [],
      gaps: analysis.experienceMatch?.weak || [],
      insights: insights,
      structuredAnalysis: analysis
    };
  } catch (error) {
    console.error('💥 Error in calculateMatchScore:', error);
    return {
      score: 0,
      strengths: [],
      gaps: [],
      insights: ['Error occurred during matching'],
      structuredAnalysis: null
    };
  }
};
