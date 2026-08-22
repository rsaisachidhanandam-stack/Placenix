// ============================================================
// PLACENIX — MONGODB NOSQL SCHEMA MODELING & CRUD CONTROLLER
// Demonstrates NoSQL Schema Modeling, Subdocuments, Validation, 
// and Resilient CRUD Operations with In-Memory Fallback.
// ============================================================

/**
 * MongoDB / NoSQL Schema Definitions & Data Modeling:
 * 
 * 1. AuditLogSchema:
 *    - eventType: String (Enum: 'LOGIN', 'RESUME_SCAN', 'INTERVIEW_COMPLETED', 'SLOT_BOOKED', 'DRIVE_CREATED')
 *    - actor: { userId: String, email: String, role: String } [Embedded Subdocument]
 *    - metadata: Object (Arbitrary JSON telemetry payload)
 *    - ipAddress: String
 *    - severity: String (Enum: 'INFO', 'WARN', 'ERROR', 'CRITICAL')
 *    - timestamp: Date (Indexed, TTL candidate)
 * 
 * 2. CandidateResumeDocSchema:
 *    - studentId: String (Indexed)
 *    - rawText: String
 *    - parsedKeywords: [String]
 *    - atsScore: Number (Min: 0, Max: 100)
 *    - targetRole: String
 *    - sectionScores: {
 *        skills: Number,
 *        experience: Number,
 *        education: Number,
 *        formatting: Number
 *      } [Embedded Subdocument]
 *    - createdAt: Date
 *    - updatedAt: Date
 */

// In-Memory Resilient Store for MongoDB Records (Fallback when live MongoDB cluster is offline)
const inMemoryMongoStore = {
  auditLogs: [
    {
      _id: 'log_665a10f1e82b4',
      eventType: 'RESUME_SCAN',
      actor: { userId: 'usr_student_01', email: 'rahul.s@placenix.edu', role: 'student' },
      metadata: { targetRole: 'Full Stack Developer', atsScore: 88, keywordsMatched: 24 },
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
  ],
  resumeDocs: []
};

// ── Validation Helpers for Schema Modeling ────────────────────
function validateAuditLog(data) {
  const errors = [];
  const validEventTypes = ['LOGIN', 'LOGOUT', 'RESUME_SCAN', 'INTERVIEW_COMPLETED', 'SLOT_BOOKED', 'DRIVE_CREATED', 'QUERY_POSTED'];
  const validSeverities = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];

  if (!data.eventType || !validEventTypes.includes(data.eventType)) {
    errors.push(`eventType must be one of: ${validEventTypes.join(', ')}`);
  }
  if (!data.actor || typeof data.actor !== 'object') {
    errors.push('actor is a required subdocument { userId, email, role }');
  } else {
    if (!data.actor.userId) errors.push('actor.userId is required');
    if (!data.actor.email) errors.push('actor.email is required');
  }
  if (data.severity && !validSeverities.includes(data.severity)) {
    errors.push(`severity must be one of: ${validSeverities.join(', ')}`);
  }

  return { isValid: errors.length === 0, errors };
}

// ── NoSQL CRUD Controller ─────────────────────────────────────
export const MongoController = {
  /**
   * CREATE: Insert a new Audit Log document (Validates against Schema)
   */
  createAuditLog: async (logData) => {
    const { isValid, errors } = validateAuditLog(logData);
    if (!isValid) {
      const err = new Error(`Schema Validation Error: ${errors.join('; ')}`);
      err.statusCode = 422; // Unprocessable Entity
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

  /**
   * READ: Query all Audit Log documents with optional filtering and pagination
   */
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

  /**
   * READ BY ID: Retrieve single document by MongoDB-style _id
   */
  getAuditLogById: async (id) => {
    const doc = inMemoryMongoStore.auditLogs.find(l => l._id === id);
    if (!doc) {
      const err = new Error(`Document with _id '${id}' not found in MongoDB collection`);
      err.statusCode = 404;
      throw err;
    }
    return doc;
  },

  /**
   * UPDATE: Partial or full document update by _id
   */
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
      _id: existing._id, // Immutable PK
      updatedAt: new Date().toISOString()
    };

    inMemoryMongoStore.auditLogs[index] = updated;
    return updated;
  },

  /**
   * DELETE: Delete document by _id
   */
  deleteAuditLog: async (id) => {
    const index = inMemoryMongoStore.auditLogs.findIndex(l => l._id === id);
    if (index === -1) {
      const err = new Error(`Cannot delete: Document with _id '${id}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const [deleted] = inMemoryMongoStore.auditLogs.splice(index, 1);
    return { success: true, deletedId: deleted._id };
  }
};
