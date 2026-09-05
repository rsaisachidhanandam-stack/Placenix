// ============================================================
// PLACENIX — ENTERPRISE ROUTING PROXY & MULTI-PARADIGM SERVER
// Demonstrates:
// 1. Modular Middleware Pipeline (CORS, Logger, RateLimiter, BodyParser, Sanitizer)
// 2. RESTful API Endpoint Suite with Semantic HTTP Status Codes
// 3. PostgreSQL / Prisma Relational ORM Data Layer
// 4. MongoDB NoSQL Controller (Schema Models, Embedding/Referencing, Aggregation Pipelines)
// 5. Authentication & Security (PBKDF2 Password Hashing, JWT Issuance/Verification, XSS/SQLi Sanitization)
// 6. Redis Caching Acceleration with Cache-Aside Strategy
// 7. RFC 6455 Real-Time WebSocket Server Upgrade & Broadcast
// 8. Dynamic Server-Side Rendering (SSR) with SEO Meta Tags & Hydration
// 9. SQL ACID Transaction Engine with Commit & Rollback
// 10. DevOps Readiness: Probes (/healthz, /api/v1/health), PM2, Docker, Graceful Shutdown
// ============================================================

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Architectural Concept Controllers & Services ─────────────
import { MongoController } from './backend/mongo.js';
import { PlacenixORM } from './backend/orm.js';
import { PasswordHasher } from './backend/auth.js';
import { JwtEngine } from './backend/jwt.js';
import { InputSanitizer } from './backend/sanitizer.js';
import { RedisCache } from './backend/redis.js';
import { WsGateway } from './backend/websocket.js';
import { SsrEngine } from './backend/ssr.js';
import { TransactionEngine } from './backend/transactions.js';
import {
  TokenCostMonitor,
  PromptInjectionGuard,
  RagVectorEngine,
  ToolRegistry,
  MultiStepPlacementAgent,
  StructuredOutputEngine,
  LlmEvalSuite
} from './backend/ai-engine.js';
import { FileUploadHandler } from './backend/file-uploader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 1. ENVIRONMENT VARIABLES & SECRETS MANAGEMENT ─────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.sql': 'text/plain; charset=utf-8',
  '.prisma': 'text/plain; charset=utf-8'
};

// ── In-Memory Drives Repository (REST API State) ───────────────
let drivesDatabase = [
  {
    id: 'drv_google_2026',
    company: 'Google',
    role: 'Software Engineer - Cloud & AI',
    package_lpa: 32.0,
    min_cgpa: 8.0,
    deadline: '2026-11-25',
    eligible_depts: ['CSE', 'IT', 'AI&DS'],
    required_skills: ['Algorithms', 'Distributed Systems', 'C++', 'Go'],
    status: 'Open',
    applicants: 65
  },
  {
    id: 'drv_amazon_2026',
    company: 'Amazon',
    role: 'Software Development Engineer I (SDE-1)',
    package_lpa: 28.0,
    min_cgpa: 7.5,
    deadline: '2026-11-20',
    eligible_depts: ['CSE', 'IT', 'ECE', 'AI&DS'],
    required_skills: ['DSA', 'System Design', 'OOP', 'AWS'],
    status: 'Open',
    applicants: 42
  },
  {
    id: 'drv_zoho_2026',
    company: 'Zoho',
    role: 'Product Developer',
    package_lpa: 8.5,
    min_cgpa: 6.5,
    deadline: '2026-10-30',
    eligible_depts: ['CSE', 'IT', 'ECE', 'MECH'],
    required_skills: ['C/C++', 'Java', 'Data Structures', 'Problem Solving'],
    status: 'Open',
    applicants: 120
  }
];

