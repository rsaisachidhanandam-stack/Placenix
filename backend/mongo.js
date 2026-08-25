// ============================================================
// PLACENIX — MONGODB NOSQL SCHEMA MODELING, AGGREGATIONS & RELATIONS
// Demonstrates:
// 1. Schema Modeling with Typed Fields, Enums, Default Values & Validators
// 2. Embedding vs. Referencing Data Relationships
// 3. Multi-Stage Aggregation Pipelines ($match, $unwind, $group, $lookup, $project, $sort, $facet)
// 4. Resilient NoSQL CRUD Controller with Query Engine
// ============================================================

/**
 * ─────────────────────────────────────────────────────────────
 * 1. SCHEMA DEFINITIONS (Mongoose / NoSQL Modeling)
 * ─────────────────────────────────────────────────────────────
 * 
 * Model A: CandidatePortfolioSchema (Demonstrates EMBEDDING)
 * - Suitable for 1:1 and 1:Few bounded collections.
 * - Subdocuments (education, certifications, sectionScores) are embedded
 *   directly inside the parent document for fast single-read queries.
 * 
 * Model B: DriveTelemetrySchema (Demonstrates REFERENCING)
 * - Suitable for 1:Many and unbounded growth collections.
 * - Stores foreign ObjectIds / references to external collections (studentId, driveId)
 *   and uses $lookup joins to populate relational metadata.
 * 
 * Model C: AuditLogSchema (Demonstrates Hybrid Modeling)
 * - Actor subdocument is embedded for point-in-time snapshotting.
 * - Metadata payload supports flexible, schemaless polymorphic data.
 */

export const MongoSchemas = {
  CandidatePortfolio: {
    studentId: { type: 'String', required: true, unique: true, index: true },
    fullName: { type: 'String', required: true, trim: true },
    email: { type: 'String', required: true, lowercase: true },
    targetRole: { type: 'String', default: 'Software Engineer' },
    atsScore: { type: 'Number', min: 0, max: 100, default: 0 },
    // ── EMBEDDED SUBDOCUMENT 1: Section Scores ──────────────
    sectionScores: {
      skills: { type: 'Number', min: 0, max: 100, default: 0 },
      experience: { type: 'Number', min: 0, max: 100, default: 0 },
      education: { type: 'Number', min: 0, max: 100, default: 0 },
      formatting: { type: 'Number', min: 0, max: 100, default: 0 }
    },
    // ── EMBEDDED SUBDOCUMENT ARRAY: Education History ────────
    education: [
      {
        institution: { type: 'String', required: true },
        degree: { type: 'String', required: true },
        startYear: { type: 'Number' },
        endYear: { type: 'Number' },
        cgpa: { type: 'Number', min: 0, max: 10 }
      }
    ],
    // ── EMBEDDED SUBDOCUMENT ARRAY: Verified Certifications ───
    certifications: [
      {
        title: { type: 'String', required: true },
        issuer: { type: 'String', required: true },
        issuedYear: { type: 'Number' },
        credentialUrl: { type: 'String' }
      }
    ],
    skills: [{ type: 'String', lowercase: true, trim: true }],
    // ── REFERENCED RELATIONSHIPS (IDs referencing other docs) ──
    appliedDriveIds: [{ type: 'ObjectId', ref: 'RecruitmentDrive' }],
    createdAt: { type: 'Date', default: () => new Date().toISOString() },
    updatedAt: { type: 'Date', default: () => new Date().toISOString() }
  },

  AuditLog: {
    eventType: {
      type: 'String',
      required: true,
      enum: ['LOGIN', 'LOGOUT', 'RESUME_SCAN', 'INTERVIEW_COMPLETED', 'SLOT_BOOKED', 'DRIVE_CREATED', 'SECURITY_ALERT']
    },
    actor: {
      userId: { type: 'String', required: true },
      email: { type: 'String', required: true },
      role: { type: 'String', enum: ['student', 'tpo', 'coordinator', 'admin', 'system'], default: 'student' }
    },
    metadata: { type: 'Object', default: {} },
    ipAddress: { type: 'String', default: '127.0.0.1' },
    severity: { type: 'String', enum: ['INFO', 'WARN', 'ERROR', 'CRITICAL'], default: 'INFO' },
    timestamp: { type: 'Date', default: () => new Date().toISOString() }
  },

  RecruitmentDriveDoc: {
    driveId: { type: 'String', required: true, unique: true, index: true },
    company: { type: 'String', required: true },
    role: { type: 'String', required: true },
    packageLpa: { type: 'Number', required: true, min: 0 },
    tier: { type: 'String', enum: ['Tier-1 (Dream)', 'Tier-2 (Core)', 'Tier-3 (Mass)'], default: 'Tier-2 (Core)' },
    eligibleDepts: [{ type: 'String' }],
    requiredSkills: [{ type: 'String' }],
    // Embedded Rounds Pipeline Subdocuments
    rounds: [
      {
        roundNumber: { type: 'Number', required: true },
        name: { type: 'String', required: true },
        type: { type: 'String', enum: ['Aptitude', 'Coding', 'Technical', 'HR', 'Managerial'] },
        cutoffPercentage: { type: 'Number', default: 60 }
      }
    ],
    status: { type: 'String', enum: ['Upcoming', 'Open', 'In-Progress', 'Closed'], default: 'Open' }
  }
};

