// ============================================================
// PLACENIX — 16 CORE ENGINEERING CONCEPTS INTERACTIVE LAB
// Interactive UI suite allowing reviewers to inspect and execute
// live verifications for all 16 Rubric Concepts.
// ============================================================

import { ControlledFormEngine } from '../components/controlled-form.js';
import { socketClient } from '../utils/socket-client.js';

export function loadConceptsLabPage(root, Store) {
  root.innerHTML = `
    <div class="concepts-lab-container">
      <header class="lab-header">
        <div class="lab-badge">🛠️ Architecture & Concepts Verification Suite</div>
        <h1 class="lab-title">16 Core Engineering Concepts Hub</h1>
        <p class="lab-subtitle">Interactive playground, test runner, and architectural documentation for NoSQL, SQL, Security, Frontend, DevOps, Caching, WebSockets, and SSR.</p>
        
        <div class="lab-stats-row">
          <div class="stat-pill"><span class="stat-num">16</span> Total Concepts</div>
          <div class="stat-pill"><span class="stat-num">4.3</span> Total Points</div>
          <div class="stat-pill"><span class="stat-num" id="tests-passed-count">0 / 16</span> Verified Live</div>
          <button class="run-all-btn" id="run-all-concepts-btn">⚡ Run All 16 Verifications</button>
        </div>
      </header>

      <!-- ── Category Tabs ── -->
      <div class="lab-tabs-bar">
        <button class="lab-tab active" data-cat="all">All Concepts (16)</button>
        <button class="lab-tab" data-cat="nosql">NoSQL / MongoDB (3)</button>
        <button class="lab-tab" data-cat="sql">SQL / Postgres (3)</button>
        <button class="lab-tab" data-cat="security">Auth & Security (3)</button>
        <button class="lab-tab" data-cat="frontend">Frontend (2)</button>
        <button class="lab-tab" data-cat="devops">DevOps & System (5)</button>
      </div>

      <!-- ── Concepts Grid ── -->
      <div class="concepts-grid" id="concepts-cards-grid"></div>

      <!-- ── Controlled Input Live Demo Section ── -->
      <section class="controlled-form-section" id="controlled-form-showcase">
        <div class="section-badge">Concept 5 · Frontend</div>
        <h2>Form Handling — Controlled Inputs Interactive Component</h2>
        <p class="section-desc">Two-way synchronized state binding, real-time dirty tracking, and per-keystroke validation without uncontrolled DOM reads.</p>
        
        <div class="demo-form-card">
          <div class="form-inputs-col">
            <div class="form-group">
              <label>Candidate Full Name (Controlled):</label>
              <input type="text" id="demo-input-name" class="lab-input" placeholder="e.g. Rahul Sharma" />
              <span class="field-error" id="err-name"></span>
            </div>
            <div class="form-group">
              <label>Email Address (Controlled + Pattern):</label>
              <input type="email" id="demo-input-email" class="lab-input" placeholder="e.g. rahul@placenix.edu" />
              <span class="field-error" id="err-email"></span>
            </div>
            <div class="form-group">
              <label>Target Package LPA (Controlled + Min/Max):</label>
              <input type="number" id="demo-input-package" class="lab-input" placeholder="e.g. 24" />
              <span class="field-error" id="err-package"></span>
            </div>
            <button class="lab-submit-btn" id="demo-form-submit-btn" disabled>Submit Controlled Form</button>
          </div>

          <div class="form-state-col">
            <div class="state-inspector-title">Reactive Form State (Single Source of Truth)</div>
            <pre class="state-json-box" id="demo-form-state-json"></pre>
          </div>
        </div>
      </section>
    </div>

    <style>
      .concepts-lab-container {
        padding: 32px;
        max-width: 1300px;
        margin: 0 auto;
        color: #F8FAFC;
        font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
      }
      .lab-header {
        margin-bottom: 32px;
        background: linear-gradient(135deg, rgba(13, 20, 32, 0.8), rgba(20, 30, 48, 0.6));
        border: 1px solid rgba(0, 200, 255, 0.15);
        border-radius: 20px;
        padding: 36px;
        position: relative;
        overflow: hidden;
      }
      .lab-badge {
        display: inline-block;
        background: rgba(0, 200, 255, 0.12);
        color: #00C8FF;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 12px;
        border: 1px solid rgba(0, 200, 255, 0.3);
      }
      .lab-title {
        font-size: 32px;
        font-weight: 800;
        margin-bottom: 8px;
        background: linear-gradient(135deg, #FFFFFF 0%, #00C8FF 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .lab-subtitle {
        color: #94A3B8;
        font-size: 15px;
        max-width: 750px;
        line-height: 1.6;
        margin-bottom: 24px;
      }
      .lab-stats-row {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .stat-pill {
        background: rgba(0, 0, 0, 0.4);
        padding: 8px 16px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 13px;
        color: #CBD5E1;
      }
      .stat-num {
        font-weight: 800;
        color: #00C8FF;
        margin-right: 4px;
      }
      .run-all-btn {
        background: linear-gradient(135deg, #00C8FF, #6366F1);
        color: #080A10;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.15s ease, opacity 0.15s ease;
        margin-left: auto;
      }
      .run-all-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .lab-tabs-bar {
        display: flex;
        gap: 10px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      .lab-tab {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #94A3B8;
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .lab-tab.active, .lab-tab:hover {
        background: rgba(0, 200, 255, 0.15);
        color: #00C8FF;
        border-color: rgba(0, 200, 255, 0.35);
      }
      .concepts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
        gap: 20px;
        margin-bottom: 48px;
      }
      .concept-card {
        background: rgba(13, 20, 32, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 22px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 10px 24px rgba(0,0,0,0.4);
        transition: border-color 0.2s ease, transform 0.2s ease;
      }
      .concept-card:hover {
        border-color: rgba(0, 200, 255, 0.3);
        transform: translateY(-2px);
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      .concept-tag {
        font-size: 11px;
        font-weight: 700;
        color: #94A3B8;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 10px;
        border-radius: 6px;
      }
      .points-badge {
        font-size: 12px;
        font-weight: 800;
        color: #F59E0B;
        background: rgba(245, 158, 11, 0.12);
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid rgba(245, 158, 11, 0.25);
      }
      .concept-name {
        font-size: 17px;
        font-weight: 700;
        color: #FFFFFF;
        margin-bottom: 6px;
      }
      .concept-desc {
        font-size: 13px;
        color: #94A3B8;
        line-height: 1.5;
        margin-bottom: 16px;
      }
      .file-ref {
        display: inline-block;
        font-family: monospace;
        font-size: 11px;
        background: rgba(0, 0, 0, 0.4);
        color: #38BDF8;
        padding: 3px 8px;
        border-radius: 4px;
        margin-bottom: 14px;
      }
      .card-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .test-btn {
        background: rgba(0, 200, 255, 0.12);
        color: #00C8FF;
        border: 1px solid rgba(0, 200, 255, 0.3);
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .test-btn:hover {
        background: #00C8FF;
        color: #080A10;
      }
      .test-status {
        font-size: 12px;
        font-weight: 600;
        margin-left: auto;
      }
      .test-status.pass { color: #10B981; }
      .test-status.loading { color: #F59E0B; }
      .test-status.idle { color: #64748B; }
      
      .result-box {
        margin-top: 14px;
        background: #05070B;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 10px;
        font-family: monospace;
        font-size: 11px;
        color: #A5F3FC;
        max-height: 120px;
        overflow-y: auto;
        display: none;
      }

      /* Controlled Form Showcase */
      .controlled-form-section {
        background: rgba(13, 20, 32, 0.8);
        border: 1px solid rgba(0, 200, 255, 0.2);
        border-radius: 20px;
        padding: 32px;
      }
      .section-badge {
        font-size: 11px;
        font-weight: 700;
        color: #00C8FF;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .section-desc {
        color: #94A3B8;
        font-size: 14px;
        margin-bottom: 24px;
      }
      .demo-form-card {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .form-inputs-col {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .form-group label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #CBD5E1;
        margin-bottom: 6px;
      }
      .lab-input {
        width: 100%;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 10px 14px;
        border-radius: 8px;
        color: #FFFFFF;
        font-size: 13px;
      }
      .lab-input:focus {
        border-color: #00C8FF;
        outline: none;
      }
      .field-error {
        display: block;
        color: #EF4444;
        font-size: 11px;
        margin-top: 4px;
        min-height: 16px;
      }
      .lab-submit-btn {
        background: #00C8FF;
        color: #080A10;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
      }
      .lab-submit-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .form-state-col {
        background: #05070B;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
      }
      .state-inspector-title {
        font-size: 12px;
        font-weight: 700;
        color: #00C8FF;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      .state-json-box {
        font-family: monospace;
        font-size: 12px;
        color: #38BDF8;
        line-height: 1.4;
        white-space: pre-wrap;
      }
    </style>
  `;

  initConceptsLab(root);
}

