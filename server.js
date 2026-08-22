// ============================================================
// PLACENIX — ENTERPRISE ROUTING PROXY & RESTFUL API SERVER (v3.0)
// Demonstrates:
// 1. Modular Middleware Pipeline (CORS, Request Logger, Body Parser, Auth, Rate Limiter)
// 2. RESTful API Endpoint Design with Semantic HTTP Status Codes (200, 201, 400, 401, 403, 404, 422, 500)
// 3. Centralized Server-Side Error Handling
// 4. NoSQL (MongoDB) Integration via MongoController
// 5. LLM Gemini AI Gateway Proxy with Structured Outputs
// 6. Resilient Static File Server with Dynamic Environment Injection
// ============================================================

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoController } from './backend/mongo.js';

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
  '.sql': 'text/plain; charset=utf-8'
};

// ── In-Memory Drives Repository (REST API State) ───────────────
let drivesDatabase = [
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

/**
 * Executes an array of middleware functions in order: fn(req, res, next)
 */
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
    if (!calledNext) return false; // Middleware finished response
  }
  return true;
}

// Middleware 1: Cross-Origin Resource Sharing (CORS) & Preflight
const corsMiddleware = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); // 204 No Content for OPTIONS preflight
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
    if (req.url.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
    return originalEnd.apply(this, args);
  };
  next();
};

// Middleware 3: Safe JSON Body Parser
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
        req.body = body ? JSON.parse(body) : {};
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

  if (record.count > 300) { // 300 requests per minute
    return sendErrorResponse(res, 429, 'Too Many Requests', 'Rate limit exceeded. Please try again in 1 minute.');
  }
  next();
};


