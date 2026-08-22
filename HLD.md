# Placenix — High-Level Design (HLD)
**AI-Powered Employability & Campus Recruitment Operating System**

---

## 1. Document Control & Executive Summary

### 1.1 Document Metadata
| Parameter | Details |
| :--- | :--- |
| **Document Title** | High-Level Design (HLD) Specification |
| **System Name** | Placenix (Campus Recruitment OS) |
| **Version** | 3.0.0 (Enterprise Production Architecture) |
| **Status** | Approved & Implemented |
| **Classification** | Proprietary / Technical Architecture Documentation |
| **Target Audience** | Enterprise Architects, Lead Engineers, Product Directors, Institutional CTOs |

### 1.2 Executive Summary
**Placenix** is a multi-tenant, role-governed Campus Recruitment and Employability Intelligence Operating System designed to digitize, automate, and optimize university placement operations. The platform bridges the gap between students, training & placement officers (TPOs), departmental coordinators, faculty advisors, and enterprise recruiters. 

Placenix features a **Zero-Build, Highly Resilient Client-Side Architecture** paired with a micro-proxy gateway and a Supabase BaaS (Backend-as-a-Service) persistence tier. Key capabilities include:
- **Autonomous AI Virtual Interview Simulation** powered by Google Gemini AI with client-side proctoring (TensorFlow.js BlazeFace & COCO-SSD).
- **Multi-Track ATS Resume Intelligence** and role-fit diagnostic scoring.
- **5-Pillar Employability Telemetry** generating real-time radar readiness metrics.
- **Dynamic Multi-Round Recruitment Kanban Pipelines** with real-time candidate progression.
- **Automated Multi-Venue Interview Slot Allocation** and real-time attendance verification.
- **7-Tier Whitelist-Enforced Role-Based Access Control (RBAC)** across multi-college hierarchies.

---

## 2. Strategic Vision & Architecture Goals

```mermaid
mindmap
  root((Placenix Platform))
    Enterprise Recruiter Experience
      Automated Candidate Slicing
      Multi-Round Pipeline Tracking
      Instant Attendance Telemetry
    Student Employability
      AI Mock Interviews & Dojo Belts
      ATS Resume Diagnostic
      Predictive Readiness Scoring
    Institutional Governance
      Departmental Coordination
      Faculty Advisor Mentorship
      SaaS Multi-Tenant Overseer
    Zero-Friction Technology
      Zero Build-Step Vanilla JS SPA
      Dual-Layer Storage & Self-Healing
      Edge-Proxied AI Neural Models
```

### 2.1 Key Design Principles
1. **Zero-Build Micro-Modular Architecture**: The client operates natively on ES Modules (`import`/`export`) without Webpack, Vite, or Babel build steps. This guarantees instant deployment, lightning boot speeds, and zero runtime bundler friction.
2. **Dual-Layer Resilient Persistence**: Placenix implements a hybrid storage architecture:
   - **Primary Remote Tier**: Supabase PostgreSQL with Row Level Security (RLS) and real-time subscriptions.
   - **Local Sandbox Tier**: Client-side reactive memory synchronized with `localStorage` and automated self-healing algorithms (`healData()`) that guarantee zero data loss during network degradation.
3. **Defense-in-Depth Whitelist RBAC**: Strict route and view gating ensures users cannot view or manipulate state outside their authorized institutional scope.
4. **Edge AI Compute & Privacy-First Proctoring**: Heavy computer vision tasks (facial orientation, multi-person detection, mobile phone detection) run purely on-device via TensorFlow.js WebGL backends, sending zero video streams over the network.

---

## 3. High-Level Architecture & Topology

### 3.1 C4 Context Diagram (Level 1)
The following diagram illustrates how various institutional actors interact with the Placenix platform and its external systems:

