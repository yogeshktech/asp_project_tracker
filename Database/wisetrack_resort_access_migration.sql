-- Run after wisetrack_schema_v2_migration.sql.
-- Assign each non-admin user to the resorts that contain their existing project access.

CREATE TABLE IF NOT EXISTS user_resorts (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resort_id BIGINT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, resort_id)
);

INSERT INTO user_resorts (user_id, resort_id)
SELECT DISTINCT user_id, resort_id
FROM (
    SELECT pp.user_id, p.resort_id
    FROM project_permissions pp
    JOIN projects p ON p.id = pp.project_id
    WHERE pp.project_id IS NOT NULL
    UNION
    SELECT pu.user_id, p.resort_id
    FROM project_users pu
    JOIN projects p ON p.id = pu.project_id
    UNION
    SELECT p.owner_id AS user_id, p.resort_id
    FROM projects p
    WHERE p.owner_id IS NOT NULL
) existing_access
ON CONFLICT (user_id, resort_id) DO NOTHING;