// ── In-Memory NoSQL Datastore (Embedded & Referenced Datasets) ──
const inMemoryMongoStore = {
  portfolios: [
    {
      _id: 'port_665a1001',
      studentId: 'usr_student_01',
      fullName: 'Rahul Sharma',
      email: 'rahul.s@placenix.edu',
      targetRole: 'Full Stack Engineer',
      atsScore: 92,
      department: 'CSE',
      sectionScores: { skills: 94, experience: 88, education: 95, formatting: 90 },
      education: [
        { institution: 'Placenix Institute of Tech', degree: 'B.Tech CSE', startYear: 2022, endYear: 2026, cgpa: 9.24 }
      ],
      certifications: [
        { title: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', issuedYear: 2025 },
        { title: 'MongoDB Certified Developer Associate', issuer: 'MongoDB Inc.', issuedYear: 2025 }
      ],
      skills: ['react', 'node.js', 'mongodb', 'docker', 'postgresql', 'redis', 'system-design'],
      appliedDriveIds: ['drv_google_2026', 'drv_amazon_2026'],
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: '2026-08-20T14:30:00.000Z'
    },
    {
      _id: 'port_665a1002',
      studentId: 'usr_student_02',
      fullName: 'Sneha Mishra',
      email: 'sneha.m@placenix.edu',
      targetRole: 'Cloud & AI Engineer',
      atsScore: 89,
      department: 'IT',
      sectionScores: { skills: 91, experience: 85, education: 92, formatting: 88 },
      education: [
        { institution: 'Placenix Institute of Tech', degree: 'B.Tech IT', startYear: 2022, endYear: 2026, cgpa: 8.95 }
      ],
      certifications: [
        { title: 'Google Cloud Professional Cloud Architect', issuer: 'Google Cloud', issuedYear: 2025 }
      ],
      skills: ['python', 'kubernetes', 'tensorflow', 'gcp', 'redis', 'fastapi'],
      appliedDriveIds: ['drv_google_2026'],
      createdAt: '2026-01-12T10:15:00.000Z',
      updatedAt: '2026-08-22T09:00:00.000Z'
    },
    {
      _id: 'port_665a1003',
      studentId: 'usr_student_03',
      fullName: 'Karthik P',
      email: 'karthik.p@placenix.edu',
      targetRole: 'Backend Developer',
      atsScore: 78,
      department: 'ECE',
      sectionScores: { skills: 82, experience: 74, education: 80, formatting: 76 },
      education: [
        { institution: 'Placenix Institute of Tech', degree: 'B.Tech ECE', startYear: 2022, endYear: 2026, cgpa: 8.10 }
      ],
      certifications: [
        { title: 'PostgreSQL Database Associate', issuer: 'Linux Foundation', issuedYear: 2024 }
      ],
      skills: ['java', 'spring-boot', 'postgresql', 'docker', 'kafka'],
      appliedDriveIds: ['drv_amazon_2026', 'drv_zoho_2026'],
      createdAt: '2026-01-15T11:00:00.000Z',
      updatedAt: '2026-08-21T16:20:00.000Z'
    },
    {
      _id: 'port_665a1004',
      studentId: 'usr_student_04',
      fullName: 'Pooja Verma',
      email: 'pooja.v@placenix.edu',
      targetRole: 'Frontend Developer',
      atsScore: 84,
      department: 'CSE',
      sectionScores: { skills: 86, experience: 80, education: 88, formatting: 82 },
      education: [
        { institution: 'Placenix Institute of Tech', degree: 'B.Tech CSE', startYear: 2022, endYear: 2026, cgpa: 8.65 }
      ],
      certifications: [
        { title: 'Meta Certified Frontend Developer', issuer: 'Meta', issuedYear: 2025 }
      ],
      skills: ['react', 'vue.js', 'typescript', 'tailwind', 'graphql'],
      appliedDriveIds: ['drv_zoho_2026'],
      createdAt: '2026-02-01T09:30:00.000Z',
      updatedAt: '2026-08-23T11:45:00.000Z'
    }
  ],

  drives: [
    {
      _id: 'drv_google_2026',
      company: 'Google',
      role: 'Software Engineer - Cloud & AI',
      packageLpa: 32.0,
      tier: 'Tier-1 (Dream)',
      eligibleDepts: ['CSE', 'IT', 'AI&DS'],
      requiredSkills: ['python', 'kubernetes', 'system-design', 'algorithms'],
      rounds: [
        { roundNumber: 1, name: 'Online Assessment (DSA)', type: 'Coding', cutoffPercentage: 75 },
        { roundNumber: 2, name: 'System Design & Architecture', type: 'Technical', cutoffPercentage: 80 },
        { roundNumber: 3, name: 'Googleyness & Leadership', type: 'HR', cutoffPercentage: 70 }
      ],
      status: 'Open'
    },
    {
      _id: 'drv_amazon_2026',
      company: 'Amazon',
      role: 'Software Development Engineer I (SDE-1)',
      packageLpa: 28.0,
      tier: 'Tier-1 (Dream)',
      eligibleDepts: ['CSE', 'IT', 'ECE'],
      requiredSkills: ['java', 'node.js', 'aws', 'data-structures'],
      rounds: [
        { roundNumber: 1, name: 'Online Coding Challenge', type: 'Coding', cutoffPercentage: 70 },
        { roundNumber: 2, name: 'Technical Bar Raiser', type: 'Technical', cutoffPercentage: 75 },
        { roundNumber: 3, name: 'LP & Behavioral Round', type: 'HR', cutoffPercentage: 70 }
      ],
      status: 'Open'
    },
    {
      _id: 'drv_zoho_2026',
      company: 'Zoho',
      role: 'Product Developer',
      packageLpa: 8.5,
      tier: 'Tier-2 (Core)',
      eligibleDepts: ['CSE', 'IT', 'ECE', 'MECH'],
      requiredSkills: ['c/c++', 'java', 'problem-solving'],
      rounds: [
        { roundNumber: 1, name: 'Basic Programming', type: 'Coding', cutoffPercentage: 60 },
        { roundNumber: 2, name: 'Advanced App Development', type: 'Coding', cutoffPercentage: 65 },
        { roundNumber: 3, name: 'General HR', type: 'HR', cutoffPercentage: 60 }
      ],
      status: 'Open'
    }
  ],

  auditLogs: [
    {
      _id: 'log_665a10f1e82b4',
      eventType: 'RESUME_SCAN',
      actor: { userId: 'usr_student_01', email: 'rahul.s@placenix.edu', role: 'student' },
      metadata: { targetRole: 'Full Stack Engineer', atsScore: 92, keywordsMatched: 28 },
      ipAddress: '192.168.1.45',
      severity: 'INFO',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      _id: 'log_665a10f1e82b5',
      eventType: 'INTERVIEW_COMPLETED',
      actor: { userId: 'usr_student_01', email: 'rahul.s@placenix.edu', role: 'student' },
      metadata: { company: 'Google', role: 'Software Engineer', beltAwarded: 'Purple Belt', overallScore: 91 },
      ipAddress: '192.168.1.45',
      severity: 'INFO',
      timestamp: new Date(Date.now() - 1800000).toISOString()
    },
    {
      _id: 'log_665a10f1e82b6',
      eventType: 'SLOT_BOOKED',
      actor: { userId: 'usr_tpo_01', email: 'tpo@placenix.edu', role: 'tpo' },
      metadata: { driveId: 'drv_amazon_2026', totalCandidatesAllocated: 48, venues: 2 },
      ipAddress: '10.0.0.12',
      severity: 'INFO',
      timestamp: new Date(Date.now() - 900000).toISOString()
    }
  ]
};

// ── Validation Helpers for Schema Modeling ────────────────────
function validateSchema(data, schemaRules) {
  const errors = [];
  for (const [key, rule] of Object.entries(schemaRules)) {
    const val = data[key];
    if (rule.required && (val === undefined || val === null || val === '')) {
      errors.push(`Field '${key}' is required.`);
      continue;
    }
    if (val !== undefined && val !== null) {
      if (rule.type === 'String' && typeof val !== 'string') errors.push(`Field '${key}' must be a String.`);
      if (rule.type === 'Number' && typeof val !== 'number') errors.push(`Field '${key}' must be a Number.`);
      if (rule.min !== undefined && val < rule.min) errors.push(`Field '${key}' must be >= ${rule.min}.`);
      if (rule.max !== undefined && val > rule.max) errors.push(`Field '${key}' must be <= ${rule.max}.`);
      if (rule.enum && !rule.enum.includes(val)) errors.push(`Field '${key}' must be one of: ${rule.enum.join(', ')}.`);
    }
  }
  return { isValid: errors.length === 0, errors };
}

// ── NoSQL CRUD & Aggregation Pipeline Controller ──────────────
export const MongoController = {
  // ── CONCEPT 1: SCHEMA MODELING (CREATE / VALIDATE) ──────────
  createAuditLog: async (logData) => {
    const { isValid, errors } = validateSchema(logData, MongoSchemas.AuditLog);
    if (!isValid) {
      const err = new Error(`Schema Validation Error: ${errors.join('; ')}`);
      err.statusCode = 422;
      throw err;
    }

    const newDoc = {
      _id: 'log_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      eventType: logData.eventType,
      actor: {
        userId: logData.actor.userId,
        email: logData.actor.email,
        role: logData.actor.role || 'student'
      },
      metadata: logData.metadata || {},
      ipAddress: logData.ipAddress || '127.0.0.1',
      severity: logData.severity || 'INFO',
      timestamp: new Date().toISOString()
    };

    inMemoryMongoStore.auditLogs.unshift(newDoc);
    return newDoc;
  },

  getAuditLogs: async (filter = {}) => {
    let results = [...inMemoryMongoStore.auditLogs];

    if (filter.eventType) {
      results = results.filter(l => l.eventType.toUpperCase() === filter.eventType.toUpperCase());
    }
    if (filter.severity) {
      results = results.filter(l => l.severity.toUpperCase() === filter.severity.toUpperCase());
    }
    if (filter.userId) {
      results = results.filter(l => l.actor.userId === filter.userId);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(l => 
        l.eventType.toLowerCase().includes(q) || 
        l.actor.email.toLowerCase().includes(q) ||
        JSON.stringify(l.metadata).toLowerCase().includes(q)
      );
    }

    const limit = parseInt(filter.limit) || 50;
    const page = parseInt(filter.page) || 1;
    const startIndex = (page - 1) * limit;

    return {
      total: results.length,
      page,
      limit,
      documents: results.slice(startIndex, startIndex + limit)
    };
  },

  getAuditLogById: async (id) => {
    const doc = inMemoryMongoStore.auditLogs.find(l => l._id === id);
    if (!doc) {
      const err = new Error(`Document with _id '${id}' not found in MongoDB collection`);
      err.statusCode = 404;
      throw err;
    }
    return doc;
  },

  updateAuditLog: async (id, updateData) => {
    const index = inMemoryMongoStore.auditLogs.findIndex(l => l._id === id);
    if (index === -1) {
      const err = new Error(`Cannot update: Document with _id '${id}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const existing = inMemoryMongoStore.auditLogs[index];
    const updated = {
      ...existing,
      ...updateData,
      actor: { ...existing.actor, ...(updateData.actor || {}) },
      metadata: { ...existing.metadata, ...(updateData.metadata || {}) },
      _id: existing._id,
      updatedAt: new Date().toISOString()
    };

    inMemoryMongoStore.auditLogs[index] = updated;
    return updated;
  },

  deleteAuditLog: async (id) => {
    const index = inMemoryMongoStore.auditLogs.findIndex(l => l._id === id);
    if (index === -1) {
      const err = new Error(`Cannot delete: Document with _id '${id}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const [deleted] = inMemoryMongoStore.auditLogs.splice(index, 1);
    return { success: true, deletedId: deleted._id };
  },

  // ── CONCEPT 8: EMBEDDING VS REFERENCING DEMONSTRATION ───────
  /**
   * Demonstrates:
   * 1. Querying EMBEDDED data: Returns candidate with immediate subdocuments (education, certifications, sectionScores)
   *    in a single atomic retrieval without joins.
   * 2. Querying REFERENCED data ($lookup simulation): Joins appliedDriveIds with the recruitment drives collection.
   */
  getStudentPortfolioWithRelationships: async (studentId) => {
    const portfolio = inMemoryMongoStore.portfolios.find(p => p.studentId === studentId);
    if (!portfolio) {
      const err = new Error(`Student portfolio with ID '${studentId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    // $lookup / Populate Simulation for Referenced Drive IDs:
    const populatedDrives = portfolio.appliedDriveIds.map(driveId => {
      const drive = inMemoryMongoStore.drives.find(d => d._id === driveId);
      return drive || { _id: driveId, company: 'Unknown', status: 'Inactive' };
    });

    return {
      studentId: portfolio.studentId,
      fullName: portfolio.fullName,
      email: portfolio.email,
      department: portfolio.department,
      // 1. EMBEDDED DATA ARCHITECTURE (0 Joins, 1 Round-trip, High Read Performance)
      embeddedSubdocuments: {
        architecture: 'EMBEDDED (1:1 / 1:Few Subdocuments)',
        tradeoffs: {
          pros: 'Atomic single-document reads/writes, zero-join latency, high locality of reference',
          cons: 'Subject to MongoDB 16MB document size limit, duplication if subdocs shared across parents'
        },
        sectionScores: portfolio.sectionScores,
        educationHistory: portfolio.education,
        verifiedCertifications: portfolio.certifications,
        skillsArray: portfolio.skills
      },
      // 2. REFERENCED DATA ARCHITECTURE ($lookup Joins, Scalable for Unbounded 1:Many & M:N)
      referencedRelationships: {
        architecture: 'REFERENCED (Normalized ObjectIds with $lookup / Population)',
        tradeoffs: {
          pros: 'Avoids document size limits, eliminates data duplication, suitable for rapidly mutating shared entities',
          cons: 'Requires multi-collection lookups / application-side joins'
        },
        appliedDrivesLookupCount: populatedDrives.length,
        populatedDrives
      }
    };
  },

  // ── CONCEPT 9: MULTI-STAGE AGGREGATION PIPELINES ────────────
  /**
   * Runs an advanced 6-Stage MongoDB Aggregation Pipeline:
   * Stage 1: $match   - Filter portfolios with ATS score >= minAts
   * Stage 2: $unwind  - Flatten skills array to compute aggregate demand per skill
   * Stage 3: $group   - Group by skill, count candidates, average ATS, collect departments
   * Stage 4: $project - Format computed metrics and round numbers
   * Stage 5: $sort    - Sort by candidateCount DESC, avgAtsScore DESC
   * Stage 6: $facet   - Return faceted metrics (topSkills, deptOverview, driveSummary)
   */
  runAggregationPipeline: async (options = {}) => {
    const minAts = options.minAts !== undefined ? Number(options.minAts) : 75;
    const portfolios = inMemoryMongoStore.portfolios;
    const drives = inMemoryMongoStore.drives;

    // Stage 1: $match
    const matchedPortfolios = portfolios.filter(p => p.atsScore >= minAts);

    // Stage 2: $unwind (flatten skills) & Stage 3: $group (by skill)
    const skillGroups = {};
    matchedPortfolios.forEach(p => {
      p.skills.forEach(skill => {
        if (!skillGroups[skill]) {
          skillGroups[skill] = {
            skill,
            candidateCount: 0,
            totalAts: 0,
            departments: new Set()
          };
        }
        skillGroups[skill].candidateCount += 1;
        skillGroups[skill].totalAts += p.atsScore;
        skillGroups[skill].departments.add(p.department);
      });
    });

    // Stage 4: $project & Stage 5: $sort
    const topSkillsAggregated = Object.values(skillGroups)
      .map(item => ({
        skill: item.skill,
        candidateCount: item.candidateCount,
        avgAtsScore: Math.round((item.totalAts / item.candidateCount) * 10) / 10,
        representedDepartments: Array.from(item.departments)
      }))
      .sort((a, b) => b.candidateCount - a.candidateCount || b.avgAtsScore - a.avgAtsScore);

    // Stage 6: $facet Dept Overview
    const deptGroups = {};
    matchedPortfolios.forEach(p => {
      if (!deptGroups[p.department]) {
        deptGroups[p.department] = { dept: p.department, count: 0, totalAts: 0, highestAts: 0 };
      }
      deptGroups[p.department].count += 1;
      deptGroups[p.department].totalAts += p.atsScore;
      if (p.atsScore > deptGroups[p.department].highestAts) {
        deptGroups[p.department].highestAts = p.atsScore;
      }
    });

    const deptOverviewAggregated = Object.values(deptGroups).map(d => ({
      department: d.dept,
      qualifiedCandidates: d.count,
      avgAts: Math.round((d.totalAts / d.count) * 10) / 10,
      highestAts: d.highestAts
    }));

    return {
      pipelineStagesExecuted: [
        { stage: '$match', description: `Filtered portfolios where atsScore >= ${minAts}`, documentsRemaining: matchedPortfolios.length },
        { stage: '$unwind', description: 'Deconstructed array field $skills to output one document per skill element' },
        { stage: '$group', description: 'Grouped by $skills, computed $sum(count) and $avg(atsScore)' },
        { stage: '$project', description: 'Reshaped output fields and rounded numerical aggregations' },
        { stage: '$sort', description: 'Ordered results by candidateCount DESC, avgAtsScore DESC' },
        { stage: '$facet', description: 'Multi-faceted output aggregating topSkills, deptAnalytics, and driveCoverage' }
      ],
      totalPortfoliosScanned: portfolios.length,
      matchedCount: matchedPortfolios.length,
      facets: {
        skillDemandMatrix: topSkillsAggregated,
        departmentDistribution: deptOverviewAggregated,
        activeDrivesCount: drives.length
      }
    };
  }
};