```mermaid
C4Context
  title System Context Diagram for Placenix

  Person(student, "Student", "Undergraduate / Graduate candidate applying for jobs, running mock interviews, scanning resumes.")
  Person(tpo, "TPO / Placement Director", "Oversees campus drives, sets cutoff criteria, allocates interview slots, tracks hiring KPIs.")
  Person(dept, "Department Coordinator", "Monitors departmental students, reviews resumes, tracks attendance and batch statistics.")
  Person(faculty, "Faculty Advisor", "Mentors mapped student cohorts, conducts academic validations, tracks low-probability students.")
  Person(admin, "Institutional Admin", "Manages departments, sections, staff authorizations, and role assignments.")
  Person(saasAdmin, "SaaS Super Admin", "Oversees multi-university tenants, tracks MRR, provisions institutional licenses.")

  System(placenix, "Placenix Platform", "Zero-build SPA running reactive state, AI proctoring, pipeline management, and telemetry.")

  System_Ext(gemini, "Google Gemini AI API", "Powers conversational AI interviews, coding challenges, aptitude generation, and resume diagnostics.")
  System_Ext(supabase, "Supabase Cloud BaaS", "PostgreSQL database, Auth services, RLS policies, and Realtime websocket listeners.")
  System_Ext(tfjs, "TensorFlow.js CDN", "Edge neural network models for BlazeFace facial landmarking and COCO-SSD object detection.")

  Rel(student, placenix, "Applies to drives, takes AI interviews, tests resume", "HTTPS / WSS")
  Rel(tpo, placenix, "Manages drives, runs Kanban, schedules slots", "HTTPS / WSS")
  Rel(dept, placenix, "Tracks batch progress, validates profiles", "HTTPS / WSS")
  Rel(faculty, placenix, "Mentors student cohorts, approves verifications", "HTTPS / WSS")
  Rel(admin, placenix, "Manages institutional topology & staff mapping", "HTTPS / WSS")
  Rel(saasAdmin, placenix, "Manages institutions & platform health", "HTTPS / WSS")

  Rel(placenix, supabase, "Persists profiles, drives, staff, interviews", "REST / Websockets")
  Rel(placenix, gemini, "Proxies AI prompt evaluation via Node gateway", "HTTPS / JSON")
  Rel(placenix, tfjs, "Loads client-side CV proctoring models", "HTTPS / CDN")
```

---

### 3.2 C4 Container Diagram (Level 2)
The internal containerized architecture of the Placenix runtime environment:

```mermaid
flowchart TB
    subgraph ClientBrowser["Client Web Browser (Desktop / Mobile)"]
        subgraph UIShell["Presentation & UI Shell Layer"]
            HTML["index.html (SPA Shell & Boot Screen)"]
            CSS["CSS Design System (tokens.css, layout.css, components.css, animations.css)"]
            Theme["theme.js (Dark / Light Theme Engine)"]
            Toast["components/toast.js & skeleton.js"]
            Nav["components/sidebar.js (Dynamic Role Menu & ⌘K Search)"]
            Notif["components/notifications.js (Realtime Notification Service)"]
        end

        subgraph CoreEngine["Core Client Runtime"]
            Main["main.js (Resilient Bootloader & Session Resolver)"]
            Router["router.js (Hash-based SPA Router & Whitelist RBAC)"]
            Store["store.js (Centralized Reactive State & healData Engine)"]
            SupaClient["supabase.js (Supabase Client Wrapper)"]
        end

        subgraph PageModules["Modular Feature Modules (pages/*.js)"]
            P_Student["dashboard-student.js & profile.js"]
            P_TPO["dashboard-tpo.js & analytics.js"]
            P_Dept["dashboard-dept.js & attendance-tracker.js"]
            P_Faculty["faculty-advisor.js"]
            P_Admin["dashboard-admin.js & admin-control.js"]
            P_SaaS["saas-admin.js"]
            P_Drives["drives.js & kanban.js"]
            P_Slots["slot-allocation.js & my-slots.js"]
            P_Resume["resume-intelligence.js & employability.js"]
            P_Interview["virtual-interview.js & sub-modules"]
            P_Repo["interview-repo.js & communication.js & alumni.js"]
        end

        subgraph ClientAI["Client Edge AI & Computer Vision"]
            TFJS["TensorFlow.js Engine"]
            BlazeFace["BlazeFace Model (Facial Tracking & Gaze)"]
            COCOSSD["COCO-SSD Model (Mobile Phone & Object Detection)"]
            SpeechEngine["Web Speech API (SpeechRecognition & SpeechSynthesis)"]
        end
    end

    subgraph ServerRuntime["Node.js Routing Proxy Server (server.js)"]
        StaticServer["HTTP Static File Server (Zero-Build Delivery)"]
        EnvInjector["Dynamic Env Injection (__ENV_PLACEHOLDER__)"]
        AIGateway["Gemini AI Proxy Endpoint (/api/ai)"]
    end

    subgraph CloudServices["External Cloud Platforms"]
        SupabaseCloud[("Supabase PostgreSQL Database & Auth")]
        GeminiCloud["Google Gemini Generative AI (gemini-1.5-flash)"]
    end

    HTML --> Main
    Main --> Router
    Router --> PageModules
    PageModules --> Store
    Store --> SupaClient
    SupaClient --> SupabaseCloud
    
    P_Interview --> ClientAI
    P_Interview --> AIGateway
    P_Resume --> AIGateway
    
    StaticServer --> HTML
    AIGateway --> GeminiCloud
```

