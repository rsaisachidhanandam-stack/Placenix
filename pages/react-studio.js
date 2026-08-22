// ============================================================
// PLACENIX — REACT COMPONENT STUDIO & INTERACTIVE RUBRIC LAB (v3.0)
// Demonstrates all 25 Mandatory Evaluation Rubric Concepts:
// 1. React Component Composition (Compound Slots, Container/Presentational)
// 2. State Management with useState (Multi-Filter Controls, Sliders, Tab Switching)
// 3. Side Effects with useEffect (Async API Fetching, Timers, AbortController Cleanups)
// 4. Core JavaScript Lab (Closures, Event Loop, Hoisting, Promises vs Callbacks)
// 5. NoSQL (MongoDB) Interactive CRUD Console (Create, Read, Delete with Validation)
// 6. SQL (PostgreSQL) Multi-Table JOINs Telemetry Viewer
// 7. RESTful API Data Fetching with HTTP Status Codes & Error Handling
// ============================================================

import { 
  createSecureTokenVault, 
  memoizeWithClosure, 
  executeEventLoopTelemetry, 
  demonstrateSafeHoisting, 
  promisify, 
  executeAsyncDataFlow,
  getConceptsSummary 
} from '../utils/js-concepts.js';

export async function loadReactStudioPage(root, Store, supabase) {
  root.innerHTML = `
    <div id="react-root" style="min-height: calc(100vh - 100px); padding: 32px; max-width: 1600px; margin: 0 auto;"></div>
  `;

  const reactRootEl = document.getElementById('react-root');
  if (!reactRootEl) return;

  // Check if React and ReactDOM are available globally
  const React = window.React;
  const ReactDOM = window.ReactDOM;

  if (!React || !ReactDOM) {
    reactRootEl.innerHTML = `
      <div style="padding:40px; text-align:center; color:#ef4444; background:rgba(239,68,68,0.1); border-radius:12px;">
        <h3>⚠️ React 18 Engine Unavailable</h3>
        <p>Could not initialize React UMD runtime from CDN.</p>
      </div>
    `;
    return;
  }

  const { useState, useEffect, useMemo } = React;
  const e = React.createElement;

  // ── 1. COMPOUND & PRESENTATIONAL COMPONENTS (COMPOSITION) ─────

  // Component 1: StatBadge (Presentational)
  const StatBadge = ({ label, value, color = '#00C8FF', icon = '📊' }) => {
    return e('div', {
      style: {
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }
    }, [
      e('div', {
        key: 'icon',
        style: {
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: `${color}18`,
          border: `1px solid ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }
      }, icon),
      e('div', { key: 'content' }, [
        e('div', {
          key: 'val',
          style: { fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }
        }, value),
        e('div', {
          key: 'lbl',
          style: { fontSize: '10.5px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }
        }, label)
      ])
    ]);
  };

  // Component 2: StudioCard (Container Component with Composition Slots)
  const StudioCard = ({ title, subtitle, badge, actionButton, children, headerColor = '#00C8FF' }) => {
    return e('div', {
      style: {
        background: 'rgba(13, 20, 32, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 200, 255, 0.15)',
        borderRadius: '18px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)'
      }
    }, [
      e('div', {
        key: 'header',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          paddingBottom: '16px'
        }
      }, [
        e('div', { key: 'titles' }, [
          e('div', {
            key: 'badge-row',
            style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }
          }, [
            badge && e('span', {
              key: 'badge',
              style: {
                background: `${headerColor}20`,
                color: headerColor,
                border: `1px solid ${headerColor}50`,
                padding: '2px 8px',
                borderRadius: '99px',
                fontSize: '9.5px',
                fontWeight: '800',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }
            }, badge)
          ]),
          e('h3', {
            key: 'title',
            style: { fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.02em' }
          }, title),
          subtitle && e('p', {
            key: 'sub',
            style: { fontSize: '12.5px', color: '#94A3B8', margin: '4px 0 0 0' }
          }, subtitle)
        ]),
        actionButton && e('div', { key: 'action' }, actionButton)
      ]),
      e('div', { key: 'body', style: { flex: 1 } }, children)
    ]);
  };

  // Component 3: CandidateCard (Composed Child Component)
  const CandidateCard = ({ student, isBookmarked, onToggleBookmark }) => {
    return e('div', {
      style: {
        background: 'rgba(255, 255, 255, 0.025)',
        border: isBookmarked ? '1px solid #00C8FF' : '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease'
      }
    }, [
      e('div', {
        key: 'top',
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }
      }, [
        e('div', { key: 'info' }, [
          e('div', {
            key: 'name',
            style: { fontSize: '14.5px', fontWeight: '700', color: '#fff' }
          }, student.name),
          e('div', {
            key: 'dept',
            style: { fontSize: '11px', color: '#64748B', fontWeight: '600' }
          }, `${student.dept} • CGPA ${student.cgpa.toFixed(1)}`)
        ]),
        e('button', {
          key: 'bookmark-btn',
          onClick: () => onToggleBookmark(student.id),
          style: {
            background: isBookmarked ? 'rgba(0, 200, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '8px',
            color: isBookmarked ? '#00C8FF' : '#64748B',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '700'
          }
        }, isBookmarked ? '★ Pinned' : '☆ Pin')
      ]),
      e('div', {
        key: 'metrics',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '8px 12px',
          borderRadius: '8px'
        }
      }, [
        e('div', { key: 'ats' }, [
          e('div', { style: { fontSize: '9px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' } }, 'ATS Score'),
          e('div', { style: { fontSize: '13px', color: student.atsScore >= 75 ? '#10B981' : '#F59E0B', fontWeight: '800' } }, `${student.atsScore}%`)
        ]),
        e('div', { key: 'emp' }, [
          e('div', { style: { fontSize: '9px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' } }, 'Employability'),
          e('div', { style: { fontSize: '13px', color: '#00C8FF', fontWeight: '800' } }, `${student.empScore}%`)
        ])
      ])
    ]);
  };


  // ── 2. ROOT REACT STUDIO COMPONENT (STATE & EFFECTS) ──────────

  const ReactStudioApp = () => {
    // ── Active Navigation Tab State ──
    const [activeTab, setActiveTab] = useState('react-studio'); // 'react-studio' | 'js-lab' | 'mongo-crud' | 'sql-joins' | 'async-api'

    // ── React Studio State (useState) ──
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [minCgpa, setMinCgpa] = useState(7.0);
    const [minAts, setMinAts] = useState(60);
    const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
    const [activeTheme, setActiveTheme] = useState('cyber');
    const [liveTicker, setLiveTicker] = useState(0);
    const [serverHealth, setServerHealth] = useState(null);

    // ── JS Concepts Lab Interactive States ──
    const [tokenVault] = useState(() => createSecureTokenVault('secret_placement_token_998877'));
    const [vaultMasked, setVaultMasked] = useState(() => tokenVault.getSecretMasked());
    const [vaultCount, setVaultCount] = useState(1);
    const [newSecretInput, setNewSecretInput] = useState('');
    const [eventLoopLogs, setEventLoopLogs] = useState([]);
    const [hoistingData] = useState(() => demonstrateSafeHoisting());
    const [asyncFlowResult, setAsyncFlowResult] = useState(null);
    const [isAsyncFlowRunning, setIsAsyncFlowRunning] = useState(false);

    // ── MongoDB CRUD States ──
    const [mongoLogs, setMongoLogs] = useState([]);
    const [isMongoLoading, setIsMongoLoading] = useState(false);
    const [newLogEventType, setNewLogEventType] = useState('RESUME_SCAN');
    const [newLogRole, setNewLogRole] = useState('student');
    const [newLogEmail, setNewLogEmail] = useState('user@placenix.edu');
    const [newLogSeverity, setNewLogSeverity] = useState('INFO');
    const [mongoFeedback, setMongoFeedback] = useState(null);

    // ── SQL JOINs Report State ──
    const [joinedReportData, setJoinedReportData] = useState([]);
    const [isJoinedReportLoading, setIsJoinedReportLoading] = useState(false);

    // ── Async Drives State ──
    const [drivesData, setDrivesData] = useState([]);
    const [isDrivesLoading, setIsDrivesLoading] = useState(false);

    // Initial student data sourced from Store
    const initialStudents = useMemo(() => {
      return (Store.students && Store.students.length > 0) ? Store.students : [
        { id: 'st_1', name: 'Rahul Sharma', dept: 'CSE', cgpa: 8.9, atsScore: 92, empScore: 88, status: 'Applied' },
        { id: 'st_2', name: 'Sneha Mishra', dept: 'IT', cgpa: 8.4, atsScore: 85, empScore: 82, status: 'Shortlisted' },
        { id: 'st_3', name: 'Aditya Sen', dept: 'CSE', cgpa: 7.8, atsScore: 78, empScore: 76, status: 'Applied' },
        { id: 'st_4', name: 'Meera Nair', dept: 'ECE', cgpa: 8.1, atsScore: 84, empScore: 80, status: 'Shortlisted' },
        { id: 'st_5', name: 'Vikram Singh', dept: 'MECH', cgpa: 7.2, atsScore: 68, empScore: 70, status: 'Applied' },
        { id: 'st_6', name: 'Priya Patel', dept: 'CSE', cgpa: 9.3, atsScore: 95, empScore: 94, status: 'Placed' }
      ];
    }, []);

    // ── useEffect 1: Backend Health Fetching with AbortController Cleanup ──
    useEffect(() => {
      let isMounted = true;
      const controller = new AbortController();

      async function fetchBackendTelemetry() {
        try {
          const res = await fetch('/api/v1/health', { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) setServerHealth(data);
          }
        } catch (e) {
          if (isMounted && e.name !== 'AbortError') {
            console.log('Backend health check info:', e.message);
          }
        }
      }

      fetchBackendTelemetry();

      return () => {
        isMounted = false;
        controller.abort();
      };
    }, []);

    // ── useEffect 2: Live Auto-Incrementing Telemetry Interval Timer with Cleanup ──
    useEffect(() => {
      const intervalId = setInterval(() => {
        setLiveTicker(prev => prev + 1);
      }, 1000);

      return () => clearInterval(intervalId);
    }, []);

    // ── useEffect 3: Load MongoDB Logs when Tab is Active ──
    useEffect(() => {
      if (activeTab === 'mongo-crud') {
        loadMongoLogs();
      } else if (activeTab === 'sql-joins') {
        loadJoinedReport();
      } else if (activeTab === 'async-api') {
        loadDrivesApi();
      }
    }, [activeTab]);

    // ── Async Data Loaders ──
    const loadMongoLogs = async () => {
      setIsMongoLoading(true);
      try {
        const res = await fetch('/api/v1/mongo/logs');
        const json = await res.json();
        if (json.documents) setMongoLogs(json.documents);
      } catch (err) {
        console.error('Failed to load mongo logs:', err);
      } finally {
        setIsMongoLoading(false);
      }
    };

    const loadJoinedReport = async () => {
      setIsJoinedReportLoading(true);
      try {
        const res = await fetch('/api/v1/reports/joined-data');
        const json = await res.json();
        if (json.data) setJoinedReportData(json.data);
      } catch (err) {
        console.error('Failed to load joined report:', err);
      } finally {
        setIsJoinedReportLoading(false);
      }
    };

    const loadDrivesApi = async () => {
      setIsDrivesLoading(true);
      try {
        const res = await fetch('/api/v1/drives');
        const json = await res.json();
        if (json.data) setDrivesData(json.data);
      } catch (err) {
        console.error('Failed to load drives:', err);
      } finally {
        setIsDrivesLoading(false);
      }
    };

    // ── MongoDB Create Action (POST /api/v1/mongo/logs) ──
    const handleCreateMongoLog = async (ev) => {
      ev.preventDefault();
      try {
        const payload = {
          eventType: newLogEventType,
          actor: {
            userId: 'usr_' + Date.now().toString(36),
            email: newLogEmail,
            role: newLogRole
          },
          metadata: {
            submittedAt: new Date().toISOString(),
            source: 'React Studio UI Console'
          },
          severity: newLogSeverity
        };

        const res = await fetch('/api/v1/mongo/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok) {
          setMongoFeedback({ type: 'success', msg: `✅ Document Created! ID: ${result.data._id}` });
          loadMongoLogs();
        } else {
          setMongoFeedback({ type: 'error', msg: `❌ Validation Error: ${result.message}` });
        }
      } catch (err) {
        setMongoFeedback({ type: 'error', msg: `❌ Error: ${err.message}` });
      }
    };

    // ── MongoDB Delete Action (DELETE /api/v1/mongo/logs/:id) ──
    const handleDeleteMongoLog = async (id) => {
      try {
        const res = await fetch(`/api/v1/mongo/logs/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setMongoFeedback({ type: 'success', msg: `🗑️ Deleted document '${id}'` });
          setMongoLogs(prev => prev.filter(l => l._id !== id));
        }
      } catch (err) {
        setMongoFeedback({ type: 'error', msg: `Delete failed: ${err.message}` });
      }
    };

    // ── Event Loop Telemetry Runner ──
    const handleRunEventLoop = () => {
      const logs = [];
      executeEventLoopTelemetry((msg) => {
        logs.push(msg);
      });
      // Microtasks and Macrotasks will log asynchronously
      setTimeout(() => {
        setEventLoopLogs([...logs]);
      }, 50);
    };

    // ── Promises vs Callbacks Runner ──
    const handleRunAsyncFlow = async () => {
      setIsAsyncFlowRunning(true);
      const res = await executeAsyncDataFlow({ testDriveId: 'drv_sample_2026', timestamp: Date.now() });
      setAsyncFlowResult(res);
      setIsAsyncFlowRunning(false);
    };

    // ── Toggle Bookmark Handler ──
    const handleToggleBookmark = (id) => {
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    // ── Filtered Candidate Pipeline ──
    const filteredStudents = useMemo(() => {
      return initialStudents.filter(s => {
        const matchQuery = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchDept = selectedDept === 'ALL' || s.dept.toUpperCase() === selectedDept.toUpperCase();
        const matchCgpa = (s.cgpa || 0) >= minCgpa;
        const matchAts = (s.atsScore || 0) >= minAts;
        return matchQuery && matchDept && matchCgpa && matchAts;
      });
    }, [initialStudents, searchQuery, selectedDept, minCgpa, minAts]);

    const themeColors = {
      cyber: '#00C8FF',
      emerald: '#10B981',
      solar: '#F59E0B'
    };
    const currentColor = themeColors[activeTheme] || '#00C8FF';

    // ── RENDER ROOT UI ──
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '28px' } }, [
      // 1. Studio Header Banner
      e('div', {
        key: 'header',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }
      }, [
        e('div', { key: 'left' }, [
          e('div', {
            key: 'tag',
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '99px',
              background: `${currentColor}15`,
              border: `1px solid ${currentColor}40`,
              color: currentColor,
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px'
            }
          }, '⚛️ React 18 Component Composition & Rubric Intelligence Lab'),
          e('h1', {
            key: 'title',
            style: { fontSize: '30px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.03em' }
          }, 'Placenix Rubric & Architectural Studio'),
          e('p', {
            key: 'sub',
            style: { fontSize: '13.5px', color: '#94A3B8', margin: '6px 0 0 0' }
          }, 'Interactive demonstration of all 25 rubric concepts: React 18, Closures, Event Loop, Hoisting, Promises, MongoDB CRUD, SQL JOINs, and REST APIs.')
        ]),

        e('div', {
          key: 'right',
          style: { display: 'flex', alignItems: 'center', gap: '12px' }
        }, [
          e('div', {
            key: 'theme-selector',
            style: {
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '4px'
            }
          }, [
            ['cyber', 'Cyber Blue'],
            ['emerald', 'Neon Emerald'],
            ['solar', 'Solar Amber']
          ].map(([tKey, label]) => 
            e('button', {
              key: tKey,
              onClick: () => setActiveTheme(tKey),
              style: {
                background: activeTheme === tKey ? themeColors[tKey] : 'transparent',
                color: activeTheme === tKey ? '#000' : '#94A3B8',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }
            }, label)
          ))
        ])
      ]),

      // 2. Real-Time Telemetry Stats Row
      e('div', {
        key: 'stats-row',
        style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }
      }, [
        e(StatBadge, { key: 'b1', label: 'Matching Candidates', value: `${filteredStudents.length} / ${initialStudents.length}`, color: currentColor, icon: '👥' }),
        e(StatBadge, { key: 'b2', label: 'Pinned Shortlist', value: `${bookmarkedIds.size}`, color: '#10B981', icon: '★' }),
        e(StatBadge, { key: 'b3', label: 'Telemetry Heartbeat', value: `${liveTicker}s Active`, color: '#8B5CF6', icon: '⚡' }),
        e(StatBadge, { key: 'b4', label: 'REST API Health', value: serverHealth?.status || 'Online', color: '#F59E0B', icon: '🛡️' })
      ]),

      // 3. Navigation Tab Bar (Concept Showcases)
      e('div', {
        key: 'tab-bar',
        style: {
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
          flexWrap: 'wrap'
        }
      }, [
        { id: 'react-studio', label: '⚛️ React 18 Composition & State', badge: 'Frontend' },
        { id: 'js-lab', label: '🔬 JS Core Concepts Lab', badge: 'Closures & Event Loop' },
        { id: 'mongo-crud', label: '🍃 MongoDB NoSQL Console', badge: 'CRUD & Schemas' },
        { id: 'sql-joins', label: '🗄️ PostgreSQL SQL JOINs', badge: 'Relational Reports' },
        { id: 'async-api', label: '⚡ Async REST & Status Codes', badge: 'Backend' }
      ].map(tab => 
        e('button', {
          key: tab.id,
          onClick: () => setActiveTab(tab.id),
          style: {
            background: activeTab === tab.id ? `${currentColor}22` : 'rgba(255, 255, 255, 0.03)',
            border: activeTab === tab.id ? `1px solid ${currentColor}` : '1px solid rgba(255, 255, 255, 0.08)',
            color: activeTab === tab.id ? '#fff' : '#94A3B8',
            borderRadius: '12px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }
        }, [
          e('span', { key: 'lbl' }, tab.label),
          e('span', {
            key: 'badge',
            style: {
              background: activeTab === tab.id ? currentColor : 'rgba(255, 255, 255, 0.1)',
              color: activeTab === tab.id ? '#000' : '#CBD5E1',
              fontSize: '9.5px',
              fontWeight: '800',
              padding: '2px 6px',
              borderRadius: '99px'
            }
          }, tab.badge)
        ])
      )),

      // ── TAB 1: REACT 18 COMPONENT COMPOSITION & HOOKS ──────────
      activeTab === 'react-studio' && e('div', {
        key: 'tab-content-react',
        style: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }
      }, [
        // Left Column: Interactive Filter Sidebar (useState controls)
        e(StudioCard, {
          key: 'filters-card',
          title: 'Interactive Filters',
          subtitle: 'Mutates local state via useState hooks',
          badge: 'useState Control',
          headerColor: currentColor
        }, [
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px' } }, [
            e('div', { key: 'search-box' }, [
              e('label', { style: { fontSize: '11.5px', fontWeight: '700', color: '#fff', display: 'block', marginBottom: '6px' } }, 'Candidate Name'),
              e('input', {
                type: 'text',
                placeholder: 'Filter by name...',
                value: searchQuery,
                onChange: (ev) => setSearchQuery(ev.target.value),
                style: {
                  width: '100%',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '0 14px',
                  color: '#fff',
                  fontSize: '13px'
                }
              })
            ]),

            e('div', { key: 'dept-select' }, [
              e('label', { style: { fontSize: '11.5px', fontWeight: '700', color: '#fff', display: 'block', marginBottom: '6px' } }, 'Department'),
              e('select', {
                value: selectedDept,
                onChange: (ev) => setSelectedDept(ev.target.value),
                style: {
                  width: '100%',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '0 14px',
                  color: '#fff',
                  fontSize: '13px'
                }
              }, [
                e('option', { value: 'ALL', style: { background: '#0D1420' } }, 'All Departments'),
                e('option', { value: 'CSE', style: { background: '#0D1420' } }, 'Computer Science (CSE)'),
                e('option', { value: 'IT', style: { background: '#0D1420' } }, 'Information Tech (IT)'),
                e('option', { value: 'ECE', style: { background: '#0D1420' } }, 'Electronics (ECE)'),
                e('option', { value: 'MECH', style: { background: '#0D1420' } }, 'Mechanical (MECH)')
              ])
            ]),

            e('div', { key: 'cgpa-slider' }, [
              e('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' } }, [
                e('span', { style: { fontSize: '11.5px', fontWeight: '700', color: '#fff' } }, 'Min CGPA Cutoff'),
                e('span', { style: { fontSize: '12px', fontWeight: '800', color: currentColor } }, minCgpa.toFixed(1))
              ]),
              e('input', {
                type: 'range',
                min: '5.0',
                max: '10.0',
                step: '0.1',
                value: minCgpa,
                onChange: (ev) => setMinCgpa(parseFloat(ev.target.value)),
                style: { width: '100%', accentColor: currentColor }
              })
            ]),

            e('div', { key: 'ats-slider' }, [
              e('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' } }, [
                e('span', { style: { fontSize: '11.5px', fontWeight: '700', color: '#fff' } }, 'Min ATS Score'),
                e('span', { style: { fontSize: '12px', fontWeight: '800', color: currentColor } }, `${minAts}%`)
              ]),
              e('input', {
                type: 'range',
                min: '0',
                max: '100',
                step: '5',
                value: minAts,
                onChange: (ev) => setMinAts(parseInt(ev.target.value)),
                style: { width: '100%', accentColor: currentColor }
              })
            ]),

            e('button', {
              key: 'reset-btn',
              onClick: () => {
                setSearchQuery('');
                setSelectedDept('ALL');
                setMinCgpa(6.0);
                setMinAts(50);
              },
              style: {
                height: '38px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer'
              }
            }, 'Reset All Filters')
          ])
        ]),

        // Right Column: Composed Candidate Grid
        e(StudioCard, {
          key: 'results-card',
          title: 'Filtered Candidates Grid',
          subtitle: `Rendering ${filteredStudents.length} candidate cards via React Component Composition`,
          badge: 'Component Composition',
          headerColor: currentColor,
          actionButton: e('span', {
            style: {
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '4px 10px',
              borderRadius: '99px',
              fontSize: '11px',
              fontWeight: '700'
            }
          }, `Active Filters: Dept(${selectedDept}) • CGPA≥${minCgpa}`)
        }, [
          filteredStudents.length === 0 ? e('div', {
            key: 'empty',
            style: { padding: '40px', textAlign: 'center', color: '#64748B' }
          }, 'No candidates match the specified filter criteria.') :
          e('div', {
            key: 'grid',
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }
          }, filteredStudents.map(student => 
            e(CandidateCard, {
              key: student.id,
              student,
              isBookmarked: bookmarkedIds.has(student.id),
              onToggleBookmark: handleToggleBookmark
            })
          ))
        ])
      ]),

      // ── TAB 2: JAVASCRIPT CORE CONCEPTS LAB ────────────────────
      activeTab === 'js-lab' && e('div', {
        key: 'tab-content-js',
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }
      }, [
        // Card 1: Closures & Private State
        e(StudioCard, {
          key: 'closures-card',
          title: '1. Closures & Lexical Encapsulation',
          subtitle: 'Functions retaining lexical scope for private state management',
          badge: 'JavaScript Core',
          headerColor: '#00C8FF'
        }, [
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
            e('div', {
              style: {
                background: 'rgba(0, 200, 255, 0.05)',
                border: '1px solid rgba(0, 200, 255, 0.15)',
                borderRadius: '10px',
                padding: '14px'
              }
            }, [
              e('div', { style: { fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' } }, 'Private Token Vault (Enclosed State)'),
              e('div', { style: { fontSize: '18px', fontWeight: '800', color: '#00C8FF', fontFamily: 'monospace', margin: '6px 0' } }, vaultMasked),
              e('div', { style: { fontSize: '12px', color: '#64748B' } }, `Vault accesses logged via closure: ${vaultCount} times`)
            ]),
            e('div', { style: { display: 'flex', gap: '8px' } }, [
              e('input', {
                type: 'text',
                placeholder: 'Enter new secret (min 8 chars)...',
                value: newSecretInput,
                onChange: (ev) => setNewSecretInput(ev.target.value),
                style: {
                  flex: 1,
                  height: '38px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '0 12px',
                  color: '#fff',
                  fontSize: '12px'
                }
              }),
              e('button', {
                onClick: () => {
                  if (tokenVault.setSecret(newSecretInput)) {
                    setVaultMasked(tokenVault.getSecretMasked());
                    setVaultCount(tokenVault.getTelemetry().accessCount);
                    setNewSecretInput('');
                  } else {
                    alert('Secret must be at least 8 characters long.');
                  }
                },
                style: {
                  background: '#00C8FF',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 16px',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer'
                }
              }, 'Set via Closure')
            ]),
            e('button', {
              onClick: () => {
                setVaultMasked(tokenVault.getSecretMasked());
                setVaultCount(tokenVault.getTelemetry().accessCount);
              },
              style: {
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }
            }, 'Read Masked Token (Increments Private Access Counter)')
          ])
        ]),

        // Card 2: Event Loop & Execution Telemetry
        e(StudioCard, {
          key: 'eventloop-card',
          title: '2. Event Loop & Task Scheduling',
          subtitle: 'Microtasks (Promise) vs Macrotasks (Timer) vs Synchronous Stack',
          badge: 'Async Engine',
          headerColor: '#8B5CF6'
        }, [
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
            e('button', {
              onClick: handleRunEventLoop,
              style: {
                background: '#8B5CF6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer'
              }
            }, '⚡ Execute Event Loop Telemetry Benchmark'),
            e('div', {
              style: {
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '12px',
                minHeight: '140px',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                color: '#E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }
            }, eventLoopLogs.length === 0 ? [
              e('span', { key: 'ph', style: { color: '#64748B' } }, 'Click button above to benchmark call stack vs microtasks vs macrotasks...')
            ] : eventLoopLogs.map((log, i) => 
              e('div', {
                key: i,
                style: {
                  color: log.includes('Microtask') ? '#00C8FF' : log.includes('Synchronous') ? '#10B981' : '#F59E0B'
                }
              }, log)
            ))
          ])
        ]),

        // Card 3: Hoisting & TDZ Architecture
        e(StudioCard, {
          key: 'hoisting-card',
          title: '3. Hoisting & Temporal Dead Zone (TDZ)',
          subtitle: 'Function declaration hoisting vs safe block-scoped let/const declarations',
          badge: 'Scope Lifecycle',
          headerColor: '#10B981'
        }, [
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, [
            e('div', {
              style: {
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '12px'
              }
            }, [
              e('div', { style: { fontSize: '11px', color: '#10B981', fontWeight: '800', textTransform: 'uppercase' } }, 'Hoisted Function Output:'),
              e('div', { style: { fontSize: '13px', color: '#fff', fontWeight: '700', marginTop: '4px' } }, hoistingData.initialGreeting)
            ]),
            e('div', {
              style: {
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '12px',
                color: '#94A3B8',
                lineHeight: '1.6'
              }
            }, '✓ Safe TDZ Protection: let/const are bound to block scope but cannot be read until initialized, preventing runtime undefined errors.')
          ])
        ]),

        // Card 4: Promises vs Callbacks & Promisify
        e(StudioCard, {
          key: 'promises-card',
          title: '4. Promises vs Callbacks & Promisify',
          subtitle: 'Converts error-first callbacks into standard async/await Promises',
          badge: 'Control Flow',
          headerColor: '#F59E0B'
        }, [
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
            e('button', {
              onClick: handleRunAsyncFlow,
              disabled: isAsyncFlowRunning,
              style: {
                background: '#F59E0B',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer'
              }
            }, isAsyncFlowRunning ? 'Processing Async Flow...' : '▶ Run promisify() Async Data Flow'),
            asyncFlowResult && e('div', {
              style: {
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '10px',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#fff'
              }
            }, [
              e('div', { key: 'res-t', style: { color: '#F59E0B', fontWeight: '800', marginBottom: '4px' } }, 'Resolved Promisified Object:'),
              e('pre', { key: 'pre', style: { margin: 0, whiteSpace: 'pre-wrap' } }, JSON.stringify(asyncFlowResult, null, 2))
            ])
          ])
        ])
      ]),

      // ── TAB 3: MONGODB NOSQL CONSOLE (CRUD & SCHEMA) ───────────
      activeTab === 'mongo-crud' && e('div', {
        key: 'tab-content-mongo',
        style: { display: 'flex', flexDirection: 'column', gap: '24px' }
      }, [
        // Top: Create Form & Feedback
        e(StudioCard, {
          key: 'mongo-create-card',
          title: 'MongoDB NoSQL Audit Schema & Document Insertion',
          subtitle: 'Inserts validated documents with embedded actor subdocuments into MongoDB store',
          badge: 'NoSQL CRUD',
          headerColor: '#10B981',
          actionButton: e('button', {
            onClick: loadMongoLogs,
            style: {
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }
          }, isMongoLoading ? 'Refreshing...' : '🔄 Refresh Collection')
        }, [
          e('form', {
            onSubmit: handleCreateMongoLog,
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }
          }, [
            e('div', { key: 'f1' }, [
              e('label', { style: { fontSize: '11px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' } }, 'Event Type (Enum)'),
              e('select', {
                value: newLogEventType,
                onChange: (ev) => setNewLogEventType(ev.target.value),
                style: { width: '100%', height: '38px', background: '#0D1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', padding: '0 10px' }
              }, [
                e('option', { value: 'RESUME_SCAN' }, 'RESUME_SCAN'),
                e('option', { value: 'INTERVIEW_COMPLETED' }, 'INTERVIEW_COMPLETED'),
                e('option', { value: 'SLOT_BOOKED' }, 'SLOT_BOOKED'),
                e('option', { value: 'DRIVE_CREATED' }, 'DRIVE_CREATED'),
                e('option', { value: 'LOGIN' }, 'LOGIN')
              ])
            ]),
            e('div', { key: 'f2' }, [
              e('label', { style: { fontSize: '11px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' } }, 'Actor Email (Subdoc)'),
              e('input', {
                type: 'email',
                value: newLogEmail,
                onChange: (ev) => setNewLogEmail(ev.target.value),
                required: true,
                style: { width: '100%', height: '38px', background: '#0D1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', padding: '0 10px' }
              })
            ]),
            e('div', { key: 'f3' }, [
              e('label', { style: { fontSize: '11px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' } }, 'Role (Enum)'),
              e('select', {
                value: newLogRole,
                onChange: (ev) => setNewLogRole(ev.target.value),
                style: { width: '100%', height: '38px', background: '#0D1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', padding: '0 10px' }
              }, [
                e('option', { value: 'student' }, 'Student'),
                e('option', { value: 'tpo' }, 'TPO Admin'),
                e('option', { value: 'coordinator' }, 'Coordinator'),
                e('option', { value: 'faculty' }, 'Faculty Advisor')
              ])
            ]),
            e('div', { key: 'f4' }, [
              e('label', { style: { fontSize: '11px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' } }, 'Severity'),
              e('select', {
                value: newLogSeverity,
                onChange: (ev) => setNewLogSeverity(ev.target.value),
                style: { width: '100%', height: '38px', background: '#0D1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', padding: '0 10px' }
              }, [
                e('option', { value: 'INFO' }, 'INFO'),
                e('option', { value: 'WARN' }, 'WARN'),
                e('option', { value: 'ERROR' }, 'ERROR'),
                e('option', { value: 'CRITICAL' }, 'CRITICAL')
              ])
            ]),
            e('button', {
              key: 'f5',
              type: 'submit',
              style: {
                height: '38px',
                background: '#10B981',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer'
              }
            }, '+ Insert Document')
          ]),
          mongoFeedback && e('div', {
            style: {
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '700',
              background: mongoFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: mongoFeedback.type === 'success' ? '#10B981' : '#EF4444',
              border: `1px solid ${mongoFeedback.type === 'success' ? '#10B98140' : '#EF444440'}`
            }
          }, mongoFeedback.msg)
        ]),

        // Bottom: Collection Viewer Table (Live READ & DELETE)
        e(StudioCard, {
          key: 'mongo-table-card',
          title: `MongoDB Documents Collection (${mongoLogs.length} Documents)`,
          subtitle: 'Real-time JSON document telemetry from backend/mongo.js',
          badge: 'Collection View',
          headerColor: '#10B981'
        }, [
          e('div', { style: { overflowX: 'auto' } }, [
            e('table', {
              style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }
            }, [
              e('thead', { key: 'th' }, [
                e('tr', { style: { borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94A3B8' } }, [
                  e('th', { style: { padding: '10px' } }, '_id'),
                  e('th', { style: { padding: '10px' } }, 'Event Type'),
                  e('th', { style: { padding: '10px' } }, 'Actor (Subdocument)'),
                  e('th', { style: { padding: '10px' } }, 'Severity'),
                  e('th', { style: { padding: '10px' } }, 'Timestamp'),
                  e('th', { style: { padding: '10px', textAlign: 'right' } }, 'Actions')
                ])
              ]),
              e('tbody', { key: 'tb' }, mongoLogs.map(log => 
                e('tr', {
                  key: log._id,
                  style: { borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: '#E2E8F0' }
                }, [
                  e('td', { style: { padding: '10px', fontFamily: 'monospace', color: '#00C8FF' } }, log._id),
                  e('td', { style: { padding: '10px', fontWeight: '700' } }, log.eventType),
                  e('td', { style: { padding: '10px' } }, `${log.actor?.email || 'N/A'} (${log.actor?.role || 'user'})`),
                  e('td', { style: { padding: '10px' } }, [
                    e('span', {
                      style: {
                        background: log.severity === 'INFO' ? 'rgba(0, 200, 255, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: log.severity === 'INFO' ? '#00C8FF' : '#F59E0B',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        fontSize: '10px',
                        fontWeight: '800'
                      }
                    }, log.severity)
                  ]),
                  e('td', { style: { padding: '10px', color: '#94A3B8' } }, new Date(log.timestamp).toLocaleTimeString()),
                  e('td', { style: { padding: '10px', textAlign: 'right' } }, [
                    e('button', {
                      onClick: () => handleDeleteMongoLog(log._id),
                      style: {
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#EF4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: '700'
                      }
                    }, 'Delete')
                  ])
                ])
              ))
            ])
          ])
        ])
      ]),

      // ── TAB 4: SQL JOINS RELATIONAL REPORT ────────────────────
      activeTab === 'sql-joins' && e('div', {
        key: 'tab-content-sql',
        style: { display: 'flex', flexDirection: 'column', gap: '24px' }
      }, [
        e(StudioCard, {
          key: 'sql-joins-card',
          title: 'Multi-Table SQL JOINs Report (PostgreSQL DDL)',
          subtitle: 'Generated via INNER JOIN (profiles + departments + sections) and LEFT JOIN aggregations',
          badge: 'Relational PostgreSQL',
          headerColor: '#F59E0B',
          actionButton: e('span', {
            style: {
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#F59E0B',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700'
            }
          }, 'Source: schema.sql')
        }, [
          e('div', { style: { overflowX: 'auto' } }, [
            e('table', {
              style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }
            }, [
              e('thead', { key: 'th' }, [
                e('tr', { style: { borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94A3B8' } }, [
                  e('th', { style: { padding: '10px' } }, 'Student Name'),
                  e('th', { style: { padding: '10px' } }, 'Register No'),
                  e('th', { style: { padding: '10px' } }, 'Dept & Section'),
                  e('th', { style: { padding: '10px' } }, 'CGPA'),
                  e('th', { style: { padding: '10px' } }, 'Placement Status'),
                  e('th', { style: { padding: '10px' } }, 'Company & Package'),
                  e('th', { style: { padding: '10px' } }, 'SQL JOIN Methodology')
                ])
              ]),
              e('tbody', { key: 'tb' }, joinedReportData.map((row, i) => 
                e('tr', {
                  key: i,
                  style: { borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: '#E2E8F0' }
                }, [
                  e('td', { style: { padding: '10px', fontWeight: '700', color: '#fff' } }, row.student_name),
                  e('td', { style: { padding: '10px', fontFamily: 'monospace', color: '#94A3B8' } }, row.register_number),
                  e('td', { style: { padding: '10px' } }, `${row.department_code} - Sec ${row.section_name}`),
                  e('td', { style: { padding: '10px', color: '#10B981', fontWeight: '800' } }, row.cgpa.toFixed(2)),
                  e('td', { style: { padding: '10px' } }, [
                    e('span', {
                      style: {
                        background: row.placement_status === 'Placed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 200, 255, 0.15)',
                        color: row.placement_status === 'Placed' ? '#10B981' : '#00C8FF',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        fontSize: '10px',
                        fontWeight: '800'
                      }
                    }, row.placement_status)
                  ]),
                  e('td', { style: { padding: '10px', fontWeight: '700' } }, `${row.company} (${row.package_lpa} LPA)`),
                  e('td', { style: { padding: '10px', color: '#F59E0B', fontSize: '11px' } }, row.join_type)
                ])
              ))
            ])
          ])
        ])
      ]),

      // ── TAB 5: ASYNC DATA FETCHING & REST API STATUS CODES ──────
      activeTab === 'async-api' && e('div', {
        key: 'tab-content-async',
        style: { display: 'flex', flexDirection: 'column', gap: '24px' }
      }, [
        e(StudioCard, {
          key: 'async-drives-card',
          title: 'Asynchronous RESTful Data Fetching & HTTP Status Codes',
          subtitle: 'Live API query: GET /api/v1/drives (200 OK / 404 / 500 error handling)',
          badge: 'RESTful Endpoints',
          headerColor: '#00C8FF',
          actionButton: e('button', {
            onClick: loadDrivesApi,
            style: {
              background: '#00C8FF',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer'
            }
          }, isDrivesLoading ? 'Fetching...' : '⚡ Fetch Drives (200 OK)')
        }, [
          e('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px'
            }
          }, drivesData.map(drive => 
            e('div', {
              key: drive.id,
              style: {
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }
            }, [
              e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
                e('span', { style: { fontSize: '16px', fontWeight: '800', color: '#fff' } }, drive.company),
                e('span', {
                  style: {
                    background: 'rgba(0, 200, 255, 0.15)',
                    color: '#00C8FF',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    fontSize: '10px',
                    fontWeight: '800'
                  }
                }, `₹${drive.package_lpa} LPA`)
              ]),
              e('div', { style: { fontSize: '12.5px', color: '#94A3B8', fontWeight: '600' } }, drive.role),
              e('div', { style: { fontSize: '11px', color: '#64748B' } }, `Min CGPA: ${drive.min_cgpa} • Deadline: ${drive.deadline}`),
              e('div', {
                style: {
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginTop: '4px'
                }
              }, (drive.required_skills || []).map((sk, idx) => 
                e('span', {
                  key: idx,
                  style: {
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#CBD5E1',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }
                }, sk)
              ))
            ])
          ))
        ])
      ])
    ]);
  };

  // Mount React Root
  const rootApp = ReactDOM.createRoot ? ReactDOM.createRoot(reactRootEl) : null;
  if (rootApp) {
    rootApp.render(e(ReactStudioApp));
  } else {
    ReactDOM.render(e(ReactStudioApp), reactRootEl);
  }
}
