using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.BusinessLayer.Notifications;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Common;

public class EscalationBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EscalationBackgroundService> _logger;

    public EscalationBackgroundService(IServiceScopeFactory scopeFactory, ILogger<EscalationBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunChecksAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Escalation background check failed");
            }
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task RunChecksAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var inactiveSince = DateTime.UtcNow.AddDays(-7);

        var overdueTasks = await db.Tasks
            .Include(t => t.Project).ThenInclude(p => p.ProjectUsers)
            .Where(t => t.DueDate != null && t.DueDate < today && t.Status != "Completed")
            .ToListAsync();

        foreach (var task in overdueTasks)
        {
            if (await WasRecentlyNotifiedAsync(db, "TaskDelay", "Task", task.Id)) continue;
            var userIds = task.Project.ProjectUsers.Select(pu => pu.UserId).Distinct().ToList();
            if (task.AssignedTo.HasValue) userIds.Add(task.AssignedTo.Value);
            userIds = userIds.Distinct().ToList();
            if (userIds.Count == 0) continue;

            await notifications.SendAsync(new CreateNotificationRequest
            {
                Title = $"Overdue task: {task.Title}",
                Body = $"Task #{task.Id} on project {task.Project.Name} is overdue.",
                Type = "TaskDelay",
                RelatedType = "Task",
                RelatedId = task.Id,
                UserIds = userIds
            });

            var emails = await db.Users.Where(u => userIds.Contains(u.Id) && u.IsInternal)
                .Select(u => u.Email).ToListAsync();
            await email.SendAsync(emails, $"Wisetrack: Overdue task - {task.Title}",
                $"Task '{task.Title}' (Project: {task.Project.Name}) is overdue.");
        }

        var inactiveTasks = await db.Tasks
            .Include(t => t.Project).ThenInclude(p => p.ProjectUsers)
            .Where(t => t.Status != "Completed" &&
                        !db.TaskUpdates.Any(u => u.TaskId == t.Id && u.CreatedAt >= inactiveSince))
            .Take(50)
            .ToListAsync();

        foreach (var task in inactiveTasks)
        {
            if (await WasRecentlyNotifiedAsync(db, "TaskInactive", "Task", task.Id)) continue;
            var userIds = task.Project.ProjectUsers.Select(pu => pu.UserId).Distinct().ToList();
            if (userIds.Count == 0) continue;
            await notifications.SendAsync(new CreateNotificationRequest
            {
                Title = $"No progress in 7 days: {task.Title}",
                Body = "Critical item has not progressed within the prior seven days.",
                Type = "TaskInactive",
                RelatedType = "Task",
                RelatedId = task.Id,
                UserIds = userIds
            });
        }

        var allocations = await db.BudgetAllocations
            .Include(a => a.Budget).ThenInclude(b => b.Project).ThenInclude(p => p.ProjectUsers)
            .Include(a => a.CostCenter)
            .ToListAsync();

        foreach (var group in allocations.GroupBy(a => new { a.BudgetId, a.CostCenterId }))
        {
            var allocation = group.First();
            var budget = allocation.Budget;
            var totalAllocated = group.Sum(a => a.AllocatedAmount);
            if (totalAllocated <= 0) continue;
            var expenses = await db.PurchaseCosts.Where(c => c.CostCenterId == allocation.CostCenterId)
                .Select(c => new { c.Amount, c.CreatedAt })
                .Concat(db.ActualCosts.Where(c => c.CostCenterId == allocation.CostCenterId)
                    .Select(c => new { c.Amount, c.CreatedAt }))
                .OrderBy(c => c.CreatedAt).ToListAsync();
            var spent = expenses.Sum(c => c.Amount);
            var rules = await db.EscalationRules.Where(r => r.IsActive &&
                (r.TriggerType == "BudgetRagAmber" || r.TriggerType == "BudgetRagRed")).ToListAsync();
            foreach (var rule in rules)
            {
                var threshold = rule.TriggerType == "BudgetRagRed" ? budget.RagRedPercent : budget.RagAmberPercent;
                var targetSpend = totalAllocated * threshold / 100m;
                decimal running = 0;
                DateTime? crossedAt = null;
                foreach (var expense in expenses)
                {
                    running += expense.Amount;
                    if (running >= targetSpend) { crossedAt = expense.CreatedAt; break; }
                }
                if (!crossedAt.HasValue || DateTime.UtcNow < crossedAt.Value.AddHours(rule.DelayHours)) continue;

                var notificationType = $"{rule.TriggerType}:{budget.Id}:{rule.Id}";
                if (await db.Notifications.AnyAsync(n => n.Type == notificationType && n.RelatedType == "CostCenter"
                    && n.RelatedId == allocation.CostCenterId)) continue;
                var userIds = rule.TargetRoleId.HasValue
                    ? await db.UserRoles.Where(ur => ur.RoleId == rule.TargetRoleId.Value && ur.User.IsActive && ur.User.IsInternal)
                        .Select(ur => ur.UserId).Distinct().ToListAsync()
                    : budget.Project.ProjectUsers.Select(pu => pu.UserId).Append(budget.Project.OwnerId ?? 0).Where(id => id > 0).Distinct().ToList();
                if (userIds.Count == 0) continue;
                var rag = rule.TriggerType == "BudgetRagRed" ? "Red" : "Amber";
                await notifications.SendAsync(new CreateNotificationRequest
                {
                    Title = $"Budget {rag}: {allocation.CostCenter.Name}",
                    Body = $"Cost center has consumed {spent / totalAllocated * 100m:F1}% of its allocated budget ({spent}/{totalAllocated}).",
                    Type = notificationType,
                    RelatedType = "CostCenter",
                    RelatedId = allocation.CostCenterId,
                    UserIds = userIds
                });
            }
        }
    }

    private static Task<bool> WasRecentlyNotifiedAsync(AppDbContext db, string type, string relatedType, long relatedId) =>
        db.Notifications.AnyAsync(n => n.Type == type && n.RelatedType == relatedType
            && n.RelatedId == relatedId && n.CreatedAt >= DateTime.UtcNow.AddHours(-24));
}