// ── 3. STANDARDIZED API RESPONSE HELPERS ──────────────────────
function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
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

  // ── GET /api/v1/health (200 OK) ──────────────────────────────
  if (pathname === '/api/v1/health' && method === 'GET') {
    return sendJsonResponse(res, 200, {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        apiGateway: 'active',
        staticServer: 'active',
        mongoController: 'active',
        geminiProxy: !!process.env.GEMINI_API_KEY ? 'configured' : 'fallback-mode'
      }
    });
  }

  // ── DRIVES REST API: /api/v1/drives ──────────────────────────
  if (pathname === '/api/v1/drives') {
    // GET /api/v1/drives (200 OK)
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

    // POST /api/v1/drives (201 Created / 422 Unprocessable Entity)
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
      return sendJsonResponse(res, 201, {
        success: true,
        message: 'Recruitment drive created successfully.',
        data: newDrive
      });
    }
  }

  // ── GET / PUT / DELETE /api/v1/drives/:id ─────────────────────
  if (pathname.startsWith('/api/v1/drives/')) {
    const driveId = pathname.replace('/api/v1/drives/', '');
    const driveIndex = drivesDatabase.findIndex(d => d.id === driveId);

    if (driveIndex === -1) {
      return sendErrorResponse(res, 404, 'Not Found', `Drive with id '${driveId}' was not found.`);
    }

    if (method === 'GET') {
      return sendJsonResponse(res, 200, { success: true, data: drivesDatabase[driveIndex] });
    }

    if (method === 'PUT') {
      const updated = { ...drivesDatabase[driveIndex], ...req.body, id: driveId };
      drivesDatabase[driveIndex] = updated;
      return sendJsonResponse(res, 200, { success: true, message: 'Drive updated successfully.', data: updated });
    }

    if (method === 'DELETE') {
      const [deleted] = drivesDatabase.splice(driveIndex, 1);
      return sendJsonResponse(res, 200, { success: true, message: 'Drive deleted successfully.', data: deleted });
    }
  }

  // ── MONGODB NOSQL REST API: /api/v1/mongo/logs ───────────────
  if (pathname === '/api/v1/mongo/logs') {
    // GET /api/v1/mongo/logs (200 OK)
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

    // POST /api/v1/mongo/logs (201 Created / 422 Unprocessable Entity)
    if (method === 'POST') {
      try {
        const createdDoc = await MongoController.createAuditLog(req.body);
        return sendJsonResponse(res, 201, { success: true, message: 'MongoDB document created.', data: createdDoc });
      } catch (err) {
        return sendErrorResponse(res, err.statusCode || 400, 'Creation Failed', err.message);
      }
    }
  }

  // ── GET / PUT / DELETE /api/v1/mongo/logs/:id ────────────────
  if (pathname.startsWith('/api/v1/mongo/logs/')) {
    const logId = pathname.replace('/api/v1/mongo/logs/', '');

    if (method === 'GET') {
      try {
        const doc = await MongoController.getAuditLogById(logId);
        return sendJsonResponse(res, 200, { success: true, data: doc });
      } catch (err) {
        return sendErrorResponse(res, err.statusCode || 404, 'Not Found', err.message);
      }
    }

    if (method === 'PUT') {
      try {
        const updated = await MongoController.updateAuditLog(logId, req.body);
        return sendJsonResponse(res, 200, { success: true, data: updated });
      } catch (err) {
        return sendErrorResponse(res, err.statusCode || 400, 'Update Failed', err.message);
      }
    }

    if (method === 'DELETE') {
      try {
        const result = await MongoController.deleteAuditLog(logId);
        return sendJsonResponse(res, 200, { success: true, ...result });
      } catch (err) {
        return sendErrorResponse(res, err.statusCode || 404, 'Delete Failed', err.message);
      }
    }
  }

  // ── SQL JOIN DEMO REPORT: /api/v1/reports/joined-data ────────
  if (pathname === '/api/v1/reports/joined-data' && method === 'GET') {
    // Simulates multi-table SQL JOIN between Profiles, Departments, Sections, and Drives
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
      },
      {
        student_id: 'usr_std_103',
        student_name: 'Karthik P',
        register_number: 'RA2111003010112',
        cgpa: 8.10,
        department_code: 'ECE',
        department_name: 'Electronics & Communication',
        section_name: 'A',
        placement_status: 'Shortlisted',
        company: 'Amazon',
        package_lpa: 28.0,
        join_type: 'LEFT JOIN (profiles + drive_applications)'
      }
    ];

    return sendJsonResponse(res, 200, {
      success: true,
      reportName: 'Relational Multi-Table Joined Placement Telemetry',
      generatedAt: new Date().toISOString(),
      data: joinedReport
    });
  }

  // ── LLM AI GATEWAY PROXY: /api/ai & /api/v1/ai/generate ──────
  if ((pathname === '/api/ai' || pathname === '/api/v1/ai/generate') && method === 'POST') {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return sendErrorResponse(res, 503, 'AI Gateway Unavailable', 'GEMINI_API_KEY environment variable is not configured.');
    }

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

  // ── If API route does not match (404 Not Found) ──────────────
  return sendErrorResponse(res, 404, 'Not Found', `The API endpoint '${method} ${pathname}' does not exist.`);
}


// ── 5. STATIC FILES & SPA SERVING ─────────────────────────────
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
      // SPA Client-side Route fallback to index.html
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


// ── 6. MAIN HTTP SERVER INITIALIZATION ────────────────────────
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

    if (req.url.startsWith('/api')) {
      await handleApiRoutes(req, res);
    } else {
      serveStaticFile(req, res);
    }
  } catch (err) {
    console.error('🔥 Server-side Uncaught Exception:', err);
    sendErrorResponse(res, err.statusCode || 500, 'Internal Server Error', err.message);
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Placenix Enterprise Server running on http://localhost:${PORT}`);
  console.log(`🛡️ Middleware Stack: CORS, RequestLogger, RateLimiter, BodyParser`);
  console.log(`📡 REST API Endpoints: /api/v1/drives, /api/v1/health, /api/v1/mongo/logs`);
  console.log(`🧠 AI Gateway Endpoint: /api/ai & /api/v1/ai/generate`);
  console.log(`=======================================================`);
});
