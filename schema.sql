-- ============================================================
-- PLACENIX — RELATIONAL POSTGRESQL SCHEMA DESIGN & SQL JOINS
-- Demonstrates:
-- 1. Relational Schema Modeling with PK, FK, Constraints & Indexes
-- 2. Multi-Table SQL JOINs (INNER JOIN, LEFT JOIN, GROUP BY, CTEs)
-- ============================================================

-- ── 1. RELATIONAL SCHEMA DDL (PK / FK & Constraints) ─────────

-- Departments Table (Parent Table)
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(10) PRIMARY KEY, -- e.g. 'CSE', 'IT', 'ECE'
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sections Table (Child of Departments: 1-to-Many FK)
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id VARCHAR(10) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    section_name VARCHAR(10) NOT NULL, -- e.g. 'A', 'B', 'C'
    room_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_section UNIQUE(department_id, section_name)
);

-- Student & Staff Profiles Table (Relational User Directory)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Recruitment Drives Table
CREATE TABLE IF NOT EXISTS drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    package_lpa NUMERIC(5, 2) NOT NULL CHECK (package_lpa > 0),
    min_cgpa NUMERIC(4, 2) DEFAULT 0.00,
    deadline DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'In-Progress', 'Closed')),
    applicants INT DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Candidate Applications Table (Junction Table: Many-to-Many between Profiles & Drives)
CREATE TABLE IF NOT EXISTS drive_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'Applied' CHECK (current_stage IN ('Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Selected', 'Rejected')),
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_drive UNIQUE(drive_id, student_id)
);

-- Slot Allocations Table (1-to-Many from Drives)
CREATE TABLE IF NOT EXISTS slot_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    round_name VARCHAR(100) NOT NULL,
    allocation_date DATE NOT NULL,
    total_candidates INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Slot Candidate Bookings Table (Child of Slot Allocations & Profiles)
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


-- ── 2. SQL JOINS DEMONSTRATION & ADVANCED QUERY SUITE ──────────

-- QUERY 1: Multi-Table INNER JOIN — Student Academic & Department Hierarchy Report
-- Joins: profiles + departments + sections
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
-- Calculates total enrolled students, placed count, placement percentage, and avg package
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
-- Joins: drives + drive_applications + profiles + slot_allocations + slot_candidate_bookings
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
