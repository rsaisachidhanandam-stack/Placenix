-- ============================================================
-- PLACENIX — RELATIONAL POSTGRESQL SCHEMA DESIGN & SQL SUITE
-- Demonstrates:
-- 1. Normalization Basics (1NF, 2NF, 3NF, BCNF) & Anomaly Elimination
-- 2. Multi-Table Relational Schema with PK, FK, Constraints & Indexes
-- 3. Multi-Table SQL JOINs (INNER JOIN, LEFT JOIN, GROUP BY, CTEs)
-- 4. ACID SQL Transactions (BEGIN, SAVEPOINT, COMMIT, ROLLBACK)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. DATABASE NORMALIZATION ARCHITECTURE (1NF, 2NF, 3NF)
-- ─────────────────────────────────────────────────────────────
--
-- ✦ First Normal Form (1NF):
--   - Each column contains atomic (indivisible) values.
--   - Every table has a designated primary key ensuring record uniqueness.
--   - No repeating groups or comma-separated lists stored in columns (e.g. skills/sections are normalized).
--
-- ✦ Second Normal Form (2NF):
--   - Satisfies 1NF.
--   - Eliminates Partial Dependencies: All non-key attributes are fully functionally dependent
--     on the entire primary key (especially critical in composite-key junction tables like drive_applications).
--
-- ✦ Third Normal Form (3NF):
--   - Satisfies 2NF.
--   - Eliminates Transitive Dependencies: Non-key attributes depend ONLY on the primary key,
--     not on another non-key attribute (e.g., department name is stored in 'departments',
--     and 'profiles' only references 'department_id', preventing update/deletion anomalies).
-- ─────────────────────────────────────────────────────────────

-- ── Parent Table 1: Departments (Normalized 3NF) ─────────────
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(10) PRIMARY KEY, -- e.g. 'CSE', 'IT', 'ECE', 'AI&DS' (Atomic PK)
    name VARCHAR(255) NOT NULL,
    faculty_head VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── Parent Table 2: Sections (Child of Departments: 1-to-Many FK) ─
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id VARCHAR(10) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    section_name VARCHAR(10) NOT NULL, -- e.g. 'A', 'B', 'C'
    room_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_section UNIQUE(department_id, section_name)
);

-- ── Entity Table 3: User & Student Profiles (3NF Normalized) ──
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'tpo', 'coordinator', 'department', 'faculty', 'admin', 'saas-admin', 'system')),
    department_id VARCHAR(10) REFERENCES departments(id) ON DELETE SET NULL,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    register_number VARCHAR(50) UNIQUE,
    cgpa NUMERIC(4, 2) DEFAULT 0.00 CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    batch_year VARCHAR(20),
    current_semester INT CHECK (current_semester BETWEEN 1 AND 8),
    status VARCHAR(50) DEFAULT 'Applied' CHECK (status IN ('Applied', 'Shortlisted', 'Placed', 'Rejected')),
    package_lpa NUMERIC(5, 2) DEFAULT 0.00,
    company VARCHAR(255),
    password_hash VARCHAR(255), -- Securely salted PBKDF2/bcrypt hash
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── Entity Table 4: Recruitment Drives ────────────────────────
CREATE TABLE IF NOT EXISTS drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    package_lpa NUMERIC(5, 2) NOT NULL CHECK (package_lpa > 0),
    min_cgpa NUMERIC(4, 2) DEFAULT 0.00,
    total_slots_capacity INT DEFAULT 50 CHECK (total_slots_capacity >= 0),
    remaining_slots INT DEFAULT 50 CHECK (remaining_slots >= 0),
    deadline DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'In-Progress', 'Closed')),
    applicants INT DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── Junction Table 5: Drive Applications (2NF/3NF Many-to-Many) ─
-- Composite Key (drive_id, student_id) ensures 0 duplicate applications
CREATE TABLE IF NOT EXISTS drive_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'Applied' CHECK (current_stage IN ('Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Selected', 'Rejected')),
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_drive UNIQUE(drive_id, student_id)
);

-- ── Table 6: Slot Allocations (1-to-Many from Drives) ──────────
CREATE TABLE IF NOT EXISTS slot_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    round_name VARCHAR(100) NOT NULL,
    allocation_date DATE NOT NULL,
    total_candidates INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── Table 7: Slot Candidate Bookings (Child of Slot Allocations & Profiles) ─
CREATE TABLE IF NOT EXISTS slot_candidate_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_allocation_id UUID NOT NULL REFERENCES slot_allocations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    venue_name VARCHAR(100) NOT NULL,
    slot_time VARCHAR(50) NOT NULL,
    attendance_status VARCHAR(20) DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'present', 'absent')),
    verified_at TIMESTAMPTZ
);

