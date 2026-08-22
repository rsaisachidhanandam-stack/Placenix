// ============================================================
// PLACENIX — NOTIFICATION SERVICE (v1.0)
// Role-aware, real-time notification engine for all dashboards.
// Generates notifications from existing Store data, persists
// read-state in localStorage, and listens to Supabase Realtime.
// ============================================================

const NotificationService = (function () {
  let _store     = null;
  let _supabase  = null;
  let _notifs    = [];
  let _panelOpen = false;
  let _initialized   = false;  // guards data generation
  let _listenersAdded = false; // guards DOM event listeners (NEVER reset)

  const LS_PREFIX = 'placenix_notif_read_';

  // ── Helpers ──────────────────────────────────────────────

  function _userId()  { return _store?.session?.user?.id  || 'guest'; }
  function _role()    { return _store?.session?.role       || 'guest'; }
  function _lsKey()   { return LS_PREFIX + _userId(); }

  function _loadReadIds() {
    try { return new Set(JSON.parse(localStorage.getItem(_lsKey()) || '[]')); }
    catch { return new Set(); }
  }

  function _saveReadIds(set) {
    try { localStorage.setItem(_lsKey(), JSON.stringify([...set])); }
    catch {}
  }

  function _id(...parts) {
    return 'notif_' + parts.join('_').replace(/[^a-z0-9]/gi, '').toLowerCase();
  }

  function _timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff) || diff < 0) return 'Just now';
    if (diff < 60_000)           return 'Just now';
    if (diff < 3_600_000)        return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000)       return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  }

  function _ago(hours) {
    return new Date(Date.now() - hours * 3_600_000).toISOString();
  }

  function _emit() {
    window.dispatchEvent(new CustomEvent('notifications-updated', {
      detail: { count: getUnreadCount() }
    }));
  }

  // ── Notification Generators (per role) ────────────────────

  function _generate() {
    const role   = _role();
    const store  = _store;
    const items  = [];

    const push = (id, type, title, body, link, createdAt) => {
      items.push({ id, type, title, body, link, createdAt: createdAt || _ago(0), read: false });
    };

    /* ── STUDENT ──────────────────────────────────────── */
    if (role === 'student') {
      const user     = store.session?.user;
      const rawName  = (user?.full_name || user?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

      // Open drives
      (store.drives || [])
        .filter(d => d.status === 'Open' || d.status === 'Active')
        .slice(0, 5)
        .forEach((drive, i) => {
          push(
            _id('drv', drive.id || i),
            'drive_posted',
            `New Drive: ${drive.company || 'Company'}`,
            `${drive.role || 'Role'} — Apply before ${drive.deadline || 'upcoming deadline'}`,
            'new-applications',
            drive.createdAt || drive.date || _ago(i * 8 + 2)
          );
        });

      // Kanban stage changes
      const stageLabels = {
        shortlisted: 'Shortlisted ✦',
        hr:          'Moved to HR Round',
        technical:   'Moved to Technical Round',
        aptitude:    'Moved to Aptitude Round',
        selected:    'Selected 🎉',
      };
      if (store.kanban) {
        Object.entries(stageLabels).forEach(([stage, label]) => {
          (store.kanban[stage] || []).forEach((card, i) => {
            const cardName = (card.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            if (rawName && cardName && (cardName.includes(rawName) || rawName.includes(cardName))) {
              push(
                _id('kbn', stage, card.driveId || card.drive || i),
                'status_changed',
                `Application Update — ${card.drive || 'Drive'}`,
                `${label} at ${card.drive || 'the company'}`,
                'student-dashboard',
                _ago(i * 5 + 1)
              );
            }
          });
        });
      }

      // Slot allocations for this student
      (store.slotAllocations || [])
        .filter(s =>
          String(s.studentId) === String(_userId()) ||
          (s.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(rawName)
        )
        .slice(0, 3)
        .forEach((slot, i) => {
          push(
            _id('slot', slot.id || i),
            'slot_allocated',
            `Interview Slot Confirmed`,
            `${slot.drive || 'Drive'} · ${slot.date || 'Date TBD'} at ${slot.time || 'Time TBD'}`,
            'my-slots',
            _ago(24 + i * 12)
          );
        });

      // Query replies
      (store.queries || [])
        .filter(q => q.status === 'Replied' || q.status === 'Resolved')
        .slice(0, 2)
        .forEach((q, i) => {
          push(
            _id('qrep', q.id || i),
            'query_reply',
            `Query Replied`,
            `TPO responded: "${(q.subject || q.message || 'your query').substring(0, 45)}..."`,
            'communication',
            _ago(48 + i * 24)
          );
        });
    }

    /* ── TPO ──────────────────────────────────────────── */
    else if (role === 'tpo') {
      const drives  = store.drives || [];
      const open    = drives.filter(d => d.status === 'Open' || d.status === 'Active');
      const closed  = drives.filter(d => d.status === 'Closed');

      open.slice(0, 3).forEach((drive, i) => {
        if ((drive.applicants || 0) > 0) {
          push(
            _id('tpo_drv', drive.id || i),
            'drive_active',
            `${drive.company || 'Company'} Drive Active`,
            `${drive.applicants} candidate(s) applied — review shortlist`,
            'kanban',
            drive.createdAt || _ago(i * 10 + 2)
          );
        }
      });

      closed.slice(0, 2).forEach((drive, i) => {
        push(
          _id('tpo_cls', drive.id || i),
          'drive_closed',
          `Drive Closed: ${drive.company || 'Company'}`,
          `Results finalized. ${drive.applicants || 0} candidate(s) processed.`,
          'kanban',
          _ago(i * 24 + 8)
        );
      });

      const pendingSlots = (store.slotAllocations || []).filter(s => s.status === 'Pending').length;
      if (pendingSlots > 0) {
        push(
          _id('tpo_slt'),
          'slot_pending',
          `${pendingSlots} Slot${pendingSlots > 1 ? 's' : ''} Awaiting Approval`,
          `Review and confirm interview slot allocations`,
          'slot-allocation',
          _ago(3)
        );
      }

      (store.students || []).slice(0, 2).forEach((s, i) => {
        push(
          _id('tpo_stu', s.id || i),
          'student_signup',
          `Student Registered: ${s.name || 'Student'}`,
          `${s.dept || 'Department'} — Profile ready for review`,
          'tpo-dashboard',
          _ago(i * 24 + 12)
        );
      });

      // Kanban selected — celebrate placements
      (store.kanban?.selected || []).slice(0, 3).forEach((card, i) => {
        push(
          _id('tpo_sel', card.name || i),
          'placement',
          `🎉 Student Placed: ${card.name || 'Student'}`,
          `Selected at ${card.drive || 'Company'} · Update registry`,
          'tpo-dashboard',
          _ago(i * 6 + 1)
        );
      });
    }

    /* ── COORDINATOR / DEPARTMENT ─────────────────────── */
    else if (role === 'coordinator' || role === 'department') {
      (store.drives || [])
        .filter(d => (d.applicants || 0) > 0)
        .slice(0, 3)
        .forEach((drive, i) => {
          push(
            _id('dept_drv', drive.id || i),
            'application',
            `${drive.applicants || 0} Student${drive.applicants !== 1 ? 's' : ''} Applied`,
            `${drive.company || 'Company'} — ${drive.role || 'Role'} drive`,
            'dept-new-jobs',
            drive.createdAt || _ago(i * 8 + 1)
          );
        });

      // Low attendance alerts
      (store.students || [])
        .filter(s => (s.attendance || 100) < 75)
        .slice(0, 3)
        .forEach((s, i) => {
          push(
            _id('dept_att', s.id || i),
            'attendance_low',
            `Low Attendance Alert`,
            `${s.name || 'Student'} — Attendance: ${s.attendance || '?'}%`,
            'attendance-tracker',
            _ago(i * 12 + 4)
          );
        });

      (store.queries || []).slice(0, 2).forEach((q, i) => {
        push(
          _id('dept_q', q.id || i),
          'query_received',
          `Student Query Received`,
          `"${(q.subject || q.message || 'Query').substring(0, 45)}"`,
          'dept-queries',
          _ago(i * 24 + 6)
        );
      });
    }

    /* ── FACULTY ──────────────────────────────────────── */
    else if (role === 'faculty') {
      (store.kanban?.shortlisted || []).slice(0, 3).forEach((card, i) => {
        push(
          _id('fac_sho', card.name || i),
          'mentee_update',
          `Mentee Shortlisted`,
          `${card.name || 'Student'} shortlisted at ${card.drive || 'Company'}`,
          'fa-students',
          _ago(i * 6 + 2)
        );
      });

      (store.kanban?.selected || []).slice(0, 2).forEach((card, i) => {
        push(
          _id('fac_sel', card.name || i),
          'mentee_placed',
          `🎉 Mentee Placed!`,
          `${card.name || 'Student'} selected at ${card.drive || 'Company'}`,
          'fa-students',
          _ago(i * 24 + 1)
        );
      });

      (store.students || []).slice(0, 2).forEach((s, i) => {
        push(
          _id('fac_skl', s.id || i),
          'skill_change',
          `Employability Score Updated`,
          `${s.name || 'Student'} — Score: ${s.employabilityScore || s.cgpa || 'Updated'}`,
          'fa-skills',
          _ago(i * 16 + 8)
        );
      });
    }

    /* ── ADMIN ────────────────────────────────────────── */
    else if (role === 'admin') {
      push(
        _id('adm_stf'),
        'staff_approval',
        `Staff Approval Queue`,
        `Review pending staff authorization and role assignment requests`,
        'admin-staff',
        _ago(4)
      );
      push(
        _id('adm_stp'),
        'setup',
        `Institutional Setup Reminder`,
        `Verify department mappings, sections, and access controls`,
        'admin-setup',
        _ago(28)
      );
    }

    // Append custom notifications from Store.notifications
    if (store && store.notifications && Array.isArray(store.notifications)) {
      const currentUserId = String(_userId());
      const currentRole = _role();
      store.notifications.forEach((n, i) => {
        const isTargetUser = !n.studentId || String(n.studentId) === currentUserId;
        if (isTargetUser || currentRole === 'tpo' || currentRole === 'admin') {
          push(
            n.id || _id('custom', i),
            n.type || 'slot_allocated',
            n.title || 'Notification Alert',
            n.body || n.desc || n.message || '',
            n.link || 'my-slots',
            n.createdAt || n.date || _ago(0)
          );
        }
      });
    }

    return items;
  }

  // ── Public API ────────────────────────────────────────────

  function getNotifications() {
    return [..._notifs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getUnreadCount() {
    return _notifs.filter(n => !n.read).length;
  }

  function markRead(id) {
    const n = _notifs.find(x => x.id === id);
    if (n && !n.read) {
      n.read = true;
      const set = _loadReadIds();
      set.add(id);
      _saveReadIds(set);
      refreshBadge();
      _emit();
    }
  }

  function markAllRead() {
    const set = _loadReadIds();
    _notifs.forEach(n => { n.read = true; set.add(n.id); });
    _saveReadIds(set);
    refreshBadge();
    _renderPanel();
    _emit();
  }

  function addNotification(n) {
    if (!_notifs.find(x => x.id === n.id)) {
      _notifs.unshift({ read: false, createdAt: new Date().toISOString(), ...n });
      refreshBadge();
      _emit();
    }
  }

  function refreshBadge() {
    const badge = document.getElementById('notif-badge');
    const count = getUnreadCount();
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // ── Panel UI ──────────────────────────────────────────────

  const TYPE_ICONS = {
    drive_posted:   '🏢', drive_active:  '🏢', drive_closed: '✅',
    slot_allocated: '📅', slot_pending:  '⏳', schedule: '🗓️', reminder: '⏰',
    status_changed: '📋', student_signup:'👤', placement:    '🎉',
    query_reply:    '💬', query_received:'💬',
    mentee_update:  '⭐', mentee_placed: '🎉', skill_change: '📈',
    attendance_low: '⚠️', application:  '📝',
    setup:          '⚙️', staff_approval:'👥',
  };

  function _groupByDate(notifs) {
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    const groups    = { Today: [], Yesterday: [], Earlier: [] };
    notifs.forEach(n => {
      const d = new Date(n.createdAt).toDateString();
      if (d === today)           groups.Today.push(n);
      else if (d === yesterday)  groups.Yesterday.push(n);
      else                       groups.Earlier.push(n);
    });
    return groups;
  }

  function _renderItem(n) {
    const icon   = TYPE_ICONS[n.type] || '🔔';
    const time   = _timeAgo(n.createdAt);
    const unread = !n.read;
    return `
      <div
        data-notif-id="${n.id}"
        data-notif-link="${n.link || ''}"
        class="placenix-notif-item${unread ? ' placenix-notif-item--unread' : ''}"
        role="button"
        tabindex="0"
      >
        <span class="placenix-notif-icon">${icon}</span>
        <div class="placenix-notif-body">
          <div class="placenix-notif-title">${n.title}</div>
          <div class="placenix-notif-desc">${n.body || ''}</div>
          <div class="placenix-notif-time">${time}</div>
        </div>
        ${unread ? '<span class="placenix-notif-dot"></span>' : ''}
      </div>`;
  }

  function _renderGroup(label, items) {
    if (!items.length) return '';
    return `
      <div class="placenix-notif-group-label">${label}</div>
      ${items.map(_renderItem).join('')}`;
  }

  function _renderPanel() {
    let panel = document.getElementById('notif-panel');
    if (!panel) return;

    const notifs = getNotifications();
    const groups = _groupByDate(notifs);
    const unread = getUnreadCount();

    const bodyHTML = notifs.length > 0
      ? Object.entries(groups).map(([label, items]) => _renderGroup(label, items)).join('')
      : `<div class="placenix-notif-empty">
           <div class="placenix-notif-empty-icon">🔔</div>
           <div class="placenix-notif-empty-title">All caught up!</div>
           <div class="placenix-notif-empty-sub">No new notifications right now.</div>
         </div>`;

    panel.innerHTML = `
      <div class="placenix-notif-header">
        <div class="placenix-notif-header-left">
          <span style="font-size:17px;">🔔</span>
          <span class="placenix-notif-header-title">Notifications</span>
          ${unread > 0 ? `<span class="placenix-notif-count-badge">${unread}</span>` : ''}
        </div>
        ${unread > 0 ? `<button id="notif-mark-all" class="placenix-notif-markall">Mark all read ✓</button>` : ''}
      </div>
      <div class="placenix-notif-scroll">${bodyHTML}</div>`;
  }

  function _openPanel() {
    _panelOpen = true;
    let panel = document.getElementById('notif-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'notif-panel';
      panel.className = 'placenix-notif-panel';
      const wrapper = document.getElementById('notif-wrapper');
      if (wrapper) wrapper.appendChild(panel);
      else document.body.appendChild(panel);
    }
    _renderPanel();
    panel.style.display = 'block';
    requestAnimationFrame(() => panel.classList.add('placenix-notif-panel--open'));
  }

  function _closePanel() {
    _panelOpen = false;
    const panel = document.getElementById('notif-panel');
    if (panel) {
      panel.classList.remove('placenix-notif-panel--open');
      setTimeout(() => { if (panel) panel.style.display = 'none'; }, 230);
    }
  }

  function _togglePanel() {
    _panelOpen ? _closePanel() : _openPanel();
  }

  // ── CSS injection (once) ──────────────────────────────────

  function _injectCSS() {
    if (document.getElementById('placenix-notif-css')) return;
    const style = document.createElement('style');
    style.id = 'placenix-notif-css';
    style.textContent = `
      /* ── Notification Panel ── */
      .placenix-notif-panel {
        position: absolute;
        top: calc(100% + 14px);
        right: -4px;
        width: 380px;
        max-height: 540px;
        background: rgba(10, 14, 22, 0.96);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border: 1px solid var(--glass-border-main);
        border-radius: var(--radius-xl);
        box-shadow: var(--glass-shadow-xl);
        z-index: 9999;
        display: none;
        overflow: hidden;
        opacity: 0;
        transform: translateY(-10px) scale(0.96);
        transition: opacity 230ms cubic-bezier(0.4,0,0.2,1),
                    transform 230ms cubic-bezier(0.34,1.36,0.64,1);
      }
      .placenix-notif-panel::before {
        content: '';
        position: absolute;
        top: 0; left: 8%; right: 8%;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--glass-specular), transparent);
        pointer-events: none;
        z-index: 1;
      }
      .placenix-notif-panel--open {
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }

      /* ── Header ── */
      .placenix-notif-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 16px 12px;
        border-bottom: 1px solid var(--glass-border-subtle);
        position: sticky;
        top: 0;
        background: rgba(10, 14, 22, 0.96);
        backdrop-filter: blur(20px);
        z-index: 2;
      }
      .placenix-notif-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .placenix-notif-header-title {
        font-family: var(--font-display);
        font-size: 15px;
        font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.01em;
      }
      .placenix-notif-count-badge {
        background: var(--brand-primary);
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 20px;
        font-family: var(--font-sans);
        letter-spacing: 0;
      }
      .placenix-notif-markall {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        color: var(--brand-primary);
        padding: 5px 10px;
        border-radius: 8px;
        transition: background 150ms ease;
        font-family: var(--font-sans);
      }
      .placenix-notif-markall:hover {
        background: var(--brand-primary-light);
      }

      /* ── Scroll Area ── */
      .placenix-notif-scroll {
        overflow-y: auto;
        max-height: 460px;
        padding: 8px 0 8px;
        scrollbar-width: thin;
        scrollbar-color: var(--glass-border-main) transparent;
      }
      .placenix-notif-scroll::-webkit-scrollbar { width: 4px; }
      .placenix-notif-scroll::-webkit-scrollbar-track { background: transparent; }
      .placenix-notif-scroll::-webkit-scrollbar-thumb {
        background: var(--glass-border-main);
        border-radius: 2px;
      }

      /* ── Group label ── */
      .placenix-notif-group-label {
        padding: 10px 18px 4px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
      }

      /* ── Notification Item ── */
      .placenix-notif-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 11px 16px;
        margin: 2px 8px;
        border-radius: 10px;
        cursor: pointer;
        border-left: 3px solid transparent;
        transition: background 150ms ease, border-color 150ms ease;
        outline: none;
      }
      .placenix-notif-item:hover {
        background: var(--bg-hover);
      }
      .placenix-notif-item--unread {
        border-left-color: var(--brand-primary);
        background: var(--brand-primary-light);
      }
      .placenix-notif-item--unread:hover {
        background: var(--brand-secondary-light, var(--brand-primary-light));
        opacity: 0.9;
      }
      .placenix-notif-icon {
        font-size: 18px;
        flex-shrink: 0;
        margin-top: 1px;
        line-height: 1;
      }
      .placenix-notif-body {
        flex: 1;
        min-width: 0;
      }
      .placenix-notif-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-main);
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .placenix-notif-item:not(.placenix-notif-item--unread) .placenix-notif-title {
        font-weight: 500;
        color: var(--text-description);
      }
      .placenix-notif-desc {
        font-size: 12px;
        color: var(--text-description);
        margin-top: 2px;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .placenix-notif-time {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 4px;
        font-weight: 500;
      }
      .placenix-notif-dot {
        width: 8px;
        height: 8px;
        background: var(--brand-primary);
        border-radius: 50%;
        flex-shrink: 0;
        margin-top: 5px;
        box-shadow: 0 0 6px var(--brand-primary-glow);
      }

      /* ── Empty State ── */
      .placenix-notif-empty {
        padding: 48px 24px;
        text-align: center;
      }
      .placenix-notif-empty-icon {
        font-size: 36px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
      .placenix-notif-empty-title {
        font-family: var(--font-display);
        font-size: 14px;
        font-weight: 700;
        color: var(--text-description);
      }
      .placenix-notif-empty-sub {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      /* ── Bell Badge ── */
      #notif-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        min-width: 16px;
        height: 16px;
        background: var(--brand-primary);
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        border-radius: 8px;
        border: 2px solid var(--bg-app);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 3px;
        font-family: var(--font-sans);
        letter-spacing: 0;
        animation: notif-badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
        box-shadow: 0 0 6px var(--brand-primary-glow);
        pointer-events: none;
      }
      @keyframes notif-badge-pop {
        from { transform: scale(0.4); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Init ──────────────────────────────────────────────────

  function init(Store, supabase) {
    if (_initialized) {
      // Re-generate for new role on re-login
      const generated = _generate();
      const readIds   = _loadReadIds();
      generated.forEach(n => { n.read = readIds.has(n.id); });
      _notifs = generated;
      refreshBadge();
      _emit();
      return;
    }
    _initialized = true;
    _store    = Store;
    _supabase = supabase;

    // Inject styles once
    _injectCSS();

    // Generate from Store
    const generated = _generate();
    const readIds   = _loadReadIds();
    generated.forEach(n => { n.read = readIds.has(n.id); });
    _notifs = generated;

    // ── DOM Event listeners — registered ONCE only ──
    if (!_listenersAdded) {
      _listenersAdded = true;

      document.addEventListener('click', (e) => {
        // Bell toggle
        if (e.target.closest('#notif-bell-btn') || e.target.closest('#notif-trigger')) {
          e.stopPropagation();
          _togglePanel();
          return;
        }
        // Mark all read
        if (e.target.closest('#notif-mark-all')) {
          e.stopPropagation();
          markAllRead();
          return;
        }
        // Notification item click
        const item = e.target.closest('[data-notif-id]');
        if (item) {
          e.stopPropagation();
          const id   = item.getAttribute('data-notif-id');
          const link = item.getAttribute('data-notif-link');
          if (id)   markRead(id);
          if (link) { window.location.hash = link; _closePanel(); }
          return;
        }
        // Outside-click closes panel
        if (_panelOpen) {
          const wrapper = document.getElementById('notif-wrapper');
          if (wrapper && !wrapper.contains(e.target)) {
            _closePanel();
          }
        }
      });

      // Escape key closes panel
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && _panelOpen) _closePanel();
      });

      // Refresh badge whenever topbar re-renders (navigation)
      window.addEventListener('page-transition-complete', () => {
        setTimeout(refreshBadge, 80);
      });

      // Re-generate notifications on store-updated (login/role-change)
      // NOTE: do NOT reset _listenersAdded — listeners must stay registered
      window.addEventListener('store-updated', () => {
        _initialized = false; // allow re-generation
        // Re-generate with updated role/user without adding new listeners
        _store = Store; // capture latest Store reference
        const fresh = _generate();
        const reads = _loadReadIds();
        fresh.forEach(n => { n.read = reads.has(n.id); });
        _notifs = fresh;
        _initialized = true;
        refreshBadge();
        _emit();
      });
    }

    // ── Supabase Realtime ──
    if (_supabase) {
      try {
        _supabase.channel('placenix-notif-realtime')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
              const row = payload.new;
              if (
                String(row.user_id) === String(_userId()) ||
                row.role === _role()
              ) {
                addNotification({
                  id:        row.id,
                  type:      row.type,
                  title:     row.title,
                  body:      row.body,
                  link:      row.link,
                  createdAt: row.created_at,
                });
                if (window.showToast) {
                  window.showToast(`🔔 ${row.title}`, 'info', 4500);
                }
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('⚠️ NotificationService: Realtime subscription failed:', err);
      }
    }

    // Retry badge rendering after topbar mounts
    refreshBadge();
    setTimeout(refreshBadge, 400);
    setTimeout(refreshBadge, 1200);

    console.log(`🔔 NotificationService: Initialized — ${_notifs.length} notifications for [${_role()}]`);
  }

  return { init, getNotifications, getUnreadCount, markRead, markAllRead, addNotification, refreshBadge };
})();

export default NotificationService;
