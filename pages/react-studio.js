// ============================================================
// PLACENIX — REACT COMPONENT STUDIO & INTERACTIVE AI LAB
// Demonstrates:
// 1. React Component Composition (Compound Components, Container/Presentational)
// 2. State Management with useState (Multi-Filter Controls, Sliders, Theme Toggles)
// 3. Side Effects with useEffect (API Data Fetching, Timers, Cleanups, Event Listeners)
// ============================================================

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
    // ── useState (State Management) ──
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [minCgpa, setMinCgpa] = useState(7.0);
    const [minAts, setMinAts] = useState(60);
    const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
    const [activeTheme, setActiveTheme] = useState('cyber'); // 'cyber' | 'emerald' | 'solar'
    const [apiData, setApiData] = useState([]);
    const [liveTicker, setLiveTicker] = useState(0);
    const [serverHealth, setServerHealth] = useState(null);

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

    // ── useEffect 1: Asynchronous REST API Fetching with Cleanup ──
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
          if (isMounted) console.log('Backend health check info:', e.message);
        }
      }

      fetchBackendTelemetry();

      return () => {
        isMounted = false;
        controller.abort(); // Cleanup side-effect
      };
    }, []);

    // ── useEffect 2: Live Auto-Incrementing Telemetry Interval Timer ──
    useEffect(() => {
      const intervalId = setInterval(() => {
        setLiveTicker(prev => prev + 1);
      }, 1000);

      return () => clearInterval(intervalId); // Cleanup interval
    }, []);

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
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '32px' } }, [
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
          }, '⚛️ React 18 Component Composition & Hooks Studio'),
          e('h1', {
            key: 'title',
            style: { fontSize: '32px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.03em' }
          }, 'Candidate Intelligence Studio'),
          e('p', {
            key: 'sub',
            style: { fontSize: '14px', color: '#94A3B8', margin: '6px 0 0 0' }
          }, 'Powered by declarative React state management (useState) and lifecycle side-effects (useEffect).')
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
        style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }
      }, [
        e(StatBadge, { key: 'b1', label: 'Matching Candidates', value: `${filteredStudents.length} / ${initialStudents.length}`, color: currentColor, icon: '👥' }),
        e(StatBadge, { key: 'b2', label: 'Pinned Shortlist', value: `${bookmarkedIds.size}`, color: '#10B981', icon: '★' }),
        e(StatBadge, { key: 'b3', label: 'Telemetry Heartbeat', value: `${liveTicker}s Active`, color: '#8B5CF6', icon: '⚡' }),
        e(StatBadge, { key: 'b4', label: 'REST API Health', value: serverHealth?.status || 'Online', color: '#F59E0B', icon: '🛡️' })
      ]),

      // 3. Main Workspace Grid
      e('div', {
        key: 'workspace-grid',
        style: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }
      }, [
        // Left Column: Interactive Filter Sidebar (useState controls)
        e(StudioCard, {
          key: 'filters-card',
          title: 'Interactive Filters',
          subtitle: 'Mutates local state via useState hooks',
          badge: 'Control Panel',
          headerColor: currentColor
        }, [
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px' } }, [
            // Search Input
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

            // Department Select
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

            // CGPA Slider
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

            // ATS Score Slider
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

            // Reset Button
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
          badge: 'Live Results',
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
