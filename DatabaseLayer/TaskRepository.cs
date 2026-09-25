using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Tasks;

public interface ITaskRepository
{
    Task<List<Milestone>> GetMilestonesAsync(long projectId);
    Task<Milestone> AddMilestoneAsync(Milestone milestone);
    Task<List<ProjectTask>> GetTasksAsync(long projectId);
    Task<ProjectTask?> GetTaskAsync(long id);
    Task<ProjectTask> AddTaskAsync(ProjectTask task);
    Task UpdateTaskAsync(ProjectTask task);
    Task<SubTask> AddSubTaskAsync(SubTask subTask);
    Task<SubTask?> GetSubTaskAsync(long id);
    Task DeleteTaskAsync(long id);
    Task DeleteSubTaskAsync(long id);
    Task UpdateSubTaskAsync(SubTask subTask);
    Task<TaskUpdate> AddUpdateAsync(TaskUpdate update);
    Task AddAttachmentAsync(TaskAttachment attachment);
    Task<TaskUpdate?> GetLastUpdateAsync(long taskId);
    Task<List<TaskUpdate>> GetUpdatesForDateAsync(long projectId, DateOnly date);
}

public class TaskRepository : ITaskRepository
{
    private readonly AppDbContext _db;
    public TaskRepository(AppDbContext db) => _db = db;

    public Task<List<Milestone>> GetMilestonesAsync(long projectId) =>
        _db.Milestones.Where(m => m.ProjectId == projectId).AsNoTracking().ToListAsync();

    public async Task<Milestone> AddMilestoneAsync(Milestone milestone)
    {
        _db.Milestones.Add(milestone);
        await _db.SaveChangesAsync();
        return milestone;
    }

    public Task<List<ProjectTask>> GetTasksAsync(long projectId) =>
        _db.Tasks.Include(t => t.SubTasks).Where(t => t.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<ProjectTask?> GetTaskAsync(long id) =>
        _db.Tasks.Include(t => t.SubTasks).FirstOrDefaultAsync(t => t.Id == id);

    public async Task<ProjectTask> AddTaskAsync(ProjectTask task)
    {
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return task;
    }

    public async Task UpdateTaskAsync(ProjectTask task)
    {
        _db.Tasks.Update(task);
        await _db.SaveChangesAsync();
    }

    public Task<SubTask?> GetSubTaskAsync(long id) =>
        _db.SubTasks.Include(s => s.Task).FirstOrDefaultAsync(s => s.Id == id);

    public async Task DeleteTaskAsync(long id)
    {
        var dependents = await _db.Tasks.Where(t => t.DependsOnTaskId == id).ToListAsync();
        foreach (var d in dependents)
            d.DependsOnTaskId = null;
        var subWaiters = await _db.SubTasks.Where(s => s.DependsOnTaskId == id).ToListAsync();
        foreach (var s in subWaiters)
            s.DependsOnTaskId = null;

        var task = await _db.Tasks.Include(t => t.SubTasks).FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new InvalidOperationException("Task not found");
        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteSubTaskAsync(long id)
    {
        if (!await _db.SubTasks.AnyAsync(s => s.Id == id))
            throw new InvalidOperationException("Sub-task not found");
        await DeleteSubTaskTreeAsync(id);
        await _db.SaveChangesAsync();
    }

    private async Task DeleteSubTaskTreeAsync(long id)
    {
        var children = await _db.SubTasks.Where(s => s.ParentSubTaskId == id).Select(s => s.Id).ToListAsync();
        foreach (var childId in children)
            await DeleteSubTaskTreeAsync(childId);
        var node = await _db.SubTasks.FindAsync(id);
        if (node == null) return;
        var taskWaiters = await _db.Tasks.Where(t => t.DependsOnSubTaskId == id).ToListAsync();
        foreach (var t in taskWaiters)
            t.DependsOnSubTaskId = null;
        var subWaiters = await _db.SubTasks.Where(s => s.DependsOnSubTaskId == id).ToListAsync();
        foreach (var s in subWaiters)
            s.DependsOnSubTaskId = null;
        _db.SubTasks.Remove(node);
    }

    public async Task<SubTask> AddSubTaskAsync(SubTask subTask)
    {
        _db.SubTasks.Add(subTask);
        await _db.SaveChangesAsync();
        return subTask;
    }

    public async Task UpdateSubTaskAsync(SubTask subTask)
    {
        _db.SubTasks.Update(subTask);
        await _db.SaveChangesAsync();
    }

    public async Task<TaskUpdate> AddUpdateAsync(TaskUpdate update)
    {
        _db.TaskUpdates.Add(update);
        await _db.SaveChangesAsync();
        return update;
    }

    public async Task AddAttachmentAsync(TaskAttachment attachment)
    {
        _db.TaskAttachments.Add(attachment);
        await _db.SaveChangesAsync();
    }

    public Task<TaskUpdate?> GetLastUpdateAsync(long taskId) =>
        _db.TaskUpdates.Where(u => u.TaskId == taskId).OrderByDescending(u => u.CreatedAt).FirstOrDefaultAsync();

    public Task<List<TaskUpdate>> GetUpdatesForDateAsync(long projectId, DateOnly date) =>
        _db.TaskUpdates.Include(u => u.Task)
            .Where(u => u.Task.ProjectId == projectId && u.UpdateDate == date)
            .AsNoTracking()
            .ToListAsync();
}
