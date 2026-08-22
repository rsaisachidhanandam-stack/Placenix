// ============================================================
// PLACENIX — EXPRESS-LESS ROUTING PROXY SERVER (ULTRA RESILIENT)
// ============================================================

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Simple dotenv parser ─────────────────────────────────────
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
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ── Gemini API Proxy ───────────────────────────────────────
  if (req.url === '/api/ai' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const apiKey = process.env.GEMINI_API_KEY || '';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      const proxyReq = https.request(geminiUrl, options, proxyRes => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json'
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', err => {
        console.error('❌ Proxy request failed:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gateway Proxy Error', message: err.message }));
      });

      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // ── Static Files serving ────────────────────────────────────
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
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
});

function serveIndexHTML(res, customPath) {
  const indexPath = customPath || path.join(PUBLIC_DIR, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: Missing index.html');
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

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(finalHtml);
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Placenix Server running at http://localhost:${PORT}`);
  console.log(`🔑 Gemini Proxy active at /api/ai`);
});
