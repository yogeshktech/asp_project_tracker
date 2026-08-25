
-- Run this on existing wisetrack database after wisetrack_schema.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS project_types (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resort_id BIGINT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    location VARCHAR(300),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type_id BIGINT REFERENCES project_types(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS property_id BIGINT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sponsor VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS allow_external_view BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_property') THEN
        ALTER TABLE projects ADD CONSTRAINT fk_projects_property FOREIGN KEY (property_id) REFERENCES properties(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS variance_explanations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    variance_type VARCHAR(50) NOT NULL,
    explanation TEXT NOT NULL,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestone_templates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    project_type_id BIGINT REFERENCES project_types(id),
    template_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO project_types (name, description) VALUES
    ('MEP', 'Mechanical Electrical Plumbing'),
    ('Civil', 'Civil works'),
    ('New Development', 'New development project'),
    ('Major Renovation', 'Major renovation project')
ON CONFLICT (name) DO NOTHING;
