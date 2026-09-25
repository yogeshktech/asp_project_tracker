-- =============================================================================
-- Wisetrack PostgreSQL schema
-- Database: wisetrack
-- Run in DBeaver:
--   1. Connect as postgres
--   2. Execute the CREATE DATABASE block once (or create DB manually)
--   3. Reconnect / switch to database "wisetrack"
--   4. Execute the rest of this script
-- =============================================================================

-- CREATE DATABASE wisetrack
--     WITH OWNER = postgres
--          ENCODING = 'UTF8'
--          TEMPLATE = template0;
--
-- \connect wisetrack

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Drop in reverse dependency order (safe to re-run)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS file_records CASCADE;
DROP TABLE IF EXISTS project_completion_reports CASCADE;
DROP TABLE IF EXISTS inventories CASCADE;
DROP TABLE IF EXISTS report_recipients CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS notification_recipients CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS escalation_rules CASCADE;
DROP TABLE IF EXISTS issue_attachments CASCADE;
DROP TABLE IF EXISTS issue_comments CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS issue_priorities CASCADE;
DROP TABLE IF EXISTS actual_costs CASCADE;
DROP TABLE IF EXISTS purchase_costs CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_updates CASCADE;
DROP TABLE IF EXISTS sub_tasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS boq_items CASCADE;
DROP TABLE IF EXISTS boq_versions CASCADE;
DROP TABLE IF EXISTS boqs CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS item_categories CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS budget_allocations CASCADE;
DROP TABLE IF EXISTS budget_versions CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP TABLE IF EXISTS milestone_templates CASCADE;
DROP TABLE IF EXISTS variance_explanations CASCADE;
DROP TABLE IF EXISTS project_permissions CASCADE;
DROP TABLE IF EXISTS project_users CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS project_types CASCADE;
DROP TABLE IF EXISTS resorts CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- 01. Authentication / Users
-- =============================================================================
CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(256) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    phone           VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_internal     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE TABLE roles (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    module      VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- =============================================================================
-- 03. Resort & Project Management
-- =============================================================================
CREATE TABLE resorts (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    location   VARCHAR(300),
    code       VARCHAR(50) UNIQUE,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE properties (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resort_id   BIGINT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(50),
    description TEXT,
    location    VARCHAR(300),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

CREATE TABLE project_types (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resort_id           BIGINT NOT NULL REFERENCES resorts(id),
    parent_project_id   BIGINT REFERENCES projects(id),
    owner_id            BIGINT REFERENCES users(id),
    project_type_id     BIGINT REFERENCES project_types(id),
    property_id         BIGINT REFERENCES properties(id),
    client_name         VARCHAR(200),
    sponsor             VARCHAR(200),
    currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
    allow_external_view BOOLEAN NOT NULL DEFAULT FALSE,
    name                VARCHAR(250) NOT NULL,
    code                VARCHAR(50),
    description         TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'Draft',
    start_date          DATE,
    end_date            DATE,
    profile_notes       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);

CREATE INDEX ix_projects_resort ON projects(resort_id);
CREATE INDEX ix_projects_parent ON projects(parent_project_id);

CREATE TABLE variance_explanations (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    variance_type VARCHAR(50) NOT NULL,
    explanation  TEXT NOT NULL,
    created_by   BIGINT REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE milestone_templates (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    project_type_id BIGINT REFERENCES project_types(id),
    template_json   TEXT NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_users (
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_role  VARCHAR(100),
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_permissions (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module     VARCHAR(100) NOT NULL,
    can_view   BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit   BOOLEAN NOT NULL DEFAULT FALSE,
    can_update BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX ux_project_permissions_scoped
    ON project_permissions (project_id, user_id, module) WHERE project_id IS NOT NULL;
CREATE UNIQUE INDEX ux_project_permissions_global
    ON project_permissions (user_id, module) WHERE project_id IS NULL;

-- =============================================================================
-- 04. Budget & Cost Center
-- =============================================================================
CREATE TABLE cost_centers (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id  BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    code        VARCHAR(50) NOT NULL,
    name        VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE budgets (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id         BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name               VARCHAR(200) NOT NULL,
    approved_amount    NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency           VARCHAR(10) NOT NULL DEFAULT 'INR',
    rag_amber_percent  NUMERIC(5,2) NOT NULL DEFAULT 10,
    rag_red_percent    NUMERIC(5,2) NOT NULL DEFAULT 20,
    status             VARCHAR(50) NOT NULL DEFAULT 'Draft',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ
);

CREATE TABLE budget_versions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    budget_id     BIGINT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    version_no    INT NOT NULL,
    total_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
    remarks       TEXT,
    created_by    BIGINT REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (budget_id, version_no)
);

CREATE TABLE budget_allocations (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    budget_id      BIGINT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    cost_center_id BIGINT NOT NULL REFERENCES cost_centers(id),
    allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    remarks        VARCHAR(500)
);

-- =============================================================================
-- 05. Item / Price Master
-- =============================================================================
CREATE TABLE brands (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE units (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       VARCHAR(20) NOT NULL UNIQUE,
    name       VARCHAR(100) NOT NULL
);

CREATE TABLE item_categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(150) NOT NULL UNIQUE,
    parent_id  BIGINT REFERENCES item_categories(id)
);

CREATE TABLE items (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_code     VARCHAR(50) NOT NULL UNIQUE,
    name          VARCHAR(250) NOT NULL,
    description   TEXT,
    unit_id       BIGINT REFERENCES units(id),
    brand_id      BIGINT REFERENCES brands(id),
    category_id   BIGINT REFERENCES item_categories(id),
    unit_price    NUMERIC(18,2) NOT NULL DEFAULT 0,
    image_url     TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ
);

-- =============================================================================
-- 06. BOQ Management
-- =============================================================================
CREATE TABLE boqs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       VARCHAR(250) NOT NULL,
    status      VARCHAR(50) NOT NULL DEFAULT 'Draft',
    created_by  BIGINT REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

CREATE TABLE boq_versions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    boq_id      BIGINT NOT NULL REFERENCES boqs(id) ON DELETE CASCADE,
    version_no  INT NOT NULL,
    remarks     TEXT,
    created_by  BIGINT REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (boq_id, version_no)
);

CREATE TABLE boq_items (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    boq_version_id BIGINT NOT NULL REFERENCES boq_versions(id) ON DELETE CASCADE,
    item_id        BIGINT REFERENCES items(id),
    line_no        INT,
    description    TEXT,
    quantity       NUMERIC(18,4) NOT NULL DEFAULT 0,
    unit_price     NUMERIC(18,2) NOT NULL DEFAULT 0,
    amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    remarks        VARCHAR(500)
);

-- =============================================================================
-- 07. Planning / Milestone / Task
-- =============================================================================
CREATE TABLE milestones (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name         VARCHAR(250) NOT NULL,
    description  TEXT,
    start_date   DATE,
    due_date     DATE,
    status       VARCHAR(50) NOT NULL DEFAULT 'NotStarted',
    completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id BIGINT REFERENCES milestones(id) ON DELETE SET NULL,
    depends_on_task_id BIGINT REFERENCES tasks(id),
    title        VARCHAR(250) NOT NULL,
    description  TEXT,
    assigned_to  BIGINT REFERENCES users(id),
    start_date   DATE,
    due_date     DATE,
    status       VARCHAR(50) NOT NULL DEFAULT 'NotStarted',
    completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    remarks      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);

CREATE TABLE sub_tasks (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id      BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    parent_sub_task_id BIGINT REFERENCES sub_tasks(id) ON DELETE CASCADE,
    depends_on_task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
    depends_on_sub_task_id BIGINT REFERENCES sub_tasks(id) ON DELETE SET NULL,
    title        VARCHAR(250) NOT NULL,
    assigned_to  BIGINT REFERENCES users(id),
    due_date     DATE,
    status       VARCHAR(50) NOT NULL DEFAULT 'NotStarted',
    completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    remarks      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depends_on_sub_task_id BIGINT REFERENCES sub_tasks(id) ON DELETE SET NULL;

CREATE TABLE task_updates (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id      BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sub_task_id  BIGINT REFERENCES sub_tasks(id) ON DELETE SET NULL,
    updated_by   BIGINT REFERENCES users(id),
    update_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_percent NUMERIC(5,2),
    status       VARCHAR(50),
    remarks      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_attachments (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id       BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name     VARCHAR(260) NOT NULL,
    file_path     TEXT NOT NULL,
    uploaded_by   BIGINT REFERENCES users(id),
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 08. Cost / Purchase Management
-- =============================================================================
CREATE TABLE purchase_costs (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id     BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    boq_item_id    BIGINT REFERENCES boq_items(id),
    cost_center_id BIGINT REFERENCES cost_centers(id),
    vendor         VARCHAR(200),
    description    TEXT,
    amount         NUMERIC(18,2) NOT NULL,
    purchase_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by     BIGINT REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE actual_costs (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id     BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    boq_item_id    BIGINT REFERENCES boq_items(id),
    cost_center_id BIGINT REFERENCES cost_centers(id),
    description    TEXT,
    amount         NUMERIC(18,2) NOT NULL,
    cost_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by     BIGINT REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 09. Issue / Incident Tracker
-- =============================================================================
CREATE TABLE issue_priorities (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code  VARCHAR(30) NOT NULL UNIQUE,
    name  VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE issues (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title         VARCHAR(250) NOT NULL,
    what          TEXT,
    location      VARCHAR(300),
    occurred_at   TIMESTAMPTZ,
    reported_by   BIGINT REFERENCES users(id),
    impact        TEXT,
    priority_id   BIGINT REFERENCES issue_priorities(id),
    status        VARCHAR(50) NOT NULL DEFAULT 'Open',
    is_escalated  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ
);

CREATE TABLE issue_comments (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    issue_id   BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id    BIGINT REFERENCES users(id),
    comment    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issue_attachments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    issue_id    BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    file_name   VARCHAR(260) NOT NULL,
    file_path   TEXT NOT NULL,
    uploaded_by BIGINT REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 10. Notification & Escalation
-- =============================================================================
CREATE TABLE notifications (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title        VARCHAR(250) NOT NULL,
    body         TEXT,
    type         VARCHAR(100) NOT NULL,
    related_type VARCHAR(100),
    related_id   BIGINT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_recipients (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    sent_email      BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    UNIQUE (notification_id, user_id)
);

CREATE TABLE escalation_rules (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    trigger_type    VARCHAR(100) NOT NULL,
    delay_hours     INT NOT NULL DEFAULT 24,
    target_role_id  BIGINT REFERENCES roles(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 11. Reports & Dashboard
-- =============================================================================
CREATE TABLE reports (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    report_type   VARCHAR(100) NOT NULL,
    project_id    BIGINT REFERENCES projects(id),
    filter_json   TEXT,
    selected_columns TEXT,
    created_by    BIGINT REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE report_recipients (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id  BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id    BIGINT REFERENCES users(id),
    email      VARCHAR(256)
);

-- =============================================================================
-- 12. Inventory & Project Closure
-- =============================================================================
CREATE TABLE inventories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_id     BIGINT REFERENCES items(id),
    description VARCHAR(500),
    quantity    NUMERIC(18,4) NOT NULL DEFAULT 0,
    unit_id     BIGINT REFERENCES units(id),
    remarks     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_completion_reports (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id          BIGINT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    handover_notes      TEXT,
    signed_document_path TEXT,
    is_mandatory_complete BOOLEAN NOT NULL DEFAULT FALSE,
    closed_by           BIGINT REFERENCES users(id),
    closed_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Common / Cross-cutting
-- =============================================================================
CREATE TABLE file_records (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    file_name     VARCHAR(260) NOT NULL,
    file_path     TEXT NOT NULL,
    content_type  VARCHAR(150),
    size_bytes    BIGINT,
    module        VARCHAR(100),
    related_id    BIGINT,
    uploaded_by   BIGINT REFERENCES users(id),
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id   BIGINT,
    details     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_audit_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX ix_issues_project ON issues(project_id);
CREATE INDEX ix_tasks_project ON tasks(project_id);
CREATE INDEX ix_notifications_created ON notifications(created_at DESC);

-- =============================================================================
-- Seed data (lookup + default admin)
-- Password for admin@wisetrack.local is set by the API seeder (Admin@123).
-- SQL stores a placeholder hash; run the API once after schema, or update hash.
-- =============================================================================
INSERT INTO roles (name, description) VALUES
    ('Admin', 'Full system access'),
    ('ProjectManager', 'Manage assigned projects'),
    ('Viewer', 'Read-only access');

INSERT INTO permissions (code, name, module) VALUES
    ('users.manage', 'Manage users', 'Users'),
    ('projects.view', 'View projects', 'Projects'),
    ('projects.edit', 'Edit projects', 'Projects'),
    ('budgets.edit', 'Edit budgets', 'Budgets'),
    ('boq.edit', 'Edit BOQ', 'BOQ'),
    ('tasks.edit', 'Edit tasks', 'Tasks'),
    ('costs.edit', 'Edit costs', 'Costs'),
    ('issues.edit', 'Edit issues', 'Issues'),
    ('reports.view', 'View reports', 'Reports'),
    ('closure.edit', 'Close projects', 'Closure');

INSERT INTO issue_priorities (code, name, sort_order) VALUES
    ('LOW', 'Low', 1),
    ('MEDIUM', 'Medium', 2),
    ('HIGH', 'High', 3),
    ('CRITICAL', 'Critical', 4);

INSERT INTO units (code, name) VALUES
    ('NOS', 'Numbers'),
    ('M', 'Meter'),
    ('SQM', 'Square Meter'),
    ('CUM', 'Cubic Meter'),
    ('KG', 'Kilogram'),
    ('LS', 'Lump Sum');

INSERT INTO project_types (name, description) VALUES
    ('MEP', 'Mechanical Electrical Plumbing'),
    ('Civil', 'Civil works'),
    ('New Development', 'New development project'),
    ('Major Renovation', 'Major renovation project')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- Admin User Account (Password: Admin@123)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, password_hash, full_name, is_active, created_at)
VALUES ('admin@wisetrack.local', crypt('Admin@123', gen_salt('bf', 11)), 'System Admin', TRUE, NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = crypt('Admin@123', gen_salt('bf', 11)), is_active = TRUE;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@wisetrack.local' AND r.name = 'Admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
