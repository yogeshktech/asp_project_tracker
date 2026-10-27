
-- Run this on existing wisetrack database after wisetrack_schema.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS attachment_path TEXT NULL;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS attachment_name TEXT NULL;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS attachment_path TEXT NULL;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS attachment_name TEXT NULL;

CREATE TABLE IF NOT EXISTS budget_record_attachments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    budget_id BIGINT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    cost_center_id BIGINT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((budget_id IS NOT NULL)::INT + (cost_center_id IS NOT NULL)::INT = 1)
);
CREATE INDEX IF NOT EXISTS ix_budget_record_attachments_budget ON budget_record_attachments(budget_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS ix_budget_record_attachments_cost_center ON budget_record_attachments(cost_center_id, uploaded_at DESC);

INSERT INTO budget_record_attachments (budget_id, file_path, file_name, uploaded_at)
SELECT b.id, b.attachment_path, COALESCE(NULLIF(b.attachment_name, ''), 'budget-attachment'), COALESCE(b.updated_at, b.created_at)
FROM budgets b
WHERE b.attachment_path IS NOT NULL AND b.attachment_path <> ''
  AND NOT EXISTS (SELECT 1 FROM budget_record_attachments a WHERE a.budget_id = b.id AND a.file_path = b.attachment_path);

INSERT INTO budget_record_attachments (cost_center_id, file_path, file_name, uploaded_at)
SELECT c.id, c.attachment_path, COALESCE(NULLIF(c.attachment_name, ''), 'cost-center-attachment'), c.created_at
FROM cost_centers c
WHERE c.attachment_path IS NOT NULL AND c.attachment_path <> ''
  AND NOT EXISTS (SELECT 1 FROM budget_record_attachments a WHERE a.cost_center_id = c.id AND a.file_path = c.attachment_path);

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
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'MVR';
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
ALTER TABLE project_permissions ADD COLUMN IF NOT EXISTS field_permissions_json TEXT NULL;
