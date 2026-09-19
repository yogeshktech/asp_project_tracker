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

        await DbSeeder.SeedAsync(db);
        await DbSeeder.EnsureUserBasedAccessAsync(db);
        logger.LogInformation("Database seed completed.");
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
