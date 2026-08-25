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

        foreach (var alloc in allocations)
        {
            var spent = await db.PurchaseCosts.Where(c => c.CostCenterId == alloc.CostCenterId).SumAsync(c => c.Amount);
            spent += await db.ActualCosts.Where(c => c.CostCenterId == alloc.CostCenterId).SumAsync(c => c.Amount);
            if (alloc.AllocatedAmount <= 0) continue;
            var pct = spent / alloc.AllocatedAmount * 100;
            if (pct < 80) continue;

            var rag = pct >= 100 ? "Red" : "Amber";
            var userIds = alloc.Budget.Project.ProjectUsers.Select(pu => pu.UserId).Distinct().ToList();
            if (alloc.Budget.Project.OwnerId.HasValue) userIds.Add(alloc.Budget.Project.OwnerId.Value);
            userIds = userIds.Distinct().ToList();

            await notifications.SendAsync(new CreateNotificationRequest
            {
                Title = $"Budget {rag}: {alloc.CostCenter.Name}",
                Body = $"Cost center has consumed {pct:F1}% of allocated budget ({spent}/{alloc.AllocatedAmount}).",
                Type = "BudgetRag",
                RelatedType = "CostCenter",
                RelatedId = alloc.CostCenterId,
                UserIds = userIds
            });

            var emails = await db.Users.Where(u => userIds.Contains(u.Id) && u.IsInternal).Select(u => u.Email).ToListAsync();
            await email.SendAsync(emails, $"Wisetrack: Budget {rag} alert",
                $"Cost center '{alloc.CostCenter.Name}' on project '{alloc.Budget.Project.Name}' is at {pct:F1}% spend.");
        }
    }
}