// ── 2. MODULAR MIDDLEWARE PIPELINE ENGINE ─────────────────────
async function runMiddleware(req, res, middlewares) {
  for (const mw of middlewares) {
    let calledNext = false;
    await new Promise((resolve, reject) => {
      const next = (err) => {
        calledNext = true;
        if (err) reject(err);
        else resolve();
      };
      try {
        const p = mw(req, res, next);
        if (p && typeof p.then === 'function') {
          p.catch(reject);
        }
      } catch (e) {
        reject(e);
      }
    });
    if (!calledNext) return false;
  }
  return true;
}

// Middleware 1: CORS
const corsMiddleware = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  next();
};

// Middleware 2: Structured Request Logger
const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    if (req.url.startsWith('/api') || req.url.startsWith('/ssr') || req.url === '/healthz') {
      console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
    return originalEnd.apply(this, args);
  };
  next();
};

// Middleware 3: Safe JSON Body Parser with Injection Sanitization
const jsonBodyParserMiddleware = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type']?.includes('application/json')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large', statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const rawJson = body ? JSON.parse(body) : {};
        // Strip dangerous NoSQL operator injections and sanitize payload
        req.body = InputSanitizer.sanitizeNoSqlObject(rawJson);
        next();
      } catch (err) {
        sendErrorResponse(res, 400, 'Invalid JSON in request payload', err.message);
      }
    });
  } else {
    req.body = {};
    next();
  }
};

// Middleware 4: Rate Limiting Guard
const rateLimitMap = new Map();
const rateLimiterMiddleware = (req, res, next) => {
  if (!req.url.startsWith('/api')) return next();

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60000 };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + 60000;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);

  if (record.count > 500) {
    return sendErrorResponse(res, 429, 'Too Many Requests', 'Rate limit exceeded. Please try again in 1 minute.');
  }
  next();
};

// ── 3. STANDARDIZED API RESPONSE HELPERS ──────────────────────
function sendJsonResponse(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...headers
  });
  res.end(JSON.stringify(data));
}

function sendErrorResponse(res, statusCode, error, message = '') {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    statusCode,
    error,
    message: message || error,
    timestamp: new Date().toISOString()
  }));
}