---

## 4. Core Subsystems & Service Modules

### 4.1 Role-Based Access Control (RBAC) & Security Gateway
Placenix enforces a **strict whitelist security model**. Rather than checking blacklist permissions, the router cross-checks every target route against the authenticated user's explicit role matrix:

```mermaid
stateDiagram-v2
    [*] --> HashChange: User Navigates to #route
    HashChange --> CheckAuth: Extract Target Route
    
    state CheckAuth {
        [*] --> IsPublicRoute
        IsPublicRoute --> AllowPublic: Route is 'login', 'signup', 'onboarding'
        IsPublicRoute --> VerifySession: Route is in DASHBOARD_PAGES
        VerifySession --> RedirectLogin: Store.session.user == null
        VerifySession --> ValidateRole: Store.session.user != null
    }

    state ValidateRole {
        [*] --> QueryWhitelist: Check allowedRoutes[role]
        QueryWhitelist --> MountPage: Target in allowedRoutes[role]
        QueryWhitelist --> RedirectHome: Target NOT in allowedRoutes[role]
    }

    AllowPublic --> RenderView
    MountPage --> RenderView
    RedirectLogin --> RouteLogin: Set hash = '#login'
    RedirectHome --> RouteHome: Set hash = roleHomeRoute
```

#### Supported User Roles & Default Landings
| User Role | Home Route | Domain Scope & Accessible Views |
| :--- | :--- | :--- |
| `student` | `#student-dashboard` | Opportunities, AI Mock Interviews, ATS Resume Scanner, Employability Radar, My Slots, Alumni Network, Queries |
| `tpo` | `#tpo-dashboard` | Drive Master Registry, Multi-Round Kanban Pipeline, Slot Allocator, Round-Wise Attendance, Institutional Analytics |
| `coordinator` | `#coordinator-dashboard` | Departmental Student Grid, Resume Validation, Job Feeds, Slot Monitor, Attendance, Announcements, Queries |
| `department` | `#coordinator-dashboard` | Same as coordinator (Departmental Governance & Tracking) |
| `faculty` | `#faculty-dashboard` | Mentoring Cohort, At-Risk Student Filtering, Skill Gap Telemetry, Academic Validations, Attendance Tracking |
| `admin` | `#admin-dashboard` | Departments & Sections Hierarchy, Staff Authorization, Role Permissions, Operational Work Mapping |
| `saas-admin` | `#saas-admin` | Multi-Tenant University Registry, MRR & Subscription Tier Monitoring, Tenant Provisioning |

---

### 4.2 Reactive Central Store & Self-Healing Telemetry Engine
The `store.js` module acts as the single source of truth for the client. It provides:
1. **Computed Telemetry Engine (`Store.analytics`)**: Calculates aggregate hiring percentages, CTC package distributions (LPA buckets), department-wise averages, and cumulative monthly hiring trajectories dynamically from raw student and drive arrays.
2. **Self-Healing Data Reconciler (`healData()`)**:
   - De-duplicates student records by ID and normalized full name.
   - Cleans orphan applications referencing deleted recruitment drives.
   - Normalizes Kanban cards ensuring a student is pinned only to their latest active stage per drive.
   - Reconciles allocated slots and prunes deleted drive associations.
3. **Two-Way Synchronization Pipeline**: Automatically writes changes to `localStorage` and triggers cross-tab synchronization via `CustomEvent('store-updated')` and `Event('storage')`.

