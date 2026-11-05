using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.BusinessLayer.Notifications;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly IPermissionService _permissions;
    private readonly AppDbContext _db;
    public NotificationsController(INotificationService notificationService, IPermissionService permissions, AppDbContext db)
    {
        _notificationService = notificationService;
        _permissions = permissions;
        _db = db;
    }
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] CreateNotificationRequest request)
    {
        if (!await _permissions.CanEditModuleAsync(UserId, 0, "Notifications")) return Forbid();
        return Ok(await _notificationService.SendAsync(request));
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var userId = UserId;
        if (!await _permissions.CanViewModuleAsync(userId, 0, "Notifications")) return Forbid();
        return Ok(await _notificationService.GetInboxAsync(userId, page, pageSize));
    }

    [HttpGet("recipients")]
    public async Task<IActionResult> Recipients()
    {
        if (!await _permissions.CanEditModuleAsync(UserId, 0, "Notifications")) return Forbid();
        var users = await _db.Users.AsNoTracking().Where(u => u.IsActive && u.IsInternal)
            .OrderBy(u => u.FullName).Select(u => new { u.Id, u.FullName, u.Email }).ToListAsync();
        return Ok(users);
    }

    [HttpPost("{recipientId:long}/read")]
    public async Task<IActionResult> MarkRead(long recipientId)
    {
        if (!await _permissions.CanViewModuleAsync(UserId, 0, "Notifications")) return Forbid();
        await _notificationService.MarkReadAsync(recipientId, UserId);
        return Ok();
    }

    [HttpGet("escalation-rules")]
    public async Task<IActionResult> Rules() => await _permissions.CanViewModuleAsync(UserId, 0, "Notifications")
        ? Ok(await _notificationService.GetRulesAsync()) : Forbid();

    [HttpGet("scheduled")]
    public async Task<IActionResult> Scheduled([FromQuery] long? projectId)
    {
        if (!await _permissions.CanViewModuleAsync(UserId, 0, "Notifications")) return Forbid();
        return Ok(await _notificationService.GetScheduledAsync(projectId, UserId));
    }

    [HttpPost("scheduled")]
    public async Task<IActionResult> Schedule([FromBody] CreateScheduledNotificationRequest request)
    {
        try
        {
            var userId = UserId;
            return Ok(await _notificationService.ScheduleAsync(request, userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("scheduled/{id:long}")]
    public async Task<IActionResult> CancelScheduled(long id)
    {
        try
        {
            return await _notificationService.CancelScheduledAsync(id, UserId)
                ? NoContent()
                : NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("escalation-rules")]
    public async Task<IActionResult> CreateRule([FromBody] CreateEscalationRuleRequest request)
    {
        if (!await _permissions.CanEditModuleAsync(UserId, 0, "Notifications")) return Forbid();
        return Ok(await _notificationService.CreateRuleAsync(request));
    }

    [HttpPut("escalation-rules/{ruleId:long}")]
    public async Task<IActionResult> SetRuleActive(long ruleId, [FromBody] UpdateEscalationRuleRequest request)
    {
        if (!await _permissions.CanUpdateModuleAsync(UserId, 0, "Notifications")) return Forbid();
        var rule = await _notificationService.SetRuleActiveAsync(ruleId, request.IsActive);
        return rule == null ? NotFound() : Ok(rule);
    }
}
