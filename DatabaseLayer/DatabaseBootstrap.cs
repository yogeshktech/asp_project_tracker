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
        await DbSeeder.SeedAsync(db);
        await DbSeeder.EnsureUserBasedAccessAsync(db);
        logger.LogInformation("Database seed completed.");
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