```mermaid
flowchart LR
    subgraph StoreNode["Store.js Reactive Core"]
        RawData["Raw Collections\n(students, drives, kanban, slots)"]
        HealEngine["healData()\n(Deduplication, Orphan Pruning)"]
        AnalyticsEngine["get analytics()\n(CTC Buckets, Placed %, Dept Averages)"]
    end

    subgraph StorageLayer["Persistence Interfaces"]
        LS["localStorage (Offline Resilience)"]
        Supa["Supabase DB (PostgreSQL Cloud)"]
        DOM["CustomEvent ('store-updated') -> Dynamic UI Re-render"]
    end

    RawData --> HealEngine
    HealEngine --> AnalyticsEngine
    HealEngine --> LS
    HealEngine --> Supa
    AnalyticsEngine --> DOM
```

---

### 4.3 Virtual Interview Simulation & Edge AI Proctoring Grid
The Virtual Interview engine (`pages/virtual-interview.js`) is an end-to-end multi-round AI evaluation suite supporting:

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Student Candidate
    participant UI as Virtual Interview UI
    participant CV as TensorFlow.js (BlazeFace / COCO-SSD)
    participant Audio as Web Speech API (STT / TTS)
    participant Proxy as Node /api/ai Proxy
    participant Gemini as Google Gemini 1.5 Flash
    participant PDF as PDF Generator (jspdf)

    Candidate->>UI: Selects Company (e.g. Google, Amazon, TCS) & Role
    UI->>UI: Mounts Setup & Requests Camera/Microphone Permissions
    UI->>CV: Initializes BlazeFace & COCO-SSD Models on Canvas
    
    rect rgb(20, 30, 45)
        note over UI,Gemini: Round 1 — Adaptive Aptitude Test (30 Questions)
        UI->>Proxy: generateAptitudeQuestions(company, role)
        Proxy->>Gemini: Request customized Quants, Logical, Verbal, Tech MCQs
        Gemini-->>UI: Returns 30 structured MCQs
        Candidate->>UI: Answers MCQs under Timer & CV Proctoring
        UI->>UI: Calculates Aptitude Score vs Company Cutoff Threshold
    end

    rect rgb(25, 25, 40)
        note over UI,Gemini: Round 2 — Live Coding & Technical Challenge
        UI->>Proxy: generateTechnicalChallenge(company, role, facedList)
        Proxy->>Gemini: Requests role-specific DSA / SQL challenge & test cases
        Gemini-->>UI: Returns Problem, Starter Code (JS/Python/SQL), and Test Cases
        Candidate->>UI: Writes code in in-browser IDE
        UI->>Proxy: runCodeAI(code, language, testCases)
        Proxy->>Gemini: Evaluates syntax, execution correctness, time complexity
        Gemini-->>UI: Test cases pass/fail telemetry + score
    end

    rect rgb(20, 35, 30)
        note over UI,Gemini: Round 3 & 4 — Conversational AI & Behavioral HR Fit
        UI->>Audio: AI speaks prompt question using SpeechSynthesis
        Candidate->>Audio: Candidate speaks answer via SpeechRecognition (STT)
        Audio-->>UI: Transcribes audio stream to text in real-time
        UI->>Proxy: evaluateHRFit(transcript, history, companyValues)
        Proxy->>Gemini: Evaluates STAR framework, confidence, leadership
        Gemini-->>UI: Returns HR evaluation, grading score, and feedback
    end

    UI->>PDF: downloadReportPDF(candidateReportData)
    PDF-->>Candidate: Downloads Detailed AI Diagnostic & Dojo Belt Certificate
