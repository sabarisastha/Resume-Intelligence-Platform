-- RIP Database Schema Initialization
-- Runs automatically on first container start via docker-entrypoint-initdb.d
-- See db_design.txt for full rationale behind each design decision.

-- Enable UUID generation (Postgres 13+ has gen_random_uuid() built in,
-- but we enable the extension explicitly for clarity and compatibility)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STRONG ENTITIES
-- These exist independently — they don't need another table to have meaning.
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- A user can own multiple resumes (e.g. one tailored for Backend roles, one for Frontend).
-- This is the hub table — most other tables depend on it.
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    target_role VARCHAR(100),
    template_id VARCHAR(50),
    -- Points to the full resume JSON document in MongoDB.
    -- This is a plain VARCHAR, NOT a foreign key — Postgres cannot enforce
    -- referential integrity into MongoDB. The backend code is responsible
    -- for keeping this reference consistent (write Mongo first, then Postgres).
    mongo_doc_id VARCHAR(64),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Master list of standardized skill names.
-- Kept as a separate strong entity (not a text array) so we can:
-- 1. Standardize names ("React" vs "ReactJS" vs "React.js" → one canonical entry)
-- 2. Query across resumes ("show all users who know React")
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50)  -- Language / Framework / Tool / Soft Skill
);

-- =============================================================================
-- WEAK ENTITIES
-- These only make sense in the context of a parent resume.
-- All use ON DELETE CASCADE — if a resume is deleted, its children go too.
-- =============================================================================

CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    institution VARCHAR(200) NOT NULL,
    degree VARCHAR(150),
    field_of_study VARCHAR(150),
    start_date DATE,
    end_date DATE,
    grade VARCHAR(20)
);

CREATE TABLE experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    company VARCHAR(200) NOT NULL,
    role VARCHAR(150),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    description TEXT  -- Base description, before any AI role-tailoring
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    -- Kept as a Postgres array intentionally — this is descriptive metadata
    -- for a single project, not a field queried/joined across projects at scale.
    -- Not every one-to-many-looking field needs full normalization.
    tech_stack TEXT[],
    github_link TEXT,
    live_link TEXT
);

CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    issuer VARCHAR(150),
    issue_date DATE
);

-- =============================================================================
-- JUNCTION TABLE (M:N Relationship)
-- =============================================================================

-- Many-to-many bridge between resumes and skills.
-- In Chen ER notation this is the "HAS SKILL" relationship diamond,
-- with proficiency as a relationship attribute.
CREATE TABLE resume_skills (
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    skill_id INT REFERENCES skills(id) ON DELETE CASCADE,
    proficiency VARCHAR(20),  -- Beginner / Intermediate / Advanced
    PRIMARY KEY (resume_id, skill_id)
);

-- =============================================================================
-- REPORT SUMMARY (Weak Entity)
-- =============================================================================

-- Lightweight summary kept in Postgres for fast dashboard queries
-- (e.g. "show ATS score history for this user").
-- The full explanation — reasons, breakdown, recommendations — lives in MongoDB;
-- only the score and a pointer to that document sit here.
CREATE TABLE ats_reports_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    jd_mongo_id VARCHAR(64),
    ats_score INT,
    match_score INT,
    -- Points to the full report body in MongoDB's ats_reports collection.
    -- Same cross-DB reference pattern as resumes.mongo_doc_id.
    mongo_report_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- TRIGGER: auto-update updated_at on row changes
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
