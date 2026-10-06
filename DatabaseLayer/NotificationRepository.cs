using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Notifications;

public interface INotificationRepository
{
    Task<Notification> AddAsync(Notification notification, IEnumerable<long> userIds);
    Task<(List<NotificationRecipient> Items, int TotalCount)> GetInboxAsync(long userId, int page, int pageSize);
    Task MarkReadAsync(long recipientId);
    Task<EscalationRule> AddRuleAsync(EscalationRule rule);
    Task<EscalationRule?> SetRuleActiveAsync(long ruleId, bool isActive);
    Task<List<EscalationRule>> GetRulesAsync();
}

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _db;
    public NotificationRepository(AppDbContext db) => _db = db;

    public async Task<Notification> AddAsync(Notification notification, IEnumerable<long> userIds)
    {
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();
        foreach (var userId in userIds.Distinct())
        {
            _db.NotificationRecipients.Add(new NotificationRecipient
            {
                NotificationId = notification.Id,
                UserId = userId
            });
        }
        await _db.SaveChangesAsync();
        return notification;
    }

    public async Task<(List<NotificationRecipient> Items, int TotalCount)> GetInboxAsync(long userId, int page, int pageSize)
    {
        var query = _db.NotificationRecipients.Where(r => r.UserId == userId);
        var totalCount = await query.CountAsync();
        var items = await query.Include(r => r.Notification)
            .OrderByDescending(r => r.Notification.CreatedAt)
            .ThenByDescending(r => r.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
        return (items, totalCount);
    }

    public async Task MarkReadAsync(long recipientId)
    {
        var rec = await _db.NotificationRecipients.FindAsync(recipientId);
        if (rec == null) return;
        rec.IsRead = true;
        rec.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<EscalationRule> AddRuleAsync(EscalationRule rule)
    {
        _db.EscalationRules.Add(rule);
        await _db.SaveChangesAsync();
        return rule;
    }

    public async Task<EscalationRule?> SetRuleActiveAsync(long ruleId, bool isActive)
    {
        var rule = await _db.EscalationRules.FirstOrDefaultAsync(r => r.Id == ruleId);
        if (rule == null) return null;
        rule.IsActive = isActive;
        await _db.SaveChangesAsync();
        return rule;
    }

    public Task<List<EscalationRule>> GetRulesAsync() => _db.EscalationRules.AsNoTracking().ToListAsync();
}
