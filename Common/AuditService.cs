using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.Common;

public interface IAuditService
{
    Task LogAsync(long? userId, string action, string entityName, long? entityId, string? details = null);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    public AuditService(AppDbContext db) => _db = db;

    public async Task LogAsync(long? userId, string action, string entityName, long? entityId, string? details = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }
}