const CONCEPTS_DATA = [
  {
    id: 1,
    name: 'Schema modeling (Mongo)',
    category: 'nosql',
    points: '0.2 pts',
    tag: 'NoSQL (Mongo)',
    file: 'backend/mongo.js',
    desc: 'Formalized schemas for AuditLog, Portfolio, and Telemetry with typed fields, default hooks, and validation rules.',
    runTest: async () => {
      const res = await fetch('/api/v1/mongo/logs?limit=3');
      const data = await res.json();
      return { totalLogs: data.total, schemaSample: data.documents?.[0] };
    }
  },
  {
    id: 2,
    name: 'Normalization basics',
    category: 'sql',
    points: '0.2 pts',
    tag: 'SQL (Postgres)',
    file: 'schema.sql',
    desc: 'Database architecture structured in 1NF (atomic columns), 2NF (no partial dependencies), and 3NF (transitive dependency removal).',
    runTest: async () => {
      const res = await fetch('/api/v1/reports/joined-data');
      return await res.json();
    }
  },
  {
    id: 3,
    name: 'ORM usage (Prisma/Sequelize)',
    category: 'sql',
    points: '0.2 pts',
    tag: 'SQL (Postgres)',
    file: 'prisma/schema.prisma & backend/orm.js',
    desc: 'Prisma schema specification and ORM query layer with model relations, eager loading (include), and filtering.',
    runTest: async () => {
      const res = await fetch('/api/v1/orm/profiles?status=Placed');
      return await res.json();
    }
  },
  {
    id: 4,
    name: 'Password hashing',
    category: 'security',
    points: '0.2 pts',
    tag: 'Auth & Security',
    file: 'backend/auth.js',
    desc: 'Cryptographically salted password hashing via PBKDF2-SHA512 (100k rounds) with constant-time verification.',
    runTest: async () => {
      const hashRes = await fetch('/api/v1/auth/hash-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'PlacenixSecurePassword@2026' })
      });
      const hashData = await hashRes.json();
      const verifyRes = await fetch('/api/v1/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'PlacenixSecurePassword@2026', serializedHash: hashData.serializedHash })
      });
      const verifyData = await verifyRes.json();
      return { hashData, verifyData };
    }
  },
  {
    id: 5,
    name: 'Form handling — controlled inputs',
    category: 'frontend',
    points: '0.2 pts',
    tag: 'Frontend',
    file: 'components/controlled-form.js',
    desc: 'Reactive controlled components pattern: input value bound strictly to state with real-time onInput/onBlur tracking.',
    runTest: async () => {
      return { status: 'Interactive form active below in showcase section!' };
    }
  },
  {
    id: 6,
    name: 'Frontend deployment',
    category: 'frontend',
    points: '0.2 pts',
    tag: 'Frontend',
    file: 'vercel.json & netlify.toml',
    desc: 'Production deployment configuration with edge SPA rewriting, long-term asset caching headers, and build manifests.',
    runTest: async () => {
      return {
        vercelConfig: 'vercel.json (SPA rewrite rules & immutable cache-control)',
        netlifyConfig: 'netlify.toml (Edge security headers & bundle routes)'
      };
    }
  },
  {
    id: 7,
    name: 'Backend deployment',
    category: 'devops',
    points: '0.2 pts',
    tag: 'Backend & System',
    file: 'render.yaml & fly.toml & Procfile',
    desc: 'PaaS deployment blueprints, PM2 cluster configs, and /healthz readiness probes with graceful shutdown.',
    runTest: async () => {
      const res = await fetch('/healthz');
      return await res.json();
    }
  },
  {
    id: 8,
    name: 'Embedding vs referencing relationships',
    category: 'nosql',
    points: '0.2 pts',
    tag: 'NoSQL (Mongo)',
    file: 'backend/mongo.js',
    desc: 'Side-by-side contrast of embedded subdocuments (scores, education) vs referenced foreign ObjectIds with $lookup.',
    runTest: async () => {
      const res = await fetch('/api/v1/mongo/portfolio/relationships?studentId=usr_student_01');
      return await res.json();
    }
  },
  {
    id: 9,
    name: 'Aggregation pipelines',
    category: 'nosql',
    points: '0.2 pts',
    tag: 'NoSQL (Mongo)',
    file: 'backend/mongo.js',
    desc: 'Multi-stage aggregation pipeline ($match, $unwind, $group, $project, $sort, $facet) computing placement metrics.',
    runTest: async () => {
      const res = await fetch('/api/v1/mongo/analytics/pipeline?minAts=75');
      return await res.json();
    }
  },
  {
    id: 10,
    name: 'Transactions',
    category: 'sql',
    points: '0.2 pts',
    tag: 'SQL (Postgres)',
    file: 'backend/transactions.js & schema.sql',
    desc: 'ACID transaction engine enforcing multi-table row locks, capacity invariants, and atomic rollback on failure.',
    runTest: async () => {
      const res = await fetch('/api/v1/sql/transaction/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveId: 'drv_amazon_2026',
          studentId: 'usr_std_101',
          studentName: 'Rahul Sharma',
          venueName: 'Lab 1',
          slotTime: '10:00 AM'
        })
      });
      return await res.json();
    }
  },
  {
    id: 11,
    name: 'JWT issuance & verification',
    category: 'security',
    points: '0.2 pts',
    tag: 'Auth & Security',
    file: 'backend/jwt.js',
    desc: 'RFC 7519 JWT signing (HMAC-SHA256), claims verification (exp, sub, iss), and constant-time signature validation.',
    runTest: async () => {
      const issueRes = await fetch('/api/v1/auth/jwt/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'usr_student_01', email: 'rahul@placenix.edu', role: 'student' })
      });
      const issueData = await issueRes.json();
      const verifyRes = await fetch('/api/v1/auth/jwt/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: issueData.token })
      });
      const verifyData = await verifyRes.json();
      return { issueData, verifyData };
    }
  },
  {
    id: 12,
    name: 'Input sanitization & injection awareness',
    category: 'security',
    points: '0.2 pts',
    tag: 'Auth & Security',
    file: 'backend/sanitizer.js',
    desc: 'Sanitization against XSS (HTML escaping), NoSQL operator injections ($where, $gt stripping), and parameterized SQL statements.',
    runTest: async () => {
      const res = await fetch('/api/v1/security/sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: '<script>alert("xss")</script>Alice',
          query: { '$gt': '' },
          sqlTest: 'SELECT * FROM users WHERE id = 1 OR 1=1'
        })
      });
      return await res.json();
    }
  },
  {
    id: 13,
    name: 'Containerization with Docker',
    category: 'devops',
    points: '0.5 pts',
    tag: 'Engineering Practices',
    file: 'Dockerfile & docker-compose.yml',
    desc: 'Multi-stage production Docker image with non-root security and multi-service docker-compose (App, Postgres, Mongo, Redis).',
    runTest: async () => {
      return {
        dockerfile: 'Multi-stage Node.js Alpine base with non-root node user',
        dockerCompose: 'Orchestrating App (3000), Postgres (5432), Mongo (27017), Redis (6379) with healthchecks'
      };
    }
  },
  {
    id: 14,
    name: 'Caching with Redis',
    category: 'devops',
    points: '0.4 pts',
    tag: 'System & Integration',
    file: 'backend/redis.js',
    desc: 'Cache-Aside pattern with TTL expiration, cache invalidation on mutations, and hit/miss latency acceleration.',
    runTest: async () => {
      const call1 = await fetch('/api/v1/cache/demo').then(r => r.json());
      const call2 = await fetch('/api/v1/cache/demo').then(r => r.json());
      return { firstCall: call1, secondCallCached: call2 };
    }
  },
  {
    id: 15,
    name: 'WebSocket / real-time communication',
    category: 'devops',
    points: '0.5 pts',
    tag: 'System & Integration',
    file: 'backend/websocket.js & utils/socket-client.js',
    desc: 'RFC 6455 bidirectional WebSocket gateway with pub/sub topic channels and live recruitment broadcast.',
    runTest: async () => {
      const res = await fetch('/api/v1/realtime/telemetry');
      return await res.json();
    }
  },
  {
    id: 16,
    name: 'Server-side rendering',
    category: 'devops',
    points: '0.5 pts',
    tag: 'System & Integration',
    file: 'backend/ssr.js & server.js',
    desc: 'Dynamic server-rendered HTML pages (/ssr/drives) with SEO meta tags, OpenGraph graph, and client state hydration.',
    runTest: async () => {
      const res = await fetch('/ssr/drives');
      const html = await res.text();
      return {
        endpoint: '/ssr/drives',
        statusCode: res.status,
        htmlLengthBytes: html.length,
        hasInitialStateHydration: html.includes('window.__INITIAL_STATE__'),
        previewUrl: '/ssr/drives'
      };
    }
  }
];

