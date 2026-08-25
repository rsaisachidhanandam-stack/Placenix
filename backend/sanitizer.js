// ============================================================
// PLACENIX — INPUT SANITIZATION & INJECTION DEFENSE SYSTEM
// Demonstrates:
// 1. SQL Injection Prevention (Parameterized queries & SQL metacharacter sanitization)
// 2. NoSQL Operator Injection Defense (Stripping $where, $gt, $ne, $regex from payloads)
// 3. Cross-Site Scripting (XSS) Sanitization (HTML Entity Encoding & DOM Protection)
// 4. Input Validation & Type Coercion Guards
// ============================================================

export const InputSanitizer = {
  /**
   * Neutralizes XSS by escaping HTML special entities
   */
  sanitizeHtml: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * NoSQL Injection Defense:
   * Recursively removes all keys starting with '$' or containing prototype pollution keywords
   */
  sanitizeNoSqlObject: (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => InputSanitizer.sanitizeNoSqlObject(item));
    }

    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      // Reject MongoDB operator injection keys ($where, $gt, $ne, $regex, etc.)
      if (key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue; // Strip hazardous keys
      }
      clean[key] = InputSanitizer.sanitizeNoSqlObject(value);
    }
    return clean;
  },

  /**
   * SQL Injection Defense:
   * Demonstrates Parameterized Query Compilation vs Raw Injection Hazards
   */
  buildParameterizedSqlQuery: (tableName, filters = {}) => {
    const validTables = ['profiles', 'drives', 'departments', 'sections', 'drive_applications'];
    if (!validTables.includes(tableName)) {
      throw new Error(`Invalid table name '${tableName}' for SQL query builder.`);
    }

    const keys = Object.keys(filters);
    if (keys.length === 0) {
      return {
        sql: `SELECT * FROM ${tableName}`,
        parameters: []
      };
    }

    const conditions = keys.map((key, idx) => {
      // Whitelist column names to avoid column-level injection
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      return `${safeKey} = $${idx + 1}`;
    });

    const values = keys.map(k => filters[k]);

    return {
      sql: `SELECT * FROM ${tableName} WHERE ${conditions.join(' AND ')}`,
      parameters: values,
      securityGuarantee: 'Parameterized query: inputs are sent as bound data values, never evaluated as SQL syntax.'
    };
  },

  /**
   * Comprehensive Security Audit & Sanitization Pipeline
   */
  auditAndSanitizePayload: (rawPayload) => {
    const detections = [];
    const rawString = JSON.stringify(rawPayload);

    // XSS Detection
    if (/<script|javascript:|onerror=|onload=/i.test(rawString)) {
      detections.push({
        type: 'XSS_ATTEMPT',
        severity: 'HIGH',
        detail: 'Script tags or inline JavaScript event handlers detected in payload.'
      });
    }

    // NoSQL Injection Detection
    if (/\$(?:where|gt|gte|lt|lte|ne|in|nin|regex|expr)/i.test(rawString)) {
      detections.push({
        type: 'NOSQL_INJECTION_ATTEMPT',
        severity: 'CRITICAL',
        detail: 'MongoDB query operator keywords ($gt, $ne, $where) detected in input JSON.'
      });
    }

    // SQL Injection Detection
    if (/(\b(?:UNION\s+SELECT|DROP\s+TABLE|ALTER\s+TABLE|OR\s+1=1|--|;\s*DELETE)\b)/i.test(rawString)) {
      detections.push({
        type: 'SQL_INJECTION_ATTEMPT',
        severity: 'CRITICAL',
        detail: 'Classic SQL injection sequences (UNION SELECT, OR 1=1, DROP TABLE) detected.'
      });
    }

    // Sanitize
    const sanitizedNoSql = InputSanitizer.sanitizeNoSqlObject(rawPayload);

    // Deep HTML sanitization for string fields
    const deepHtmlSanitize = (data) => {
      if (typeof data === 'string') return InputSanitizer.sanitizeHtml(data);
      if (Array.isArray(data)) return data.map(deepHtmlSanitize);
      if (data && typeof data === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(data)) {
          out[k] = deepHtmlSanitize(v);
        }
        return out;
      }
      return data;
    };

    const sanitizedClean = deepHtmlSanitize(sanitizedNoSql);

    return {
      originalPayload: rawPayload,
      detections,
      hasThreats: detections.length > 0,
      sanitizedPayload: sanitizedClean
    };
  }
};