```

#### Proctoring Violation Detection Engine
- **Multiple Face Detection**: Triggers warning if $> 1$ face is identified in the webcam frame.
- **Out of Frame / Gaze Deviation**: Triggers warning if 0 faces are detected for $> 5$ seconds.
- **Prohibited Device Detection**: COCO-SSD continuously identifies `cell phone`, `book`, or `laptop` classes.
- **Tab Switching Guard**: Tracks `visibilitychange` events; $> 3$ tab switches terminates the interview session.

---

### 4.4 Multi-Round Recruitment Kanban Pipeline
The Kanban system (`pages/kanban.js`) transforms static recruitment listings into an interactive drag-and-drop talent pipeline:

```mermaid
flowchart LR
    subgraph PipelineStages["Dynamic Recruitment Stages"]
        S1["Applied (Initial Intake)"]
        S2["Shortlisted (Criteria Filter)"]
        S3["Aptitude Round (Assessment)"]
        S4["Technical Round (Coding / Design)"]
        S5["HR Round (Culture & Offer)"]
        S6["Selected ✓ (Hired)"]
    end

    S1 -->|Drag / Advance| S2
    S2 -->|Drag / Advance| S3
    S3 -->|Pass Cutoff| S4
    S4 -->|Pass Tech| S5
    S5 -->|Offer Issued| S6
```

- **Dynamic Round Injection**: Columns automatically adapt to the specific rounds defined in the active recruitment drive (e.g., *Online Assessment* $\rightarrow$ *System Design* $\rightarrow$ *Bar Raiser* for Amazon vs *Aptitude* $\rightarrow$ *C Coding* $\rightarrow$ *HR* for Zoho).
- **Two-Way Synchronization**: Moving a candidate to `Selected ✓` automatically marks the student as `Placed` in `Store.students`, records their company CTC, updates the college placement percentage, and synchronizes the TPO dashboard.

---

### 4.5 Automated Multi-Venue Slot Allocation & Attendance Matrix
The Slot Allocation engine (`pages/slot-allocation.js` & `pages/attendance-tracker.js`) eliminates campus interview scheduling congestion:

```mermaid
flowchart TD
    DriveSelect["1. Select Recruitment Drive & Interview Round"] --> VenueConfig["2. Configure Venues & Capacity (e.g. Lab A: 30, Lab B: 25)"]
    VenueConfig --> TimeConfig["3. Set Date, Start Time & Duration (e.g. 09:00 AM, 45 mins/slot)"]
    TimeConfig --> ComputeEngine["4. Allocation Algorithm: Slices Candidates into Venue-Time Matrix"]
    ComputeEngine --> PreviewGrid["5. Visual Preview Grid & Conflict Detector"]
    PreviewGrid --> BroadcastNotif["6. Publish Allocation -> Dispatches Realtime Alerts to Students"]
    BroadcastNotif --> AttendanceTracker["7. Attendance Tracker: Live QR/Toggle Check-In per Slot"]
```

---

### 4.6 Resume Intelligence & Employability Telemetry

```mermaid
flowchart LR
    subgraph ResumeEngine["Resume Intelligence Engine (resume-intelligence.js)"]
        Upload["Resume PDF / Text Input"] --> Extractor["Keyword & Section Extractor"]
        Extractor --> RoleSelector["Target Role Keyword Dictionary (18 Tech Roles)"]
        RoleSelector --> ATSScore["ATS Score (0-100) + Missing Keyword Generator"]
    end

    subgraph EmployabilityEngine["Employability Radar Engine (employability.js)"]
        ATSScore --> PillarMath["5-Pillar Score Computation"]
        PillarMath --> Radar["Radar Chart Visualization"]
        PillarMath --> CareerFit["Role Fit Probability Matrix"]
    end

    subgraph Pillars["5 Core Pillars"]
        P1["Technical Execution (30%)"]
        P2["Problem Solving & DSA (25%)"]
        P3["Domain Knowledge (15%)"]
        P4["Professional Communication (15%)"]
        P5["Practical Execution / Projects (15%)"]
    end

    PillarMath --- Pillars
