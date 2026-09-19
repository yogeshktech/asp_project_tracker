using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/audit")]
public class AuditController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPermissionService _permissions;
    public AuditController(AppDbContext db, IPermissionService permissions)
    {
        _db = db;
        _permissions = permissions;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? entityName, [FromQuery] long? entityId, [FromQuery] int take = 100)
    {
        var userId = UserContext.GetUserId(User)!.Value;
        await _permissions.EnsureModuleAsync(userId, 0, "Audit", "view");
        var q = _db.AuditLogs.AsNoTracking().OrderByDescending(a => a.CreatedAt).AsQueryable();
        if (!string.IsNullOrWhiteSpace(entityName)) q = q.Where(a => a.EntityName == entityName);
        if (entityId.HasValue) q = q.Where(a => a.EntityId == entityId);
        return Ok(await q.Take(take).ToListAsync());
    }
}