-- Performance Indexes on Foreign Keys & High-Frequency Filters
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_applications_drive ON drive_applications(drive_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON drive_applications(current_stage);


-- ─────────────────────────────────────────────────────────────
-- 2. SQL JOINS DEMONSTRATION & ADVANCED QUERY SUITE
-- ─────────────────────────────────────────────────────────────

-- QUERY 1: Multi-Table INNER JOIN — Student Academic & Department Hierarchy Report
SELECT 
    p.id AS student_id,
    p.full_name AS student_name,
    p.register_number,
    p.cgpa,
    p.status AS placement_status,
    p.company,
    p.package_lpa,
    d.id AS dept_code,
    d.name AS department_name,
    s.section_name,
    s.room_number
FROM profiles p
INNER JOIN departments d ON p.department_id = d.id
INNER JOIN sections s ON p.section_id = s.id
WHERE p.role = 'student'
ORDER BY d.id ASC, s.section_name ASC, p.cgpa DESC;


-- QUERY 2: Multi-Table LEFT JOIN with Aggregations — Department Placement Performance Matrix
SELECT 
    d.id AS dept_code,
    d.name AS department_name,
    COUNT(p.id) AS total_students,
    COUNT(CASE WHEN p.status = 'Placed' THEN 1 END) AS placed_students,
    ROUND((COUNT(CASE WHEN p.status = 'Placed' THEN 1 END)::NUMERIC / NULLIF(COUNT(p.id), 0)) * 100, 1) AS placement_percentage,
    ROUND(AVG(CASE WHEN p.status = 'Placed' AND p.package_lpa > 0 THEN p.package_lpa END), 2) AS avg_package_lpa,
    MAX(p.package_lpa) AS highest_package_lpa
FROM departments d
LEFT JOIN profiles p ON d.id = p.department_id AND p.role = 'student'
GROUP BY d.id, d.name
ORDER BY placement_percentage DESC;


-- QUERY 3: Complex Multi-Table JOIN with CTE — Recruitment Pipeline & Slot Attendance Telemetry
WITH DriveMetrics AS (
    SELECT 
        dr.id AS drive_id,
        dr.company,
        dr.role AS job_role,
        dr.package_lpa,
        COUNT(DISTINCT da.student_id) AS total_applicants,
        COUNT(DISTINCT CASE WHEN da.current_stage = 'Selected' THEN da.student_id END) AS total_selected
    FROM drives dr
    LEFT JOIN drive_applications da ON dr.id = da.drive_id
    GROUP BY dr.id, dr.company, dr.role, dr.package_lpa
)
SELECT 
    dm.company,
    dm.job_role,
    dm.package_lpa,
    dm.total_applicants,
    dm.total_selected,
    sa.round_name AS active_round,
    sa.allocation_date,
    scb.venue_name,
    scb.slot_time,
    p.full_name AS candidate_name,
    p.register_number,
    scb.attendance_status
FROM DriveMetrics dm
LEFT JOIN slot_allocations sa ON dm.drive_id = sa.drive_id
LEFT JOIN slot_candidate_bookings scb ON sa.id = scb.slot_allocation_id
LEFT JOIN profiles p ON scb.student_id = p.id
ORDER BY dm.company ASC, sa.allocation_date DESC, scb.slot_time ASC;


-- ─────────────────────────────────────────────────────────────
-- 3. ACID TRANSACTIONS (SQL / POSTGRESQL)
-- ─────────────────────────────────────────────────────────────
--
-- Scenario: Atomic Candidate Application & Slot Capacity Reservation
-- Guarantees:
-- - Atomicity: Either all steps succeed, or entire state is rolled back.
-- - Consistency: Capacity constraint (remaining_slots >= 0) is never violated.
-- - Isolation: Serializable / Read Committed row-level locks prevent race conditions.
-- - Durability: Changes are committed to WAL log.
--
-- TRANSACTION EXAMPLE:
/*
BEGIN;

-- Step 1: Check and Lock Drive Slot Row (Row-level lock prevents double booking race condition)
SELECT id, remaining_slots 
FROM drives 
WHERE id = '7c9e6679-7425-40de-944b-e07fc1f90ae7' 
FOR UPDATE;

-- Step 2: Decrement remaining capacity
UPDATE drives 
SET remaining_slots = remaining_slots - 1, applicants = applicants + 1
WHERE id = '7c9e6679-7425-40de-944b-e07fc1f90ae7' AND remaining_slots > 0;

-- Step 3: Insert Application Junction Record
INSERT INTO drive_applications (drive_id, student_id, current_stage)
VALUES ('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Applied');

-- Step 4: Insert Venue Booking Slot
INSERT INTO slot_candidate_bookings (slot_allocation_id, student_id, venue_name, slot_time, attendance_status)
VALUES ('b1f9b33a-4a21-4f6c-829d-dfc32a76ef42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Audi 2 - Station 4', '10:30 AM', 'pending');

-- If any check fails: ROLLBACK;
-- If all checks pass:
COMMIT;
*/