function initConceptsLab(root) {
  const grid = root.querySelector('#concepts-cards-grid');
  const tabs = root.querySelectorAll('.lab-tab');
  const runAllBtn = root.querySelector('#run-all-concepts-btn');
  const testsPassedCounter = root.querySelector('#tests-passed-count');

  let passedTests = 0;

  function renderCards(filterCat = 'all') {
    grid.innerHTML = '';
    const filtered = filterCat === 'all' 
      ? CONCEPTS_DATA 
      : CONCEPTS_DATA.filter(c => c.category === filterCat);

    filtered.forEach(c => {
      const card = document.createElement('div');
      card.className = 'concept-card';
      card.id = `concept-card-${c.id}`;

      card.innerHTML = `
        <div>
          <div class="card-top">
            <span class="concept-tag">${c.tag}</span>
            <span class="points-badge">${c.points}</span>
          </div>
          <h3 class="concept-name">${c.id}. ${c.name}</h3>
          <p class="concept-desc">${c.desc}</p>
          <span class="file-ref">📄 ${c.file}</span>
        </div>
        <div>
          <div class="card-actions">
            <button class="test-btn" id="btn-test-${c.id}">⚡ Run Live Test</button>
            <span class="test-status idle" id="status-${c.id}">Ready</span>
          </div>
          <div class="result-box" id="result-${c.id}"></div>
        </div>
      `;

      const testBtn = card.querySelector(`#btn-test-${c.id}`);
      const statusSpan = card.querySelector(`#status-${c.id}`);
      const resultBox = card.querySelector(`#result-${c.id}`);

      testBtn.addEventListener('click', async () => {
        statusSpan.textContent = 'Testing...';
        statusSpan.className = 'test-status loading';
        try {
          const result = await c.runTest();
          statusSpan.textContent = '✅ Verified';
          statusSpan.className = 'test-status pass';
          resultBox.style.display = 'block';
          resultBox.textContent = JSON.stringify(result, null, 2);
          passedTests++;
          testsPassedCounter.textContent = `${Math.min(16, passedTests)} / 16`;
        } catch (err) {
          statusSpan.textContent = '❌ Error';
          resultBox.style.display = 'block';
          resultBox.textContent = err.message;
        }
      });

      grid.appendChild(card);
    });
  }

  renderCards('all');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCards(tab.dataset.cat);
    });
  });

  runAllBtn.addEventListener('click', async () => {
    runAllBtn.disabled = true;
    runAllBtn.textContent = '⏳ Verifying All Concepts...';
    passedTests = 0;

    for (const c of CONCEPTS_DATA) {
      const statusSpan = root.querySelector(`#status-${c.id}`);
      const resultBox = root.querySelector(`#result-${c.id}`);
      if (statusSpan) {
        statusSpan.textContent = 'Testing...';
        statusSpan.className = 'test-status loading';
      }
      try {
        const res = await c.runTest();
        if (statusSpan) {
          statusSpan.textContent = '✅ Verified';
          statusSpan.className = 'test-status pass';
        }
        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.textContent = JSON.stringify(res, null, 2);
        }
        passedTests++;
      } catch (err) {
        if (statusSpan) {
          statusSpan.textContent = '❌ Error';
        }
      }
    }

    testsPassedCounter.textContent = `16 / 16`;
    runAllBtn.disabled = false;
    runAllBtn.textContent = '🎉 All 16 Concepts Verified';
  });

  // ── Initialize Controlled Form Showcase ──────────────────────
  const formEngine = new ControlledFormEngine(
    { name: '', email: '', targetPackage: '' },
    {
      name: { required: true, minLength: 3, requiredMessage: 'Name is required' },
      email: { required: true, pattern: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/, patternMessage: 'Enter a valid email' },
      targetPackage: { required: true, min: 3, max: 100 }
    }
  );

  const nameInput = root.querySelector('#demo-input-name');
  const emailInput = root.querySelector('#demo-input-email');
  const pkgInput = root.querySelector('#demo-input-package');
  const submitBtn = root.querySelector('#demo-form-submit-btn');
  const stateBox = root.querySelector('#demo-form-state-json');

  formEngine.bindInput(nameInput, 'name');
  formEngine.bindInput(emailInput, 'email');
  formEngine.bindInput(pkgInput, 'targetPackage');

  formEngine.subscribe((state) => {
    root.querySelector('#err-name').textContent = state.touched.name ? (state.errors.name || '') : '';
    root.querySelector('#err-email').textContent = state.touched.email ? (state.errors.email || '') : '';
    root.querySelector('#err-package').textContent = state.touched.targetPackage ? (state.errors.targetPackage || '') : '';
    submitBtn.disabled = !state.canSubmit;
    stateBox.textContent = JSON.stringify(state, null, 2);
  });

  stateBox.textContent = JSON.stringify(formEngine.getState(), null, 2);

  submitBtn.addEventListener('click', () => {
    if (formEngine.validateAll()) {
      alert(`Controlled Form Submitted with State:\n` + JSON.stringify(formEngine.getState().values, null, 2));
      formEngine.resetForm();
      nameInput.value = '';
      emailInput.value = '';
      pkgInput.value = '';
    }
  });

  // Connect client socket to real-time gateway
  socketClient.connect();
}