// ── 4. RESTFUL ROUTE HANDLERS ─────────────────────────────────
async function handleApiRoutes(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  // ── CONCEPT 7 & 13: HEALTH & DEVOPS PROBES ──────────────────
  if ((pathname === '/api/v1/health' || pathname === '/healthz') && method === 'GET') {
    return sendJsonResponse(res, 200, {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      subsystems: {
        apiServer: 'online',
        staticServer: 'online',
        prismaOrm: 'configured',
        mongoNoSql: 'active',
        redisCache: 'operational',
        webSocketGateway: `${WsGateway.clients.size} active clients`,
        jwtAuthEngine: 'ready'
      }
    });
  }

  // ── CONCEPT 14: REDIS CACHING DEMO & TELEMETRY ───────────────
  if (pathname === '/api/v1/cache/demo' && method === 'GET') {
    const cacheKey = 'drives:cache_aside_demo';
    const result = await RedisCache.remember(cacheKey, 30, async () => {
      // Simulate heavy database read / analytical calculation
      await new Promise(r => setTimeout(r, 120));
      return {
        catalogSummary: 'Top Campus Recruitment Drives',
        totalDrives: drivesDatabase.length,
        companies: drivesDatabase.map(d => d.company),
        fetchedFromDatabaseAt: new Date().toISOString()
      };
    });

    return sendJsonResponse(res, 200, {
      success: true,
      ...result
    }, {
      'X-Cache': result.cacheStatus,
      'X-Response-Time-Ms': String(result.responseTimeMs)
    });
  }

  if (pathname === '/api/v1/cache/telemetry' && method === 'GET') {
    return sendJsonResponse(res, 200, {
      success: true,
      telemetry: RedisCache.getTelemetry()
    });
  }

  if (pathname === '/api/v1/cache/flush' && method === 'POST') {
    const cleared = RedisCache.flushAll();
    return sendJsonResponse(res, 200, {
      success: true,
      message: `Flushed ${cleared} keys from Redis cache.`
    });
  }

  // ── CONCEPT 4: PASSWORD HASHING & VERIFICATION ───────────────
  if (pathname === '/api/v1/auth/hash-password' && method === 'POST') {
    const { password } = req.body;
    if (!password) {
      return sendErrorResponse(res, 400, 'Bad Request', 'Password field is required.');
    }
    const hashResult = await PasswordHasher.hashPassword(password);
    const strength = PasswordHasher.evaluateStrength(password);
    return sendJsonResponse(res, 200, {
      success: true,
      securityAnalysis: strength,
      ...hashResult
    });
  }

  if (pathname === '/api/v1/auth/verify-password' && method === 'POST') {
    const { password, serializedHash } = req.body;
    if (!password || !serializedHash) {
      return sendErrorResponse(res, 400, 'Bad Request', 'Both password and serializedHash are required.');
    }
    const isValid = await PasswordHasher.verifyPassword(password, serializedHash);
    return sendJsonResponse(res, 200, {
      success: true,
      match: isValid,
      verificationMethod: 'Constant-time crypto.timingSafeEqual'
    });
  }

  // ── CONCEPT 11: JWT ISSUANCE & VERIFICATION ───────────────────
  if (pathname === '/api/v1/auth/jwt/issue' && method === 'POST') {
    const { userId, email, role } = req.body;
    const tokenData = JwtEngine.sign({
      sub: userId || 'usr_demo_101',
      email: email || 'student@placenix.edu',
      role: role || 'student',
      permissions: ['view:drives', 'apply:drives', 'run:interview_dojo']
    }, { expiresInSeconds: 3600 });

    return sendJsonResponse(res, 200, {
      success: true,
      message: 'JWT issued successfully.',
      ...tokenData
    });
  }

  if (pathname === '/api/v1/auth/jwt/verify' && method === 'POST') {
    const { token } = req.body;
    const authHeader = req.headers['authorization'];
    const bearerToken = token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!bearerToken) {
      return sendErrorResponse(res, 401, 'Unauthorized', 'No JWT token provided in body or Authorization header.');
    }

    const verification = JwtEngine.verify(bearerToken);
    if (!verification.valid) {
      return sendErrorResponse(res, 401, 'Invalid Token', verification.error);
    }

    return sendJsonResponse(res, 200, {
      success: true,
      ...verification
    });
  }

  // ── CONCEPT 12: INPUT SANITIZATION & INJECTION AUDIT ──────────
  if (pathname === '/api/v1/security/sanitize' && method === 'POST') {
    const audit = InputSanitizer.auditAndSanitizePayload(req.body);
    const sqlParamDemo = InputSanitizer.buildParameterizedSqlQuery('profiles', {
      department_id: req.body.department || 'CSE',
      status: 'Placed'
    });

    return sendJsonResponse(res, 200, {
      success: true,
      securityAudit: audit,
      parameterizedQuerySample: sqlParamDemo
    });
  }

  // ── CONCEPT 1 & 8: MONGODB EMBEDDED VS REFERENCED RELATIONSHIPS
  if (pathname === '/api/v1/mongo/portfolio/relationships' && method === 'GET') {
    try {
      const studentId = urlObj.searchParams.get('studentId') || 'usr_student_01';
      const result = await MongoController.getStudentPortfolioWithRelationships(studentId);
      return sendJsonResponse(res, 200, { success: true, data: result });
    } catch (err) {
      return sendErrorResponse(res, err.statusCode || 500, 'Database Error', err.message);
    }
  }

  // ── CONCEPT 9: MONGODB MULTI-STAGE AGGREGATION PIPELINE ──────
  if (pathname === '/api/v1/mongo/analytics/pipeline' && method === 'GET') {
    try {
      const minAts = urlObj.searchParams.get('minAts') || 75;
      const analytics = await MongoController.runAggregationPipeline({ minAts });
      return sendJsonResponse(res, 200, { success: true, analytics });
    } catch (err) {
      return sendErrorResponse(res, 500, 'Pipeline Error', err.message);
    }
  }

  // ── CONCEPT 3: PRISMA / SEQUELIZE RELATIONAL ORM ─────────────
  if (pathname === '/api/v1/orm/profiles' && method === 'GET') {
    const dept = urlObj.searchParams.get('department_id');
    const status = urlObj.searchParams.get('status');
    const includeDept = urlObj.searchParams.get('includeDepartment') !== 'false';
    const includeSection = urlObj.searchParams.get('includeSection') !== 'false';

    const profiles = await PlacenixORM.profile.findMany({
      where: {
        ...(dept ? { department_id: dept } : {}),
        ...(status ? { status } : {})
      },
      include: {
        department: includeDept,
        section: includeSection,
        applications: true
      },
      orderBy: { cgpa: 'desc' }
    });

    return sendJsonResponse(res, 200, {
      success: true,
      ormClient: 'Prisma Client JS (PostgreSQL)',
      count: profiles.length,
      data: profiles
    });
  }

  if (pathname === '/api/v1/orm/summary' && method === 'GET') {
    return sendJsonResponse(res, 200, {
      success: true,
      summary: PlacenixORM.getSchemaSummary()
    });
  }

  // ── CONCEPT 10: SQL ACID TRANSACTIONS ─────────────────────────
  if (pathname === '/api/v1/sql/transaction/book-slot' && method === 'POST') {
    const { driveId, studentId, studentName, venueName, slotTime } = req.body;
    const txResult = await TransactionEngine.executeSlotBookingTransaction({
      driveId: driveId || 'drv_amazon_2026',
      studentId: studentId || 'usr_std_101',
      studentName: studentName || 'Rahul Sharma',
      venueName: venueName || 'Audi 1 - Station 2',
      slotTime: slotTime || '11:00 AM'
    });

    // Invalidate cached drives in Redis on mutation
    await RedisCache.invalidatePattern('drives:*');

    // Broadcast live event via WebSocket
    WsGateway.broadcast('drives', 'SLOT_BOOKED', {
      driveId,
      studentName,
      txId: txResult.txSummary?.txId,
      status: txResult.success ? 'CONFIRMED' : 'FAILED'
    });

    return sendJsonResponse(res, txResult.success ? 200 : 409, txResult);
  }

  if (pathname === '/api/v1/sql/transaction/history' && method === 'GET') {
    return sendJsonResponse(res, 200, {
      success: true,
      history: TransactionEngine.getTransactionHistory()
    });
  }

  // ── CONCEPT 15: WEBSOCKET TELEMETRY & BROADCAST TEST ──────────
  if (pathname === '/api/v1/realtime/broadcast' && method === 'POST') {
    const { channel, eventType, data } = req.body;
    const result = WsGateway.broadcast(channel || 'general', eventType || 'TEST_BROADCAST', data || { message: 'Hello from API!' });
    return sendJsonResponse(res, 200, { success: true, result });
  }

  if (pathname === '/api/v1/realtime/telemetry' && method === 'GET') {
    return sendJsonResponse(res, 200, {
      success: true,
      telemetry: WsGateway.getTelemetry()
    });
  }

  // ── DRIVES REST API: /api/v1/drives ──────────────────────────
  if (pathname === '/api/v1/drives') {
    if (method === 'GET') {
      const statusFilter = urlObj.searchParams.get('status');
      let results = [...drivesDatabase];
      if (statusFilter) {
        results = results.filter(d => d.status.toLowerCase() === statusFilter.toLowerCase());
      }
      return sendJsonResponse(res, 200, {
        success: true,
        count: results.length,
        data: results
      });
    }

    if (method === 'POST') {
      const { company, role, package_lpa, min_cgpa, deadline, eligible_depts, required_skills } = req.body;
      
      if (!company || !role || !package_lpa || !deadline) {
        return sendErrorResponse(res, 422, 'Unprocessable Entity', 'company, role, package_lpa, and deadline are required fields.');
      }

      const newDrive = {
        id: 'drv_' + Date.now().toString(36),
        company: String(company).trim(),
        role: String(role).trim(),
        package_lpa: parseFloat(package_lpa) || 0.0,
        min_cgpa: parseFloat(min_cgpa) || 0.0,
        deadline: String(deadline).trim(),
        eligible_depts: Array.isArray(eligible_depts) ? eligible_depts : ['CSE', 'IT'],
        required_skills: Array.isArray(required_skills) ? required_skills : ['Aptitude', 'Technical', 'HR'],
        status: 'Open',
        applicants: 0,
        createdAt: new Date().toISOString()
      };

      drivesDatabase.unshift(newDrive);
      await RedisCache.invalidatePattern('drives:*');

      // Real-time broadcast
      WsGateway.broadcast('drives', 'DRIVE_CREATED', newDrive);

      return sendJsonResponse(res, 201, {
        success: true,
        message: 'Recruitment drive created successfully.',
        data: newDrive
      });
    }
  }

  // ── MONGODB NOSQL REST API: /api/v1/mongo/logs ───────────────
  if (pathname === '/api/v1/mongo/logs') {
    if (method === 'GET') {
      try {
        const filter = {
          eventType: urlObj.searchParams.get('eventType'),
          severity: urlObj.searchParams.get('severity'),
          userId: urlObj.searchParams.get('userId'),
          search: urlObj.searchParams.get('search'),
          limit: urlObj.searchParams.get('limit'),
          page: urlObj.searchParams.get('page')
        };
        const result = await MongoController.getAuditLogs(filter);
        return sendJsonResponse(res, 200, { success: true, ...result });
      } catch (err) {
        return sendErrorResponse(res, err.statusCode || 500, 'Database Error', err.message);
      }
    }

    if (method === 'POST') {
      try {
        const createdDoc = await MongoController.createAuditLog(req.body);
        return sendJsonResponse(res, 201, { success: true, message: 'MongoDB document created.', data: createdDoc });
      } catch (err) {
        return sendErrorResponse(res, err.statusCode || 400, 'Creation Failed', err.message);
      }
    }
  }

  // ── SQL JOIN DEMO REPORT: /api/v1/reports/joined-data ────────
  if (pathname === '/api/v1/reports/joined-data' && method === 'GET') {
    const joinedReport = [
      {
        student_id: 'usr_std_101',
        student_name: 'Rahul Sharma',
        register_number: 'RA2111003010045',
        cgpa: 9.24,
        department_code: 'CSE',
        department_name: 'Computer Science & Engineering',
        section_name: 'A',
        placement_status: 'Placed',
        company: 'Google',
        package_lpa: 32.0,
        join_type: 'INNER JOIN (profiles + departments + sections)'
      },
      {
        student_id: 'usr_std_102',
        student_name: 'Sneha Mishra',
        register_number: 'RA2111003010088',
        cgpa: 8.95,
        department_code: 'IT',
        department_name: 'Information Technology',
        section_name: 'B',
        placement_status: 'Placed',
        company: 'Microsoft',
        package_lpa: 26.0,
        join_type: 'INNER JOIN (profiles + departments + sections)'
      }
    ];

    return sendJsonResponse(res, 200, {
      success: true,
      reportName: 'Relational Multi-Table Joined Placement Telemetry',
      generatedAt: new Date().toISOString(),
      data: joinedReport
    });
  }

  // ── FILE UPLOAD ENDPOINT: /api/v1/files/upload ───────────────
  if (pathname === '/api/v1/files/upload' && method === 'POST') {
    try {
      const uploadResult = FileUploadHandler.processBase64Upload(req.body || {});
      return sendJsonResponse(res, 201, {
        success: true,
        message: 'File successfully uploaded and indexed.',
        data: uploadResult
      });
    } catch (err) {
      return sendErrorResponse(res, err.statusCode || 400, 'Upload Failed', err.message);
    }
  }

  // ── RESUME UPLOAD & ATS PARSE: /api/v1/resumes/upload ────────
  if (pathname === '/api/v1/resumes/upload' && method === 'POST') {
    try {
      const uploadResult = FileUploadHandler.processBase64Upload(req.body || {});
      const atsResult = StructuredOutputEngine.generateStructuredAts(uploadResult.extractedSnippet, req.body.jobTitle || 'Software Engineer');
      return sendJsonResponse(res, 201, {
        success: true,
        message: 'Resume uploaded and parsed with ATS intelligence.',
        file: uploadResult,
        atsAnalysis: atsResult.data
      });
    } catch (err) {
      return sendErrorResponse(res, err.statusCode || 400, 'Resume Processing Failed', err.message);
    }
  }

  // ── STRUCTURED OUTPUT GENERATION: /api/v1/ai/structured ──────
  if (pathname === '/api/v1/ai/structured' && method === 'POST') {
    const { resumeText, jobTitle } = req.body || {};
    const result = StructuredOutputEngine.generateStructuredAts(resumeText || 'Full Stack Engineer with React, Node, PostgreSQL, Docker', jobTitle || 'SWE');
    TokenCostMonitor.recordCall({
      model: 'gemini-1.5-flash',
      promptText: resumeText || '',
      completionText: JSON.stringify(result.data),
      latencyMs: 45
    });
    return sendJsonResponse(res, 200, result);
  }

  // ── STREAMING RESPONSES (SSE): /api/v1/ai/stream ─────────────
  if (pathname === '/api/v1/ai/stream' && (method === 'GET' || method === 'POST')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const prompt = (req.body && req.body.prompt) || urlObj.searchParams.get('prompt') || 'Provide an overview of placement preparation strategy';
    const chunks = [
      'Welcome to Placenix Placement Copilot.\n\n',
      'Phase 1: Foundation (Data Structures & Algorithms in C++/Java).\n',
      'Phase 2: Core Computer Science (OS, DBMS, Computer Networks).\n',
      'Phase 3: System Design & Scalable Architectures.\n',
      'Phase 4: Behavioral & Leadership Mock Practice with Real-Time Feedback.\n\n',
      'All metrics synchronized with Placenix Real-Time Gateway.'
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < chunks.length) {
        const payload = JSON.stringify({ token: chunks[index], index, done: false });
        res.write(`data: ${payload}\n\n`);
        index++;
      } else {
        res.write(`data: ${JSON.stringify({ token: '', done: true })}\n\n`);
        res.write('data: [DONE]\n\n');
        clearInterval(interval);
        res.end();

        TokenCostMonitor.recordCall({
          model: 'gemini-1.5-flash',
          promptText: prompt,
          completionText: chunks.join(''),
          latencyMs: chunks.length * 100,
          isStream: true
        });
      }
    }, 100);

    req.on('close', () => {
      clearInterval(interval);
    });
    return;
  }

  // ── FUNCTION CALLING / TOOL USE: /api/v1/ai/tools/execute ────
  if (pathname === '/api/v1/ai/tools/execute' && method === 'POST') {
    const { toolName, params } = req.body || {};
    if (!toolName) {
      return sendErrorResponse(res, 422, 'Unprocessable Entity', 'toolName is required.');
    }
    try {
      const toolResult = await ToolRegistry.invokeTool(toolName, params || {});
      return sendJsonResponse(res, 200, { success: true, ...toolResult });
    } catch (err) {
      return sendErrorResponse(res, 400, 'Tool Execution Error', err.message);
    }
  }

  // ── RAG SEARCH & RETRIEVAL: /api/v1/ai/rag/search & /api/v1/ai/rag/query ──
  if (pathname === '/api/v1/ai/rag/search' && method === 'POST') {
    const { query, topK } = req.body || {};
    if (!query) return sendErrorResponse(res, 422, 'Unprocessable Entity', 'query string is required.');
    const results = RagVectorEngine.search(query, topK || 3);
    return sendJsonResponse(res, 200, { success: true, query, topK: topK || 3, results });
  }

  if (pathname === '/api/v1/ai/rag/query' && method === 'POST') {
    const { query, topK } = req.body || {};
    if (!query) return sendErrorResponse(res, 422, 'Unprocessable Entity', 'query string is required.');
    const ragAugmented = RagVectorEngine.augmentPrompt(query, topK || 3);
    const simulatedAnswer = `Based on Placenix placement policy records: ${ragAugmented.retrievedChunks.map(c => c.content).join(' ')}`;
    
    TokenCostMonitor.recordCall({
      model: 'gemini-1.5-flash',
      promptText: ragAugmented.prompt,
      completionText: simulatedAnswer,
      latencyMs: 65
    });

    return sendJsonResponse(res, 200, {
      success: true,
      query,
      answer: simulatedAnswer,
      retrievedChunks: ragAugmented.retrievedChunks,
      augmentedPrompt: ragAugmented.prompt
    });
  }

  // ── PROMPT INJECTION DEFENSES: /api/v1/ai/defense/check ───────
  if (pathname === '/api/v1/ai/defense/check' && method === 'POST') {
    const { prompt, systemInstructions } = req.body || {};
    if (!prompt) return sendErrorResponse(res, 422, 'Unprocessable Entity', 'prompt is required.');
    const defenseResult = PromptInjectionGuard.wrapWithDefenses(
      systemInstructions || 'Evaluate candidate placement suitability.',
      prompt
    );
    return sendJsonResponse(res, 200, { success: true, ...defenseResult });
  }

  // ── TOKEN & COST MONITORING: /api/v1/ai/metrics ───────────────
  if (pathname === '/api/v1/ai/metrics' && method === 'GET') {
    return sendJsonResponse(res, 200, TokenCostMonitor.getTelemetry());
  }

  // ── MULTI-STEP AGENT: /api/v1/ai/agent/run ───────────────────
  if (pathname === '/api/v1/ai/agent/run' && method === 'POST') {
    const { goal, studentId, targetRole } = req.body || {};
    const agentResult = await MultiStepPlacementAgent.run({
      goal: goal || 'Determine placement strategy and highest-value drive for candidate',
      studentId: studentId || 'std_101',
      targetRole: targetRole || 'SWE'
    });
    return sendJsonResponse(res, 200, agentResult);
  }

  // ── LLM EVALUATION BENCHMARK: /api/v1/ai/eval/run ────────────
  if (pathname === '/api/v1/ai/eval/run' && method === 'POST') {
    const evalReport = await LlmEvalSuite.runBenchmark();
    return sendJsonResponse(res, 200, evalReport);
  }

  // ── LLM AI GATEWAY PROXY: /api/ai & /api/v1/ai/generate ──────
  if ((pathname === '/api/ai' || pathname === '/api/v1/ai/generate') && method === 'POST') {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey && !apiKey.startsWith('AQ.')) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      const proxyReq = https.request(geminiUrl, options, proxyRes => {
        res.writeHead(proxyRes.statusCode || 200, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json'
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', err => {
        console.error('❌ Gemini Proxy request failed:', err);
        sendErrorResponse(res, 502, 'Bad Gateway', err.message);
      });

      proxyReq.write(JSON.stringify(req.body));
      proxyReq.end();
      return;
    }

    // Resilient simulated LLM response with prompt engineering
    const userPrompt = JSON.stringify(req.body);
    const simulatedText = `Placenix AI Analysis: Successfully processed prompt with systematic prompt framing, role persona validation, and zero-shot reasoning. Ready for downstream evaluation.`;
    TokenCostMonitor.recordCall({
      model: 'gemini-1.5-flash',
      promptText: userPrompt,
      completionText: simulatedText,
      latencyMs: 80
    });

    return sendJsonResponse(res, 200, {
      candidates: [
        {
          content: {
            parts: [{ text: simulatedText }],
            role: 'model'
          },
          finishReason: 'STOP'
        }
      ],
      usageMetadata: {
        promptTokenCount: TokenCostMonitor.estimateTokens(userPrompt),
        candidatesTokenCount: TokenCostMonitor.estimateTokens(simulatedText),
        totalTokenCount: TokenCostMonitor.estimateTokens(userPrompt) + TokenCostMonitor.estimateTokens(simulatedText)
      }
    });
  }

  return sendErrorResponse(res, 404, 'Not Found', `The API endpoint '${method} ${pathname}' does not exist.`);
}

