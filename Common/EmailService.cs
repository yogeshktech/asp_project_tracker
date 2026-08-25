using System.Net;
using System.Net.Mail;

namespace project_tracker_madhu.Common;

public interface IEmailService
{
    Task SendAsync(IEnumerable<string> toEmails, string subject, string body);
}

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(IEnumerable<string> toEmails, string subject, string body)
    {
        var enabled = _config.GetValue("Email:Enabled", false);
        var recipients = toEmails.Where(e => !string.IsNullOrWhiteSpace(e)).Distinct().ToList();
        if (recipients.Count == 0) return;

        if (!enabled)
        {
            _logger.LogInformation("Email disabled. Would send '{Subject}' to {Recipients}", subject, string.Join(", ", recipients));
            return;
        }

        var host = _config["Email:SmtpHost"] ?? throw new InvalidOperationException("Email:SmtpHost missing");
        var port = _config.GetValue("Email:SmtpPort", 587);
        var from = _config["Email:From"] ?? "noreply@wisetrack.local";
        var user = _config["Email:Username"];
        var pass = _config["Email:Password"];

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = _config.GetValue("Email:UseSsl", true),
            Credentials = string.IsNullOrEmpty(user) ? CredentialCache.DefaultNetworkCredentials : new NetworkCredential(user, pass)
        };

        using var message = new MailMessage
        {
            From = new MailAddress(from),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };
        foreach (var to in recipients)
            message.To.Add(to);

        await client.SendMailAsync(message);
    }
}
