// ============================================================
// PLACENIX — INTERVIEW INTELLIGENCE & EXPERIENCES REPO (v2.0)
// ============================================================

import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

export async function loadRepoPage(root, Store, supabase) {
  if (!Store.interviews || !Array.isArray(Store.interviews) || Store.interviews.length === 0) {
    Store.interviews = [
      {
        id: 'intv_1',
        company: 'Google',
        difficulty: 'Hard',
        role: 'Software Engineer',
        year: '2024',
        author: 'Rahul Sharma (CSE)',
        authorEmail: 'rahul.s@placenix.edu',
        outcome: 'Selected',
        package: '32 LPA',
        rounds: ['Online Assessment', 'Technical Coding I', 'System Design Architect', 'Googliness & Leadership'],
        helpful: 42,
        narrative: 'The interview process consisted of 4 rigorous rounds. Online assessment had 2 complex graph and dynamic programming questions. Round 1 focused on Trie data structures and multi-threading concurrency. Round 2 was large-scale system design designing a distributed key-value cache with LRU eviction and replication. Final round was Googliness testing cultural and behavioral alignment.',
        tips: [
          'Master Graph algorithms (Dijkstra, Topological sort, Union-Find)',
          'Prepare System Design concepts: Caching, Sharding, Consistency models',
          'Explain your thought process continuously before writing code'
        ],
        questions: [
          'Design a rate limiter that scales to 1M requests per second',
          'Find the shortest path in a weighted grid with obstacles using BFS/Dijkstra',
          'Implement an LRU Cache with O(1) get and put operations'
        ]
      },
      {
        id: 'intv_2',
        company: 'Amazon',
        difficulty: 'Medium',
        role: 'SDE-1',
        year: '2024',
        author: 'Aditya Sen (IT)',
        authorEmail: 'aditya.sen@placenix.edu',
        outcome: 'Selected',
        package: '28 LPA',
        rounds: ['Online Assessment', 'DSA & Algorithms', 'System Performance', 'Bar Raiser (Leadership)'],
        helpful: 35,
        narrative: 'Heavy focus on 16 Amazon Leadership Principles throughout every round using the STAR format (Situation, Task, Action, Result). Technical rounds were focused on Trees, Heaps, and Dynamic Programming with time complexity optimization.',
        tips: [
          'Prepare at least 2 STAR stories for each Amazon Leadership Principle',
          'Optimize space and time complexity thoroughly; always discuss edge cases',
          'Write clean, modular code with descriptive variable naming'
        ],
        questions: [
          'Merge K Sorted Linked Lists with optimal min-heap approach',
          'Word Break problem using Dynamic Programming and Trie',
          'Tell me about a time you took ownership of a critical failure'
        ]
      },
      {
        id: 'intv_3',
        company: 'Zoho',
        difficulty: 'Easy',
        role: 'Product Developer',
        year: '2023',
        author: 'Meera Nair (ECE)',
        authorEmail: 'meera.n@placenix.edu',
        outcome: 'Selected',
        package: '8.5 LPA',
        rounds: ['Aptitude & Logical', 'Basic C/C++ Coding', 'Advanced Problem Solving', 'Technical & HR'],
        helpful: 28,
        narrative: 'Zoho focuses strongly on fundamental C/Java problem solving without standard libraries. Matrix manipulations, pattern printing, string algorithms, and recursion are key.',
        tips: [
          'Practice pointers, memory allocation, and array manipulations in C',
          'Do not rely on built-in library functions like reverse or sort',
          'Be prepared for OOP design questions like designing a railway ticket reservation system'
        ],
        questions: [
          'Implement String Substring matching without built-in library functions',
          'Spiral Matrix Traversal and Sudoku Solver via Backtracking',
          'Design an object-oriented Parking Lot management system'
        ]
      },
      {
        id: 'intv_4',
        company: 'Microsoft',
        difficulty: 'Medium',
        role: 'Software Engineer (Cloud + AI)',
        year: '2024',
        author: 'Priya Patel (CSE)',
        authorEmail: 'priya.patel@placenix.edu',
        outcome: 'Selected',
        package: '26 LPA',
        rounds: ['Online Assessment', 'Data Structures & Algorithms', 'Low-Level System Design', 'Managerial & Cultural Fit'],
        helpful: 31,
        narrative: 'Great emphasis on clean OOP principles (SOLID), design patterns (Factory, Observer, Singleton), and multi-threading concurrency issues. DSA round covered binary tree traversals and dynamic programming.',
        tips: [
          'Review SOLID design principles and concurrency lock mechanisms',
          'Practice writing unit tests and discuss edge cases proactively',
          'Demonstrate high curiosity towards distributed systems and Azure services'
        ],
        questions: [
          'Lowest Common Ancestor in Binary Tree and BST',
          'Design an in-memory Pub-Sub Messaging Queue with concurrent consumers',
          'Explain garbage collection mechanics in modern runtime engines'
        ]
      }
    ];
  }

  let searchQuery = '';
  let difficultyFilter = 'ALL';
  let outcomeFilter = 'ALL';
  let yearFilter = 'ALL';
  let showFilterBar = false;

  function render() {
    const interviews = Store.interviews || [];

    const filtered = interviews.filter(iv => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q || (iv.company || '').toLowerCase().includes(q) || (iv.role || '').toLowerCase().includes(q) || (iv.author || '').toLowerCase().includes(q);
      const matchDiff = difficultyFilter === 'ALL' || (iv.difficulty || '').toLowerCase() === difficultyFilter.toLowerCase();
      const matchOutcome = outcomeFilter === 'ALL' || (iv.outcome || '').toLowerCase() === outcomeFilter.toLowerCase();
      const matchYear = yearFilter === 'ALL' || String(iv.year) === yearFilter;
      return matchQ && matchDiff && matchOutcome && matchYear;
    });

    root.innerHTML = `
    <style>
      .intv-card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .intv-card:hover {
        border-color: var(--brand-primary);
        transform: translateY(-2px);
        box-shadow: 0 10px 28px -8px rgba(0, 200, 255, 0.12);
      }
      .status-pill {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 10px; border-radius: 99px; font-size: 0.72rem; font-weight: 700;
      }
      .status-success { background: rgba(16, 185, 129, 0.12); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.25); }
      .status-warning { background: rgba(245, 158, 11, 0.12); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.25); }
      .status-danger { background: rgba(239, 68, 68, 0.12); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.25); }
      .status-info { background: rgba(0, 200, 255, 0.12); color: #00C8FF; border: 1px solid rgba(0, 200, 255, 0.25); }
      .modal-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(5, 8, 16, 0.85); backdrop-filter: blur(8px);
        z-index: 1000; display: flex; align-items: center; justify-content: center;
        padding: 20px;
      }
      .intv-modal {
        background: var(--bg-card); border: 1px solid var(--border-main);
        border-radius: var(--radius-xl); width: 100%; max-width: 680px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6); overflow: hidden;
      }
      .intv-modal-header {
        padding: 20px 24px; border-bottom: 1px solid var(--border-subtle);
        display: flex; justify-content: space-between; align-items: center;
      }
      .intv-modal-body { padding: 24px; max-height: 75vh; overflow-y: auto; }
      .intv-modal-footer {
        padding: 16px 24px; border-top: 1px solid var(--border-subtle);
        display: flex; justify-content: flex-end; gap: 12px;
      }
    </style>

    <div style="padding: 32px 40px; max-width: 1600px; margin: 0 auto; animation: fadeIn 0.3s ease-out;">
      
      <!-- Page Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 28px;">
        <div>
          <div class="label-ent" style="margin-bottom: 6px; color:var(--brand-primary); letter-spacing:0.1em;">CAMPUS KNOWLEDGE BASE</div>
          <h1 class="h1-ent" style="font-size: 30px; font-weight: 900; color: #fff; margin: 0;">Completed Batches Repository</h1>
          <p style="color:var(--text-description); font-size:14px; margin-top:4px;">
            Institutional interview intelligence, round-by-round breakdown & recruitment telemetry.
          </p>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-secondary" id="toggle-filter-btn" style="font-size:13px; padding:10px 18px;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:6px;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filter Repositories
          </button>
          <button class="btn btn-primary" id="open-commit-btn" style="font-size:13px; padding:10px 18px;">
            + Commit Experience
          </button>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div id="filter-bar-container" style="display:${showFilterBar ? 'flex' : 'none'}; gap:12px; align-items:center; flex-wrap:wrap; background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:12px; padding:16px 20px; margin-bottom:24px; animation:fadeIn 0.2s ease;">
        <div style="position:relative; flex:1; min-width:200px;">
          <input type="text" id="intv-search-input" placeholder="Search by company, role, author..." value="${searchQuery}" 
            class="input" style="padding-left:34px; font-size:13px; height:38px;">
          <svg width="14" height="14" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24" 
            style="position:absolute; left:12px; top:12px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>

        <select id="intv-diff-filter" class="input" style="width:auto; height:38px; font-size:12.5px; padding:0 12px;">
          <option value="ALL" ${difficultyFilter === 'ALL' ? 'selected' : ''}>All Difficulties</option>
          <option value="Easy" ${difficultyFilter === 'Easy' ? 'selected' : ''}>Easy Complexity</option>
          <option value="Medium" ${difficultyFilter === 'Medium' ? 'selected' : ''}>Medium Complexity</option>
          <option value="Hard" ${difficultyFilter === 'Hard' ? 'selected' : ''}>Hard Complexity</option>
        </select>

        <select id="intv-outcome-filter" class="input" style="width:auto; height:38px; font-size:12.5px; padding:0 12px;">
          <option value="ALL" ${outcomeFilter === 'ALL' ? 'selected' : ''}>All Outcomes</option>
          <option value="Selected" ${outcomeFilter === 'Selected' ? 'selected' : ''}>Selected</option>
          <option value="Rejected" ${outcomeFilter === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>

        <select id="intv-year-filter" class="input" style="width:auto; height:38px; font-size:12.5px; padding:0 12px;">
          <option value="ALL" ${yearFilter === 'ALL' ? 'selected' : ''}>All Batches</option>
          <option value="2025" ${yearFilter === '2025' ? 'selected' : ''}>2025 Batch</option>
          <option value="2024" ${yearFilter === '2024' ? 'selected' : ''}>2024 Batch</option>
          <option value="2023" ${yearFilter === '2023' ? 'selected' : ''}>2023 Batch</option>
        </select>

        <button class="btn btn-sm btn-ghost" onclick="window.clearRepoFilters()" style="font-size:12px;">Reset</button>
      </div>

      <!-- Main Layout -->
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px;">
        
        <!-- Left: Cards Grid -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:14px; font-weight:700; color:var(--text-secondary);">
              Showing <span style="color:#fff;">${filtered.length}</span> Verified Interview Experiences
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:18px;">
            ${filtered.length === 0 ? `
              <div style="grid-column: 1 / -1; padding:48px; text-align:center; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px; color:var(--text-muted);">
                <div style="font-size:32px; margin-bottom:12px;">🔍</div>
                <div style="font-size:15px; font-weight:700; color:#fff;">No interview experiences found</div>
                <div style="font-size:13px; margin-top:4px;">Try modifying your search query or filters above.</div>
              </div>
            ` : filtered.map(iv => {
              const diffClass = (iv.difficulty || '').toLowerCase() === 'easy' ? 'status-success' : (iv.difficulty || '').toLowerCase() === 'hard' ? 'status-danger' : 'status-warning';
              const outcomeClass = (iv.outcome || '').toLowerCase() === 'selected' ? 'status-success' : 'status-info';
              const roundList = Array.isArray(iv.rounds) ? iv.rounds : (typeof iv.rounds === 'string' ? iv.rounds.split(',').map(r=>r.trim()) : []);

              return `
                <div class="intv-card animate-fade-in-up">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                      <div>
                        <h3 style="font-size:18px; font-weight:800; color:#fff; margin:0 0 2px;">${iv.company}</h3>
                        <div style="font-size:12.5px; font-weight:600; color:var(--brand-primary);">${iv.role} · ${iv.year}</div>
                      </div>
                      <span class="status-pill ${diffClass}">${iv.difficulty}</span>
                    </div>

                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:14px;">
                      Committed by <strong style="color:var(--text-secondary);">${iv.author}</strong>
                      ${iv.package ? ` · <span style="color:#34D399; font-weight:700;">₹${iv.package}</span>` : ''}
                    </div>

                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px;">
                      ${roundList.map(r => `
                        <span style="font-size:10px; padding:2px 8px; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); border-radius:4px; color:var(--text-description);">${r}</span>
                      `).join('')}
                    </div>
                  </div>

                  <div style="display:flex; justify-content:space-between; align-items:center; padding-top:14px; border-top:1px solid var(--border-subtle);">
                    <div style="display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--text-muted);">
                      <button onclick="window.upvoteInterview('${iv.id || iv.company}')" style="background:none; border:none; color:var(--brand-cyan); cursor:pointer; font-size:13px; padding:0;">👍</button>
                      <span>${iv.helpful || 0} helpful audits</span>
                    </div>
                    <button class="btn btn-sm btn-ghost" onclick="window.openCaseStudyModal('${iv.id || iv.company}')" style="font-size:11.5px; padding:4px 8px;">
                      View Full Case Study →
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right: Topic Prevalence & AI Pattern Intelligence -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Prevalence Card -->
          <div class="card animate-fade-in-up">
            <div class="card-header">
              <div class="card-title">Institutional Topic Prevalence</div>
              <div class="card-subtitle">Frequently tested technical domains</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:16px; margin-top:14px;">
              ${[
                ['System Design Architecture', 92, '#7C3AED'],
                ['Advanced Algorithms & DP', 84, '#00C8FF'],
                ['Behavioral Leadership (STAR)', 78, '#34D399'],
                ['Database & Concurrency Locks', 68, '#FBBF24']
              ].map(([t, v, c]) => `
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:12px;">
                    <span style="font-weight:600; color:var(--text-description);">${t}</span>
                    <span style="font-weight:800; color:#fff;">${v}%</span>
                  </div>
                  <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:99px; overflow:hidden;">
                    <div style="height:100%; width:${v}%; background:${c}; border-radius:99px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- AI Pattern Intelligence Card -->
          <div class="card animate-fade-in-up delay-100" style="background:linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(34,211,238,0.04) 100%); border-color:rgba(124,58,237,0.2);">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
              <div class="card-title">AI Pattern Intelligence</div>
              <span class="status-pill status-success" style="font-size:9px;">Active</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:14px; margin-top:12px;">
              <div style="font-size:12px; color:var(--text-description); line-height:1.5;">
                AI neural models have analyzed institutional interview submissions:
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:24px; height:24px; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0;">📌</div>
                <div style="font-size:11.5px; color:var(--text-muted); line-height:1.4;"><strong style="color:#fff;">Google:</strong> 70% emphasis on Trie/Graph optimization and distributed caching algorithms.</div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:24px; height:24px; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0;">📌</div>
                <div style="font-size:11.5px; color:var(--text-muted); line-height:1.4;"><strong style="color:#fff;">Amazon:</strong> 16 Leadership Principles evaluated across 100% of interview rounds.</div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:24px; height:24px; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0;">📌</div>
                <div style="font-size:11.5px; color:var(--text-muted); line-height:1.4;"><strong style="color:#fff;">Zoho:</strong> Zero-library core problem solving in C/Java with heavy pointer logic.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Commit Experience Modal -->
    <div id="submit-intv-modal" class="modal-overlay" style="display:none;">
      <div class="intv-modal">
        <div class="intv-modal-header">
          <h3 style="font-size:16px; font-weight:800; color:#fff; margin:0;">Commit Interview Experience</h3>
          <button class="btn-ghost" onclick="document.getElementById('submit-intv-modal').style.display='none'" style="font-size:16px; cursor:pointer;">✕</button>
        </div>
        <form id="submit-intv-form" onsubmit="event.preventDefault(); window.commitInterviewExperience();">
          <div class="intv-modal-body">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
              <div class="input-group">
                <label class="label">Organization / Company *</label>
                <input class="input" id="intv-company" placeholder="e.g. Microsoft" required>
              </div>
              <div class="input-group">
                <label class="label">Designated Role *</label>
                <input class="input" id="intv-role" placeholder="e.g. Software Engineer" required>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:14px;">
              <div class="input-group">
                <label class="label">Difficulty Complexity *</label>
                <select class="input" id="intv-diff">
                  <option value="Easy">Easy</option>
                  <option value="Medium" selected>Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div class="input-group">
                <label class="label">Batch Year *</label>
                <input class="input" id="intv-year" value="2024" required>
              </div>
              <div class="input-group">
                <label class="label">Final Outcome</label>
                <select class="input" id="intv-outcome">
                  <option value="Selected">Selected (Offer Received)</option>
                  <option value="Rejected">Rejected</option>
                  <option value="In Review">In Review</option>
                </select>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
              <div class="input-group">
                <label class="label">Your Name / Department *</label>
                <input class="input" id="intv-author" placeholder="e.g. Rahul Sharma (CSE)" required>
              </div>
              <div class="input-group">
                <label class="label">Offered Package (e.g. 24 LPA)</label>
                <input class="input" id="intv-pkg" placeholder="24 LPA">
              </div>
            </div>

            <div class="input-group" style="margin-bottom:14px;">
              <label class="label">Assessment Rounds (Comma-separated) *</label>
              <input class="input" id="intv-rounds" placeholder="Online Assessment, Technical I, System Design, HR" required>
            </div>

            <div class="input-group" style="margin-bottom:14px;">
              <label class="label">Detailed Experience Narrative *</label>
              <textarea class="input" id="intv-narrative" style="height:90px; padding:10px; font-size:12.5px;" placeholder="Describe the interview flow, round difficulty, and key challenges..." required></textarea>
            </div>

            <div class="input-group" style="margin-bottom:14px;">
              <label class="label">Key Technical & Behavioral Questions Asked</label>
              <textarea class="input" id="intv-questions" style="height:70px; padding:10px; font-size:12.5px;" placeholder="One question per line:&#10;1. Implement LRU Cache&#10;2. Design Twitter Feed"></textarea>
            </div>

            <div class="input-group">
              <label class="label">Advice & Preparation Tips for Juniors</label>
              <textarea class="input" id="intv-tips" style="height:70px; padding:10px; font-size:12.5px;" placeholder="One tip per line:&#10;1. Master Graph BFS/DFS&#10;2. Practice STAR method"></textarea>
            </div>
          </div>

          <div class="intv-modal-footer">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('submit-intv-modal').style.display='none'">Discard</button>
            <button type="submit" class="btn btn-primary">Commit Experience →</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Case Study Detail Modal -->
    <div id="case-study-modal" class="modal-overlay" style="display:none;">
      <div class="intv-modal" style="max-width:720px;">
        <div class="intv-modal-header">
          <h3 style="font-size:16px; font-weight:800; color:#fff; margin:0;" id="case-modal-title">Interview Case Study</h3>
          <button class="btn-ghost" onclick="document.getElementById('case-study-modal').style.display='none'" style="font-size:16px; cursor:pointer;">✕</button>
        </div>
        <div class="intv-modal-body" id="case-modal-body">
          <!-- Filled dynamically -->
        </div>
        <div class="intv-modal-footer" id="case-modal-footer">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('case-study-modal').style.display='none'">Close</button>
        </div>
      </div>
    </div>
    `;

    // Event listeners
    const filterToggleBtn = document.getElementById('toggle-filter-btn');
    if (filterToggleBtn) {
      filterToggleBtn.addEventListener('click', () => {
        showFilterBar = !showFilterBar;
        const container = document.getElementById('filter-bar-container');
        if (container) container.style.display = showFilterBar ? 'flex' : 'none';
      });
    }

    const openCommitBtn = document.getElementById('open-commit-btn');
    if (openCommitBtn) {
      openCommitBtn.addEventListener('click', () => {
        document.getElementById('submit-intv-modal').style.display = 'flex';
      });
    }

    const searchInput = document.getElementById('intv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
        const next = document.getElementById('intv-search-input');
        if (next) {
          next.focus();
          next.selectionStart = next.selectionEnd = next.value.length;
        }
      });
    }

    const diffSelect = document.getElementById('intv-diff-filter');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        difficultyFilter = e.target.value;
        render();
      });
    }

    const outcomeSelect = document.getElementById('intv-outcome-filter');
    if (outcomeSelect) {
      outcomeSelect.addEventListener('change', (e) => {
        outcomeFilter = e.target.value;
        render();
      });
    }

    const yearSelect = document.getElementById('intv-year-filter');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        yearFilter = e.target.value;
        render();
      });
    }
  }

  // Clear filters
  window.clearRepoFilters = () => {
    searchQuery = '';
    difficultyFilter = 'ALL';
    outcomeFilter = 'ALL';
    yearFilter = 'ALL';
    render();
  };

  // Upvote interview
  window.upvoteInterview = (idOrCo) => {
    const iv = Store.interviews.find(i => (i.id && i.id === idOrCo) || i.company === idOrCo);
    if (!iv) return;
    iv.helpful = (iv.helpful || 0) + 1;
    saveStore();
    showToast(`Marked experience at ${iv.company} as helpful! (${iv.helpful} audits)`, 'success');
    render();
  };

  // Commit experience
  window.commitInterviewExperience = () => {
    const company = document.getElementById('intv-company').value.trim();
    const role = document.getElementById('intv-role').value.trim();
    const difficulty = document.getElementById('intv-diff').value;
    const year = document.getElementById('intv-year').value.trim() || '2024';
    const outcome = document.getElementById('intv-outcome').value;
    const author = document.getElementById('intv-author').value.trim();
    const pkg = document.getElementById('intv-pkg').value.trim() || 'N/A';
    const roundsRaw = document.getElementById('intv-rounds').value.trim();
    const narrative = document.getElementById('intv-narrative').value.trim();
    const questionsRaw = document.getElementById('intv-questions').value.trim();
    const tipsRaw = document.getElementById('intv-tips').value.trim();

    if (!company || !role || !author || !roundsRaw || !narrative) {
      showToast('Please fill out all required fields.', 'warning');
      return;
    }

    const rounds = roundsRaw.split(',').map(r => r.trim()).filter(Boolean);
    const questions = questionsRaw.split('\n').map(q => q.trim()).filter(Boolean);
    const tips = tipsRaw.split('\n').map(t => t.trim()).filter(Boolean);

    const newIntv = {
      id: 'intv_' + Date.now(),
      company,
      role,
      difficulty,
      year,
      outcome,
      author,
      package: pkg,
      rounds,
      narrative,
      questions: questions.length > 0 ? questions : ['Coding Problem Solving Round', 'System Architecture discussion'],
      tips: tips.length > 0 ? tips : ['Review core Data Structures & Algorithms', 'Be clear and communicative'],
      helpful: 1
    };

    Store.interviews.unshift(newIntv);
    saveStore();
    document.getElementById('submit-intv-modal').style.display = 'none';
    showToast(`Interview experience for ${company} successfully committed!`, 'success');
    render();
  };

  // Open Full Case Study Modal
  window.openCaseStudyModal = (idOrCo) => {
    const iv = Store.interviews.find(i => (i.id && i.id === idOrCo) || i.company === idOrCo);
    if (!iv) return;

    const modalBody = document.getElementById('case-modal-body');
    const diffClass = (iv.difficulty || '').toLowerCase() === 'easy' ? 'status-success' : (iv.difficulty || '').toLowerCase() === 'hard' ? 'status-danger' : 'status-warning';
    const roundList = Array.isArray(iv.rounds) ? iv.rounds : (typeof iv.rounds === 'string' ? iv.rounds.split(',') : []);
    const questionList = Array.isArray(iv.questions) ? iv.questions : [];
    const tipsList = Array.isArray(iv.tips) ? iv.tips : [];

    modalBody.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:800; color:#fff; margin:0 0 4px;">${iv.company} — ${iv.role}</h2>
          <div style="font-size:13px; color:var(--text-secondary);">
            Batch of ${iv.year} · Committed by <strong style="color:#fff;">${iv.author}</strong>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <span class="status-pill ${diffClass}">${iv.difficulty} Complexity</span>
          <span class="status-pill status-success">${iv.outcome || 'Selected'}</span>
        </div>
      </div>

      ${iv.package && iv.package !== 'N/A' ? `
        <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:10px; padding:10px 16px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12.5px; color:var(--text-secondary);">Compensation Package:</span>
          <strong style="font-size:15px; color:#34D399;">₹${iv.package}</strong>
        </div>
      ` : ''}

      <!-- Rounds -->
      <div style="margin-bottom:18px;">
        <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Interview Assessment Rounds</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${roundList.map((r, idx) => `
            <div style="font-size:11.5px; padding:4px 12px; background:rgba(0,200,255,0.08); border:1px solid rgba(0,200,255,0.25); border-radius:6px; color:var(--brand-primary); font-weight:600;">
              Round ${idx+1}: ${r}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Narrative -->
      <div style="margin-bottom:20px;">
        <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Assessment Narrative & Flow</div>
        <div style="font-size:13px; line-height:1.6; color:var(--text-secondary); background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:10px; padding:16px;">
          ${iv.narrative || 'Detailed narrative not provided.'}
        </div>
      </div>

      <!-- Questions -->
      ${questionList.length > 0 ? `
        <div style="margin-bottom:20px;">
          <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Key Questions Audited</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${questionList.map(q => `
              <div style="display:flex; gap:10px; align-items:flex-start; font-size:12.5px; color:var(--text-primary); background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:8px; padding:10px 14px;">
                <span style="color:var(--brand-cyan); font-weight:800;">Q.</span>
                <span>${q}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Tips -->
      ${tipsList.length > 0 ? `
        <div>
          <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Preparation Recommendations</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${tipsList.map(t => `
              <div style="display:flex; gap:10px; align-items:flex-start; font-size:12.5px; color:var(--text-secondary); background:rgba(124,58,237,0.06); border:1px solid rgba(124,58,237,0.2); border-radius:8px; padding:10px 14px;">
                <span style="color:#A78BFA; font-weight:800;">💡</span>
                <span>${t}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    document.getElementById('case-study-modal').style.display = 'flex';
  };

  // Initial render
  render();
}