// ── 5. SSR & STATIC FILES SERVING ─────────────────────────────
function handleSsrRoutes(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (urlObj.pathname === '/ssr/drives') {
    const html = SsrEngine.renderDrivesPage(drivesDatabase, `http://${req.headers.host || 'localhost:3000'}`);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return true;
  }
  return false;
}

function serveStaticFile(req, res) {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Prevent directory traversal attacks
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Access outside workspace boundary denied.');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      serveIndexHTML(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (ext === '.html') {
      serveIndexHTML(res, filePath);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

function serveIndexHTML(res, customPath) {
  const indexPath = customPath || path.join(PUBLIC_DIR, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error: Missing index.html in server root.');
      return;
    }

    const envScript = `
  <script id="placenix-env">
    window.__ENV__ = {
      SUPABASE_URL: ${JSON.stringify(process.env.SUPABASE_URL || '')},
      SUPABASE_ANON_KEY: ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')},
      HAS_REAL_GEMINI_KEY: ${!!(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('AQ.'))}
    };
  </script>
`;
    const finalHtml = html.replace('<!-- __ENV_PLACEHOLDER__ -->', envScript);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(finalHtml);
  });
}

// ── 6. MAIN HTTP SERVER INITIALIZATION & WS UPGRADE ───────────
const server = http.createServer(async (req, res) => {
  try {
    const middlewares = [
      corsMiddleware,
      requestLoggerMiddleware,
      rateLimiterMiddleware,
      jsonBodyParserMiddleware
    ];

    const shouldContinue = await runMiddleware(req, res, middlewares);
    if (!shouldContinue) return;

    if (req.url.startsWith('/ssr')) {
      const handled = handleSsrRoutes(req, res);
      if (handled) return;
    }

    if (req.url.startsWith('/api') || req.url === '/healthz') {
      await handleApiRoutes(req, res);
    } else {
      serveStaticFile(req, res);
    }
  } catch (err) {
    console.error('🔥 Server-side Uncaught Exception:', err);
    sendErrorResponse(res, err.statusCode || 500, 'Internal Server Error', err.message);
  }
});

// Attach WebSocket Upgrade Handler
server.on('upgrade', (req, socket, head) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (urlObj.pathname === '/ws' || urlObj.pathname === '/socket') {
    WsGateway.handleUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Placenix Enterprise Server running on http://localhost:${PORT}`);
  console.log(`🛡️ Middleware: CORS, Logger, RateLimiter, BodyParser, Sanitizer`);
  console.log(`📡 REST API: /api/v1/health, /api/v1/drives, /api/v1/mongo/logs`);
  console.log(`⚡ Caching: Redis Cache-Aside enabled (/api/v1/cache/demo)`);
  console.log(`🌐 Real-Time: RFC 6455 WebSocket Gateway at ws://localhost:${PORT}/ws`);
  console.log(`📄 SSR Engine: Server-Side Rendered Drives at http://localhost:${PORT}/ssr/drives`);
  console.log(`=======================================================`);
});

// Graceful Shutdown for Container Orchestrators
const handleShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully closing Placenix server...`);
  server.close(() => {
    console.log('✅ HTTP & WebSocket servers closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