```

---

## 5. Data Flow Architecture & Database Schema

### 5.1 Relational Data Model (Supabase PostgreSQL)

```mermaid
erDiagram
    INSTITUTIONS ||--o{ DEPARTMENTS : contains
    DEPARTMENTS ||--o{ SECTIONS : divides
    DEPARTMENTS ||--o{ PROFILES : enrolls
    PROFILES ||--o{ APPLICATIONS : submits
    DRIVES ||--o{ APPLICATIONS : receives
    DRIVES ||--o{ SLOT_ALLOCATIONS : schedules
    PROFILES ||--o{ INTERVIEW_EXPERIENCES : shares
    PROFILES ||--o{ MENTORSHIP_SESSIONS : attends

    PROFILES {
        uuid id PK
        string email
        string full_name
        string role "student | tpo | coordinator | faculty | admin | saas-admin"
        string department
        string section
        float cgpa
        jsonb resume_analysis
        jsonb employability_data
        string status "Applied | Shortlisted | Placed"
        float package_lpa
        timestamp created_at
    }

    DRIVES {
        uuid id PK
        string company
        string role
        string package_lpa
        float min_cgpa
        string deadline
        string[] eligible_depts
        string[] required_skills
        string status "Open | In-Progress | Closed"
        int applicants
    }

    SLOT_ALLOCATIONS {
        uuid id PK
        uuid drive_id FK
        string company
        string round_name
        date allocation_date
        jsonb venues
        jsonb slots
        jsonb allocations
        boolean notified
    }

    INTERVIEW_EXPERIENCES {
        uuid id PK
        string company
        string role
        string difficulty "Easy | Medium | Hard"
        string outcome "Selected | Rejected"
        string package
        string[] rounds
        text narrative
        string[] questions
        string[] tips
        int helpful_count
    }
```

---

## 6. Security, Privacy & Non-Functional Architecture

```mermaid
flowchart TD
    subgraph SecurityTiers["Placenix Security Boundaries"]
        ClientGateway["Client Security: Whitelist Route Interceptor & Sanitizer"]
        ProxyGateway["Node Gateway: Strips Client Headers, Securely Injects GEMINI_API_KEY"]
        BaaSGateway["Supabase Cloud: JWT Auth Verification & Row Level Security (RLS)"]
        CVBoundary["Proctoring Privacy: Zero Video Stream Transmission (Local Canvas Processing)"]
    end

    ClientGateway --> ProxyGateway
    ClientGateway --> BaaSGateway
```

### 6.1 Non-Functional Requirements (NFR) Performance Metrics
| Dimension | Target Metric | Architectural Mechanism |
| :--- | :--- | :--- |
| **Initial Page Load** | $< 800\text{ ms}$ | Zero-build Vanilla JS; static HTTP delivery; preloaded CSS tokens. |
| **Route Transition** | $< 50\text{ ms}$ | Hash-based client-side routing; skeleton placeholder transitions. |
| **AI Prompt Roundtrip** | $< 2.5\text{ s}$ | Lightweight Node proxy passing raw stream directly to `gemini-1.5-flash`. |
| **Data Integrity** | $100\%$ Zero Data Loss | Dual persistence layer + `healData()` auto-deduplication on startup. |
| **Browser Compatibility** | Chrome, Edge, Safari, Firefox | Standard ECMAScript 2022, WebRTC, HTML5 Canvas, Web Speech API. |
| **Mobile Responsiveness** | $320\text{px}$ to $4\text{K}$ screens | Fluid CSS Grid, glassmorphism flex containers, mobile drawer sidebar. |

---

## 7. Deployment & Infrastructure Architecture

```mermaid
flowchart LR
    subgraph EdgeTier["Edge CDN & Proxy Tier"]
        Netlify_Vercel["Edge CDN (Netlify / Vercel / Cloudflare)"]
        NodeServer["Node.js Server (server.js) on Port 3000"]
    end

    subgraph CloudAPIs["External Managed Cloud Tier"]
        GoogleAI["Google Generative AI Platform (Gemini 1.5)"]
        SupabaseBackend["Supabase Managed PostgreSQL & Realtime"]
        JSDelivr["jsDelivr CDN (TensorFlow.js, Chart.js, BlazeFace)"]
    end

    Client["End-User Browser"] --> Netlify_Vercel
    Netlify_Vercel --> NodeServer
    NodeServer --> GoogleAI
    NodeServer --> SupabaseBackend
    Client --> JSDelivr
```

### 7.1 Environment Configuration Matrix
| Variable Name | Scope | Description |
| :--- | :--- | :--- |
| `PORT` | Server-side | HTTP listen port for static server and API proxy (Default: `3000`). |
| `GEMINI_API_KEY` | Server-side (Secret) | Google Cloud Gemini API key for proxying `/api/ai`. |
| `SUPABASE_URL` | Client-injected | Project URL for Supabase BaaS connection. |
| `SUPABASE_ANON_KEY` | Client-injected | Public anon key for client-side JWT token creation and queries. |
