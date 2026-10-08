using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;

namespace project_tracker_madhu.DatabaseLayer;

public static class DatabaseBootstrap
{
    public static async Task EnsureSchemaAndSeedAsync(AppDbContext db, IHostEnvironment env, ILogger logger)
    {
        if (!await UsersTableExistsAsync(db))
        {
            var schemaPath = ResolveSchemaPath(env, "wisetrack_schema.sql");
            if (schemaPath == null)
            {
                logger.LogError(
                    "Table \"users\" is missing and Database/wisetrack_schema.sql was not found. " +
                    "Run that script against PostgreSQL, then restart the app.");
                return;
            }

            logger.LogWarning("Table \"users\" missing — applying {SchemaPath}", schemaPath);
            var sql = await File.ReadAllTextAsync(schemaPath);
            await db.Database.ExecuteSqlRawAsync(sql);
            logger.LogInformation("Schema applied from {SchemaPath}", schemaPath);

            var v2Path = ResolveSchemaPath(env, "wisetrack_schema_v2_migration.sql");
            if (v2Path != null)
            {
                var v2Sql = await File.ReadAllTextAsync(v2Path);
                await db.Database.ExecuteSqlRawAsync(v2Sql);
                logger.LogInformation("Applied v2 migration from {V2Path}", v2Path);
            }
        }

        await EnsurePermissionColumnsAsync(db, logger);
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT NULL""");
        await EnsureReportProjectCascadeAsync(db, logger);
        var budgetVersionCurrencyExists = await ColumnExistsAsync(db, "budget_versions", "currency");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE budget_versions ADD COLUMN IF NOT EXISTS approver_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE budget_versions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'MVR'""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE projects ALTER COLUMN currency SET DEFAULT 'MVR'""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE budgets ALTER COLUMN currency SET DEFAULT 'MVR'""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE budget_versions ALTER COLUMN currency SET DEFAULT 'MVR'""");
        await db.Database.ExecuteSqlRawAsync("""UPDATE projects SET currency = 'MVR' WHERE UPPER(currency) = 'INR'""");
        await db.Database.ExecuteSqlRawAsync("""UPDATE budgets SET currency = 'MVR' WHERE UPPER(currency) = 'INR'""");
        await db.Database.ExecuteSqlRawAsync("""UPDATE budget_versions SET currency = 'MVR' WHERE UPPER(currency) = 'INR'""");
        await db.Database.ExecuteSqlRawAsync("""UPDATE budget_versions SET approver_id = created_by WHERE approver_id IS NULL AND created_by IS NOT NULL""");
        if (!budgetVersionCurrencyExists)
            await db.Database.ExecuteSqlRawAsync("""UPDATE budget_versions v SET currency = b.currency FROM budgets b WHERE v.budget_id = b.id""");
        await EnsureItemMasterColumnsAsync(db);
        await EnsureBoqItemColumnsAsync(db);
        await EnsureBoqBaselineColumnAsync(db);
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE project_permissions ADD COLUMN IF NOT EXISTS field_permissions_json TEXT NULL""");
        await EnsureSubTaskNestingColumnAsync(db, logger);
        await EnsureTaskDependencyColumnsAsync(db, logger);
        await EnsureMilestonePlanningColumnsAsync(db, logger);
        await EnsureScheduledNotificationSchemaAsync(db, logger);
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_evidence TEXT NULL""");
        await DbSeeder.SeedAsync(db);
        await DbSeeder.EnsureUserBasedAccessAsync(db);
        logger.LogInformation("Database seed completed.");
    }

    private static async Task EnsureReportProjectCascadeAsync(AppDbContext db, ILogger logger)
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'reports_project_id_fkey'
                      AND pg_get_constraintdef(oid) NOT LIKE '%ON DELETE CASCADE%'
                ) THEN
                    ALTER TABLE reports DROP CONSTRAINT reports_project_id_fkey;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_project_id_fkey') THEN
                    ALTER TABLE reports ADD CONSTRAINT reports_project_id_fkey
                        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
                END IF;
            END $$;
            """);
        logger.LogInformation("Ensured project deletion cascades to its reports.");
    }

    private static async Task EnsureItemMasterColumnsAsync(AppDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE items ADD COLUMN IF NOT EXISTS standard_price NUMERIC(18,2)""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE items ADD COLUMN IF NOT EXISTS effective_date DATE""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE items ADD COLUMN IF NOT EXISTS source VARCHAR(500)""");
    }

    private static async Task EnsureBoqItemColumnsAsync(AppDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS item_code VARCHAR(50)""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(250)""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS unit VARCHAR(100)""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS brand VARCHAR(250)""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS image_url TEXT""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_items ALTER COLUMN remarks TYPE TEXT""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS attachment_path TEXT""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS attachment_name TEXT""");
    }

    private static async Task EnsureBoqBaselineColumnAsync(AppDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE boq_versions ADD COLUMN IF NOT EXISTS is_current_baseline BOOLEAN NOT NULL DEFAULT FALSE""");
        await db.Database.ExecuteSqlRawAsync("""
            WITH latest AS (
                SELECT DISTINCT ON (boq_id) id
                FROM boq_versions
                ORDER BY boq_id, version_no DESC
            )
            UPDATE boq_versions v SET is_current_baseline = TRUE
            FROM latest WHERE latest.id = v.id
              AND NOT EXISTS (SELECT 1 FROM boq_versions current_v WHERE current_v.boq_id = v.boq_id AND current_v.is_current_baseline)
            """);
        await db.Database.ExecuteSqlRawAsync("""CREATE UNIQUE INDEX IF NOT EXISTS ux_boq_versions_current_baseline ON boq_versions(boq_id) WHERE is_current_baseline = TRUE""");
    }

    private static async Task EnsurePermissionColumnsAsync(AppDbContext db, ILogger logger)
    {
        if (!await ColumnExistsAsync(db, "project_permissions", "can_update"))
        {
            await db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE project_permissions ADD COLUMN IF NOT EXISTS can_update BOOLEAN NOT NULL DEFAULT FALSE""");
            await db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE project_permissions ADD COLUMN IF NOT EXISTS can_delete BOOLEAN NOT NULL DEFAULT FALSE""");
            await db.Database.ExecuteSqlRawAsync(
                """UPDATE project_permissions SET can_update = can_edit, can_delete = can_edit WHERE can_edit = TRUE""");
            logger.LogInformation("Added can_update / can_delete on project_permissions.");
        }

        await db.Database.ExecuteSqlRawAsync(
            """ALTER TABLE project_permissions ALTER COLUMN project_id DROP NOT NULL""");
        await db.Database.ExecuteSqlRawAsync(
            """ALTER TABLE project_permissions DROP CONSTRAINT IF EXISTS project_permissions_project_id_user_id_module_key""");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_project_permissions_scoped
                ON project_permissions (project_id, user_id, module)
                WHERE project_id IS NOT NULL
            """);
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_project_permissions_global
                ON project_permissions (user_id, module)
                WHERE project_id IS NULL
            """);
    }

    private static async Task EnsureSubTaskNestingColumnAsync(AppDbContext db, ILogger logger)
    {
        if (await ColumnExistsAsync(db, "sub_tasks", "parent_sub_task_id")) return;
        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE sub_tasks
                ADD COLUMN IF NOT EXISTS parent_sub_task_id BIGINT NULL REFERENCES sub_tasks(id) ON DELETE CASCADE
            """);
        await db.Database.ExecuteSqlRawAsync(
            """CREATE INDEX IF NOT EXISTS ix_sub_tasks_parent ON sub_tasks(parent_sub_task_id)""");
        logger.LogInformation("Added parent_sub_task_id on sub_tasks for nested child tasks.");
    }

    private static async Task EnsureTaskDependencyColumnsAsync(AppDbContext db, ILogger logger)
    {
        if (!await ColumnExistsAsync(db, "tasks", "depends_on_sub_task_id"))
        {
            await db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depends_on_sub_task_id BIGINT NULL REFERENCES sub_tasks(id) ON DELETE SET NULL""");
            logger.LogInformation("Added depends_on_sub_task_id on tasks.");
        }
        if (!await ColumnExistsAsync(db, "sub_tasks", "depends_on_task_id"))
        {
            await db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE sub_tasks ADD COLUMN IF NOT EXISTS depends_on_task_id BIGINT NULL REFERENCES tasks(id) ON DELETE SET NULL""");
            await db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE sub_tasks ADD COLUMN IF NOT EXISTS depends_on_sub_task_id BIGINT NULL REFERENCES sub_tasks(id) ON DELETE SET NULL""");
            logger.LogInformation("Added dependency columns on sub_tasks.");
        }
    }

    private static async Task EnsureMilestonePlanningColumnsAsync(AppDbContext db, ILogger logger)
    {
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE milestones ADD COLUMN IF NOT EXISTS owner_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE milestones ADD COLUMN IF NOT EXISTS depends_on_milestone_id BIGINT NULL REFERENCES milestones(id) ON DELETE SET NULL""");
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE milestones ADD COLUMN IF NOT EXISTS completion_evidence TEXT NULL""");
        logger.LogInformation("Ensured owner, dependency, and completion evidence columns on milestones.");
    }

    private static async Task EnsureScheduledNotificationSchemaAsync(AppDbContext db, ILogger logger)
    {
        await db.Database.ExecuteSqlRawAsync(
            """
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
            )
            """);
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS scheduled_notification_recipients (
                scheduled_notification_id BIGINT NOT NULL REFERENCES scheduled_notifications(id) ON DELETE CASCADE,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                PRIMARY KEY (scheduled_notification_id, user_id)
            )
            """);
        await db.Database.ExecuteSqlRawAsync(
            """CREATE INDEX IF NOT EXISTS ix_scheduled_notifications_due ON scheduled_notifications(status, scheduled_at)""");
        logger.LogInformation("Ensured scheduled notification tables and due index.");
    }

    private static async Task<bool> ColumnExistsAsync(AppDbContext db, string table, string column)
    {
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var cmd = db.Database.GetDbConnection().CreateCommand();
            cmd.CommandText =
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = @table AND column_name = @column
                )
                """;
            var tableParam = cmd.CreateParameter();
            tableParam.ParameterName = "@table";
            tableParam.Value = table;
            cmd.Parameters.Add(tableParam);
            var colParam = cmd.CreateParameter();
            colParam.ParameterName = "@column";
            colParam.Value = column;
            cmd.Parameters.Add(colParam);
            var result = await cmd.ExecuteScalarAsync();
            return result is true || result is bool b && b;
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    private static async Task<bool> UsersTableExistsAsync(AppDbContext db)
    {
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var cmd = db.Database.GetDbConnection().CreateCommand();
            cmd.CommandText =
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'users'
                )
                """;
            var result = await cmd.ExecuteScalarAsync();
            return result is true || result is bool b && b;
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    private static string? ResolveSchemaPath(IHostEnvironment env, string fileName)
    {
        var candidates = new[]
        {
            Path.Combine(env.ContentRootPath, "Database", fileName),
            Path.Combine(AppContext.BaseDirectory, "Database", fileName)
        };
        return candidates.FirstOrDefault(File.Exists);
    }
}
