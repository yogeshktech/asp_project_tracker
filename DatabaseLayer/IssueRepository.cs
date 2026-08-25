using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Issues;

public interface IIssueRepository
{
    Task<List<Issue>> GetByProjectAsync(long projectId);
    Task<Issue?> GetAsync(long id);
    Task<Issue> AddAsync(Issue issue);
    Task UpdateAsync(Issue issue);
    Task AddCommentAsync(IssueComment comment);
    Task AddAttachmentAsync(IssueAttachment attachment);
    Task<List<IssuePriority>> GetPrioritiesAsync();
}

public class IssueRepository : IIssueRepository
{
    private readonly AppDbContext _db;
    public IssueRepository(AppDbContext db) => _db = db;

    public Task<List<Issue>> GetByProjectAsync(long projectId) =>
        _db.Issues.Include(i => i.Priority).Include(i => i.Comments)
            .Where(i => i.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<Issue?> GetAsync(long id) =>
        _db.Issues.Include(i => i.Priority).Include(i => i.Comments).Include(i => i.Attachments)
            .FirstOrDefaultAsync(i => i.Id == id);

    public async Task<Issue> AddAsync(Issue issue)
    {
        _db.Issues.Add(issue);
        await _db.SaveChangesAsync();
        return issue;
    }

    public async Task UpdateAsync(Issue issue)
    {
        _db.Issues.Update(issue);
        await _db.SaveChangesAsync();
    }

    public async Task AddCommentAsync(IssueComment comment)
    {
        _db.IssueComments.Add(comment);
        await _db.SaveChangesAsync();
    }

    public async Task AddAttachmentAsync(IssueAttachment attachment)
    {
        _db.IssueAttachments.Add(attachment);
        await _db.SaveChangesAsync();
    }

    public Task<List<IssuePriority>> GetPrioritiesAsync() =>
        _db.IssuePriorities.OrderBy(p => p.SortOrder).AsNoTracking().ToListAsync();
}
