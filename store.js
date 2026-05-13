// ============================================================
// PLACENIX — CENTRALIZED MOCK DATA STORE
// ============================================================

const Store = {
  // ── Current session ───────────────────────────────────────
  session: {
    role: 'student', // default role
    user: {
      id: 'u001',
      name: 'Arjun Mehta',
      email: 'arjun.mehta@svce.ac.in',
      avatar: 'AM',
      department: 'Computer Science',
      year: 'Final Year (4th)',
      rollNo: 'CS21B1042',
      institution: 'Sri Venkateswara College of Engineering',
      cgpa: 8.7,
      phone: '+91 9876543210',
    }
  },

  // ── Students ───────────────────────────────────────────────
  students: [
    { id:'u001', name:'Arjun Mehta',      dept:'CSE', cgpa:8.7, atsScore:82, empScore:78, status:'Active',   batch:'2025', placed:false, avatar:'AM', skills:['React','Node.js','Python','SQL','AWS'] },
    { id:'u002', name:'Priya Sharma',     dept:'ECE', cgpa:9.1, atsScore:91, empScore:88, status:'Placed',   batch:'2025', placed:true,  avatar:'PS', company:'Google', package:'28 LPA', skills:['VLSI','Embedded','Python','C++'] },
    { id:'u003', name:'Rahul Gupta',      dept:'MECH',cgpa:7.8, atsScore:65, empScore:61, status:'Active',   batch:'2025', placed:false, avatar:'RG', skills:['AutoCAD','CATIA','Python','MATLAB'] },
    { id:'u004', name:'Sneha Nair',       dept:'CSE', cgpa:9.3, atsScore:94, empScore:92, status:'Placed',   batch:'2025', placed:true,  avatar:'SN', company:'Microsoft', package:'32 LPA', skills:['Java','Spring Boot','Kubernetes','Docker'] },
    { id:'u005', name:'Karthik Reddy',    dept:'IT',  cgpa:8.2, atsScore:74, empScore:70, status:'Active',   batch:'2025', placed:false, avatar:'KR', skills:['Vue.js','Laravel','MySQL','Redis'] },
    { id:'u006', name:'Divya Krishnan',   dept:'CSE', cgpa:8.9, atsScore:87, empScore:84, status:'Shortlisted',batch:'2025',placed:false, avatar:'DK', skills:['ML','TensorFlow','Python','Statistics'] },
    { id:'u007', name:'Arun Kumar',       dept:'EEE', cgpa:7.5, atsScore:58, empScore:55, status:'Active',   batch:'2025', placed:false, avatar:'AK', skills:['MATLAB','Simulink','Power Systems'] },
    { id:'u008', name:'Meera Iyer',       dept:'CSE', cgpa:9.0, atsScore:89, empScore:86, status:'Placed',   batch:'2025', placed:true,  avatar:'MI', company:'Amazon', package:'24 LPA', skills:['React','TypeScript','System Design','AWS'] },
  ],

  // ── Placement Drives ──────────────────────────────────────
  drives: [
    {
      id: 'd001',
      company: 'TCS Digital',
      logo: '🔷',
      role: 'Software Engineer',
      type: 'Full-Time',
      package: '7 - 9 LPA',
      location: 'Chennai, Hyderabad, Bangalore',
      deadline: '2025-06-15',
      status: 'Open',
      eligible: ['CSE','IT','ECE'],
      minCgpa: 7.0,
      applicants: 142,
      shortlisted: 48,
      selected: 0,
      description: 'TCS Digital is hiring top engineering talent for full-stack development roles. Strong CS fundamentals required.',
      jdUrl: '#',
      skills: ['Java','Python','SQL','React'],
    },
    {
      id: 'd002',
      company: 'Infosys',
      logo: '🟦',
      role: 'Systems Engineer',
      type: 'Full-Time',
      package: '6.5 LPA',
      location: 'Pune, Bangalore, Chennai',
      deadline: '2025-06-18',
      status: 'Open',
      eligible: ['CSE','IT','ECE','EEE','MECH'],
      minCgpa: 6.5,
      applicants: 238,
      shortlisted: 80,
      selected: 0,
      description: 'Infosys Systems Engineer program for BE/BTech graduates across all branches.',
      skills: ['C','Java','DBMS','Communication'],
    },
    {
      id: 'd003',
      company: 'Google',
      logo: '🔴',
      role: 'Software Engineer (SDE)',
      type: 'Full-Time',
      package: '26 - 35 LPA',
      location: 'Bangalore',
      deadline: '2025-05-30',
      status: 'Closed',
      eligible: ['CSE','IT'],
      minCgpa: 8.5,
      applicants: 94,
      shortlisted: 18,
      selected: 3,
      description: 'Google SDE role requiring exceptional problem solving, algorithms, and system design skills.',
      skills: ['DSA','System Design','Python/C++','Low-Level Design'],
    },
    {
      id: 'd004',
      company: 'Zoho Corp',
      logo: '🟩',
      role: 'Member Technical Staff',
      type: 'Full-Time',
      package: '8 - 12 LPA',
      location: 'Chennai',
      deadline: '2025-06-25',
      status: 'Open',
      eligible: ['CSE','IT','ECE'],
      minCgpa: 7.5,
      applicants: 67,
      shortlisted: 28,
      selected: 0,
      description: 'Zoho is hiring for its core product teams. Product mindset + coding skills required.',
      skills: ['Java','Data Structures','SQL','Problem Solving'],
    },
    {
      id: 'd005',
      company: 'BOSCH',
      logo: '⚙️',
      role: 'Graduate Trainee - R&D',
      type: 'Full-Time',
      package: '5 - 7 LPA',
      location: 'Coimbatore, Bangalore',
      deadline: '2025-07-05',
      status: 'Upcoming',
      eligible: ['MECH','EEE','ECE'],
      minCgpa: 7.0,
      applicants: 0,
      shortlisted: 0,
      selected: 0,
      description: 'BOSCH R&D hiring for automotive and industrial engineering roles.',
      skills: ['MATLAB','Embedded C','Automotive Systems'],
    },
  ],

  // ── Kanban Pipeline ───────────────────────────────────────
  kanban: {
    applied:     [{ id:'k001', name:'Arjun Mehta', dept:'CSE', drive:'TCS Digital', avatar:'AM' }, { id:'k002', name:'Karthik Reddy', dept:'IT', drive:'TCS Digital', avatar:'KR' }],
    shortlisted: [{ id:'k003', name:'Divya Krishnan', dept:'CSE', drive:'TCS Digital', avatar:'DK' }, { id:'k004', name:'Arun Kumar', dept:'EEE', drive:'Infosys', avatar:'AK' }],
    aptitude:    [{ id:'k005', name:'Rahul Gupta', dept:'MECH', drive:'Infosys', avatar:'RG' }],
    technical:   [{ id:'k006', name:'Arjun Mehta', dept:'CSE', drive:'Zoho', avatar:'AM' }],
    hr:          [{ id:'k007', name:'Meera Iyer', dept:'CSE', drive:'Amazon', avatar:'MI' }],
    selected:    [{ id:'k008', name:'Priya Sharma', dept:'ECE', drive:'Google', avatar:'PS' }, { id:'k009', name:'Sneha Nair', dept:'CSE', drive:'Microsoft', avatar:'SN' }],
  },

  // ── Analytics ─────────────────────────────────────────────
  analytics: {
    overall: {
      totalStudents: 1247,
      placed: 843,
      placementPercent: 67.6,
      avgPackage: '8.4 LPA',
      highestPackage: '32 LPA',
      activeRecruiters: 48,
      drivesCompleted: 32,
      offersPending: 127,
    },
    byDept: [
      { dept:'CSE', total:320, placed:238, avgPkg:12.4, highPkg:32 },
      { dept:'IT',  total:180, placed:128, avgPkg:9.8,  highPkg:24 },
      { dept:'ECE', total:240, placed:156, avgPkg:7.6,  highPkg:22 },
      { dept:'EEE', total:200, placed:118, avgPkg:6.2,  highPkg:14 },
      { dept:'MECH',total:220, placed:128, avgPkg:5.8,  highPkg:12 },
      { dept:'CIVIL',total:87, placed:75,  avgPkg:4.5,  highPkg: 9 },
    ],
    monthlyPlacements: [12, 18, 24, 35, 48, 62, 80, 94, 112, 128, 142, 156],
    packageDistribution: [
      { range:'<5 LPA',  count:124 },
      { range:'5-8 LPA', count:312 },
      { range:'8-12 LPA',count:248 },
      { range:'12-20 LPA',count:112 },
      { range:'>20 LPA', count:47 },
    ],
    topRecruiters: [
      { name:'TCS', hired:84, avgPkg:'8 LPA' },
      { name:'Infosys', hired:62, avgPkg:'6.5 LPA' },
      { name:'Wipro', hired:48, avgPkg:'7 LPA' },
      { name:'Zoho', hired:36, avgPkg:'10 LPA' },
      { name:'Amazon', hired:28, avgPkg:'22 LPA' },
      { name:'Google', hired:6,  avgPkg:'30 LPA' },
    ],
  },

  // ── Student Profile (current) ──────────────────────────────
  studentProfile: {
    completion: 0,
    empScore: null,
    atsScore: null,
    placementProbability: 0,
    skills: {
      technical:     84,
      communication: 72,
      problemSolving:78,
      domainKnowledge:69,
      collaboration: 85,
    },
    applications: [
      { drive:'TCS Digital', role:'Software Engineer', date:'2025-05-01', status:'Shortlisted' },
      { drive:'Infosys',     role:'Systems Engineer',  date:'2025-04-28', status:'Applied' },
      { drive:'Zoho',        role:'MTS',               date:'2025-04-20', status:'Technical Round' },
    ],
    aiRecommendations: [
      { icon:'💡', title:'Add AWS Certification', desc:'Boost your cloud role suitability score by +22%. 68% of target JDs require it.', action:'Learn More' },
      { icon:'📝', title:'Improve Resume Summary', desc:'Your resume lacks a strong summary. Recruiters spend 6sec on initial scan.', action:'Fix Now' },
      { icon:'🎯', title:'Practice LeetCode Medium', desc:'You need 40+ medium problems to crack TCS Digital technical round.', action:'Start Now' },
      { icon:'🤝', title:'Connect with Alumni', desc:'3 alumni from Google are willing to mentor you. Request a session.', action:'Connect' },
    ],
  },

  // ── Alumni ────────────────────────────────────────────────
  alumni: [
    { id:'a001', name:'Vikram Balasubramanian', batch:'2022', company:'Google', role:'SDE III', expertise:['DSA','System Design','Leadership'], rating:4.9, sessions:48, avatar:'VB', location:'Bangalore', mentoring:true },
    { id:'a002', name:'Ananya Patel',           batch:'2021', company:'Microsoft', role:'Senior PM', expertise:['Product Management','Strategy','UX'], rating:4.8, sessions:32, avatar:'AP', location:'Hyderabad', mentoring:true },
    { id:'a003', name:'Rohit Menon',            batch:'2023', company:'Amazon', role:'SDE II', expertise:['Backend','AWS','Microservices'], rating:4.7, sessions:21, avatar:'RM', location:'Remote', mentoring:true },
    { id:'a004', name:'Lakshmi Subramaniam',    batch:'2020', company:'McKinsey', role:'Consultant', expertise:['Case Studies','Strategy','Consulting'], rating:4.9, sessions:64, avatar:'LS', location:'Mumbai', mentoring:true },
    { id:'a005', name:'Aditya Nambiar',         batch:'2022', company:'Zoho', role:'Tech Lead', expertise:['Full Stack','Architecture','Open Source'], rating:4.6, sessions:15, avatar:'AN', location:'Chennai', mentoring:false },
    { id:'a006', name:'Preethi Rajan',          batch:'2023', company:'Adobe', role:'UX Engineer', expertise:['Design Systems','Figma','React'], rating:4.8, sessions:28, avatar:'PR', location:'Bangalore', mentoring:true },
  ],

  // ── Interview Experiences ──────────────────────────────────
  interviews: [
    { id:'i001', company:'Google', role:'SDE II', year:2024, rounds:['Online Assessment','Technical 1','Technical 2','Googleyness','System Design'], difficulty:'Hard', result:'Selected', tags:['DSA','System Design','Behavioral'], author:'Anonymous', helpful:142 },
    { id:'i002', company:'TCS Digital',role:'Engineer',year:2025,rounds:['Aptitude','Coding','Technical HR'],difficulty:'Medium',result:'Selected',tags:['Java','SQL','DBMS'],author:'Sneha N.',helpful:87 },
    { id:'i003', company:'Amazon', role:'SDE I', year:2024, rounds:['Online Test','Technical 1','Technical 2','Bar Raiser','HR'],difficulty:'Hard',result:'Selected',tags:['DSA','Leadership Principles','System Design'],author:'Anonymous',helpful:198 },
    { id:'i004', company:'Infosys', role:'Systems Engineer',year:2025,rounds:['Online Test','HR'],difficulty:'Easy',result:'Selected',tags:['Aptitude','Communication'],author:'Rahul G.',helpful:54 },
  ],

  // ── Notifications ──────────────────────────────────────────
  notifications: [
    { id:'n001', type:'drive',    title:'New Drive: Zoho Corp', desc:'Applications open for Member Technical Staff role', time:'2h ago',   read:false },
    { id:'n002', type:'ai',       title:'AI Insight Ready',     desc:'Your resume score improved by +8 points after update', time:'4h ago', read:false },
    { id:'n003', type:'result',   title:'Shortlisted – TCS Digital', desc:'Congratulations! You have been shortlisted.', time:'1d ago', read:true },
    { id:'n004', type:'reminder', title:'Interview Tomorrow', desc:'TCS Digital Technical Round at 10:00 AM', time:'1d ago', read:false },
    { id:'n005', type:'alumni',   title:'Mentor Session Confirmed', desc:'Vikram B. accepted your mentoring request', time:'2d ago', read:true },
  ],

  // ── SaaS Institutions ─────────────────────────────────────
  institutions: [
    { id:'inst001', name:'Sri Venkateswara College of Engineering', shortName:'SVCE', students:1247, placed:843, plan:'Enterprise', status:'Active',   mrr:84000 },
    { id:'inst002', name:'PSG College of Technology',               shortName:'PSGCT',students:2100, placed:1680, plan:'Enterprise', status:'Active',  mrr:142000 },
    { id:'inst003', name:'Coimbatore Institute of Technology',      shortName:'CIT',  students:980,  placed:612,  plan:'Pro',        status:'Active',  mrr:48000 },
    { id:'inst004', name:'Kumaraguru College of Technology',        shortName:'KCT',  students:1540, placed:1024, plan:'Pro',        status:'Active',  mrr:72000 },
    { id:'inst005', name:'Bannari Amman Institute of Technology',   shortName:'BIET', students:820,  placed:492,  plan:'Starter',    status:'Active',  mrr:24000 },
    { id:'inst006', name:'Karpagam Academy',                        shortName:'KAE',  students:650,  placed:0,    plan:'Starter',    status:'Trial',   mrr:0 },
  ],

  // ── AI Module Configs ──────────────────────────────────────
  aiModules: {
    mockInterviewer: {
      title: 'AI Mock Interviewer',
      status: 'Beta',
      desc: 'Practice interviews with real-time AI feedback on communication, content, and confidence.',
      metrics: { accuracy: '94%', questions: '12,000+', feedback: 'Real-time' }
    },
    resumeBuilder: {
      title: 'AI Resume Builder',
      status: 'Available',
      desc: 'Generate ATS-optimized, role-specific resumes using AI trained on 50,000+ successful resumes.',
      metrics: { atsBoost: '+34%', templates: '120+', time: '5 minutes' }
    },
    careerAdvisor: {
      title: 'AI Career Advisor',
      status: 'Available',
      desc: 'Personalized career path recommendations based on your skills, market trends, and placement data.',
      metrics: { accuracy: '89%', paths: '240+', industries: '18' }
    },
    placementPredictor: {
      title: 'AI Placement Predictor',
      status: 'Available',
      desc: 'ML-powered prediction of placement probability based on your profile and historical data.',
      metrics: { accuracy: '91%', dataPoints: '1M+', updateFreq: 'Daily' }
    },
  },
};

export default Store;
