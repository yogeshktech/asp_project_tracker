using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Notifications;

public interface INotificationRepository
{
    Task<Notification> AddAsync(Notification notification, IEnumerable<long> userIds);
    Task<List<NotificationRecipient>> GetInboxAsync(long userId);
    Task MarkReadAsync(long recipientId);
    Task<EscalationRule> AddRuleAsync(EscalationRule rule);
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

    public Task<List<NotificationRecipient>> GetInboxAsync(long userId) =>
        _db.NotificationRecipients.Include(r => r.Notification)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.Notification.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

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

    public Task<List<EscalationRule>> GetRulesAsync() => _db.EscalationRules.AsNoTracking().ToListAsync();
}
