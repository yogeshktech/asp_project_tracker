using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.DatabaseLayer.Notifications;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.BusinessLayer.Notifications;

public interface INotificationService
{
    Task<Notification> SendAsync(CreateNotificationRequest request);
    Task<List<NotificationRecipient>> GetInboxAsync(long userId);
    Task MarkReadAsync(long recipientId);
    Task<EscalationRule> CreateRuleAsync(CreateEscalationRuleRequest request);
    Task<List<EscalationRule>> GetRulesAsync();
}

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly IEmailService _email;
    private readonly AppDbContext _db;

    public NotificationService(INotificationRepository repository, IEmailService email, AppDbContext db)
    {
        _repository = repository;
        _email = email;
        _db = db;
    }

    public async Task<Notification> SendAsync(CreateNotificationRequest request)
    {
        var notification = await _repository.AddAsync(new Notification
        {
            Title = request.Title,
            Body = request.Body,
            Type = request.Type,
            RelatedType = request.RelatedType,
            RelatedId = request.RelatedId,
            CreatedAt = DateTime.UtcNow
        }, request.UserIds);

        if (request.SendEmail)
        {
            var emails = await _db.Users
                .Where(u => request.UserIds.Contains(u.Id) && u.IsInternal)
                .Select(u => u.Email)
                .ToListAsync();
            await _email.SendAsync(emails, request.Title, request.Body ?? request.Title);
        }

        return notification;
    }

    public Task<List<NotificationRecipient>> GetInboxAsync(long userId) => _repository.GetInboxAsync(userId);
    public Task MarkReadAsync(long recipientId) => _repository.MarkReadAsync(recipientId);

    public Task<EscalationRule> CreateRuleAsync(CreateEscalationRuleRequest request) =>
        _repository.AddRuleAsync(new EscalationRule
        {
            Name = request.Name,
            TriggerType = request.TriggerType,
            DelayHours = request.DelayHours,
            TargetRoleId = request.TargetRoleId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

    public Task<List<EscalationRule>> GetRulesAsync() => _repository.GetRulesAsync();
}
