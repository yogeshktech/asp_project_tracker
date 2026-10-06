CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    related_type VARCHAR(50) NOT NULL,
    related_id BIGINT NOT NULL,
    title VARCHAR(250) NOT NULL,
    body TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    send_email BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    last_error TEXT
);

CREATE TABLE IF NOT EXISTS scheduled_notification_recipients (
    scheduled_notification_id BIGINT NOT NULL REFERENCES scheduled_notifications(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (scheduled_notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_scheduled_notifications_due
    ON scheduled_notifications(status, scheduled_at);
