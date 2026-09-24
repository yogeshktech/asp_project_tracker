using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Projects;

public interface IProjectRepository
{
    Task<List<Resort>> GetResortsAsync();
    Task<Resort?> GetResortAsync(long id);
    Task<Resort> AddResortAsync(Resort resort);
    Task UpdateResortAsync(Resort resort);
    Task DeleteResortAsync(long id);
    Task<List<Property>> GetPropertiesAsync(long? resortId);
    Task<Property?> GetPropertyAsync(long id);
    Task<Property> AddPropertyAsync(Property property);
    Task UpdatePropertyAsync(Property property);
    Task DeletePropertyAsync(long id);
    Task<List<ProjectType>> GetProjectTypesAsync();
    Task<ProjectType?> GetProjectTypeAsync(long id);
    Task<ProjectType> AddProjectTypeAsync(ProjectType type);
    Task UpdateProjectTypeAsync(ProjectType type);
    Task DeleteProjectTypeAsync(long id);
    Task<List<Project>> GetProjectsAsync(IEnumerable<long>? allowedIds, long? resortId, long? parentId);
    Task<List<Project>> GetHierarchyAsync(long resortId);
    Task<Project?> GetProjectAsync(long id);
    Task<Project> AddProjectAsync(Project project);
    Task UpdateProjectAsync(Project project);
    Task DeleteProjectAsync(long id);
    Task<List<string?>> ListProjectCodesAsync();
    Task AssignUserAsync(ProjectUser projectUser);
    Task RemoveUserAsync(long projectId, long userId);
    Task<List<MilestoneTemplate>> GetTemplatesAsync();
    Task<MilestoneTemplate> AddTemplateAsync(MilestoneTemplate template);
    Task AddVarianceExplanationAsync(VarianceExplanation explanation);
    Task<List<VarianceExplanation>> GetVarianceExplanationsAsync(long projectId);
}

public class ProjectRepository : IProjectRepository
{
    private readonly AppDbContext _db;
    public ProjectRepository(AppDbContext db) => _db = db;

    public Task<List<Resort>> GetResortsAsync() => _db.Resorts.AsNoTracking().OrderBy(r => r.Name).ToListAsync();
    public Task<Resort?> GetResortAsync(long id) => _db.Resorts.FirstOrDefaultAsync(r => r.Id == id);

    public async Task<Resort> AddResortAsync(Resort resort)
    {
        _db.Resorts.Add(resort);
        await _db.SaveChangesAsync();
        return resort;
    }

    public async Task UpdateResortAsync(Resort resort)
    {
        _db.Resorts.Update(resort);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteResortAsync(long id)
    {
        var resort = await _db.Resorts.FindAsync(id) ?? throw new InvalidOperationException("Resort not found");
        if (await _db.Projects.AnyAsync(p => p.ResortId == id))
            throw new InvalidOperationException("Cannot delete resort with projects.");
        _db.Resorts.Remove(resort);
        await _db.SaveChangesAsync();
    }

    public Task<List<Property>> GetPropertiesAsync(long? resortId)
    {
        var q = _db.Properties.Include(p => p.Resort).AsNoTracking();
        if (resortId.HasValue) q = q.Where(p => p.ResortId == resortId);
        return q.OrderBy(p => p.Name).ToListAsync();
    }

    public Task<Property?> GetPropertyAsync(long id) => _db.Properties.Include(p => p.Resort).FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Property> AddPropertyAsync(Property property)
    {
        _db.Properties.Add(property);
        await _db.SaveChangesAsync();
        return property;
    }

    public async Task UpdatePropertyAsync(Property property)
    {
        _db.Properties.Update(property);
        await _db.SaveChangesAsync();
    }

    public async Task DeletePropertyAsync(long id)
    {
        var property = await _db.Properties.FindAsync(id) ?? throw new InvalidOperationException("Property not found");
        _db.Properties.Remove(property);
        await _db.SaveChangesAsync();
    }

    public Task<List<ProjectType>> GetProjectTypesAsync() =>
        _db.ProjectTypes.AsNoTracking().OrderBy(t => t.Name).ToListAsync();

    public Task<ProjectType?> GetProjectTypeAsync(long id) => _db.ProjectTypes.FirstOrDefaultAsync(t => t.Id == id);

    public async Task<ProjectType> AddProjectTypeAsync(ProjectType type)
    {
        _db.ProjectTypes.Add(type);
        await _db.SaveChangesAsync();
        return type;
    }

    public async Task UpdateProjectTypeAsync(ProjectType type)
    {
        _db.ProjectTypes.Update(type);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteProjectTypeAsync(long id)
    {
        var type = await _db.ProjectTypes.FindAsync(id) ?? throw new InvalidOperationException("Project type not found");
        _db.ProjectTypes.Remove(type);
        await _db.SaveChangesAsync();
    }

    public Task<List<Project>> GetProjectsAsync(IEnumerable<long>? allowedIds, long? resortId, long? parentId)
    {
        var query = _db.Projects
            .Include(p => p.Resort)
            .Include(p => p.Owner)
            .Include(p => p.ProjectType)
            .Include(p => p.Property)
            .AsNoTracking();

        if (allowedIds != null)
        {
            var ids = allowedIds.ToList();
            query = query.Where(p => ids.Contains(p.Id));
        }
        if (resortId.HasValue) query = query.Where(p => p.ResortId == resortId);
        if (parentId.HasValue) query = query.Where(p => p.ParentProjectId == parentId);

        return query.OrderBy(p => p.Name).ToListAsync();
    }

    public Task<List<Project>> GetHierarchyAsync(long resortId) =>
        _db.Projects
            .Include(p => p.Resort)
            .Include(p => p.Owner)
            .Include(p => p.ProjectType)
            .Include(p => p.Property)
            .Where(p => p.ResortId == resortId)
            .AsNoTracking()
            .ToListAsync();

    public Task<Project?> GetProjectAsync(long id) =>
        _db.Projects.Include(p => p.Resort).Include(p => p.Owner)
            .Include(p => p.ProjectType).Include(p => p.Property)
            .Include(p => p.ProjectUsers).ThenInclude(pu => pu.User)
            .FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Project> AddProjectAsync(Project project)
    {
        _db.Projects.Add(project);
        await _db.SaveChangesAsync();
        return project;
    }

    public async Task UpdateProjectAsync(Project project)
    {
        _db.Projects.Update(project);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteProjectAsync(long id)
    {
        if (await _db.Projects.AnyAsync(p => p.ParentProjectId == id))
            throw new InvalidOperationException("Delete sub-projects first.");
        var project = await _db.Projects.FindAsync(id) ?? throw new InvalidOperationException("Project not found");
        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
    }

    public Task<List<string?>> ListProjectCodesAsync() =>
        _db.Projects.AsNoTracking().Select(p => p.Code).ToListAsync();

    public async Task AssignUserAsync(ProjectUser projectUser)
    {
        var exists = await _db.ProjectUsers.FindAsync(projectUser.ProjectId, projectUser.UserId);
        if (exists == null) _db.ProjectUsers.Add(projectUser);
        else exists.TeamRole = projectUser.TeamRole;
        await _db.SaveChangesAsync();
    }

    public async Task RemoveUserAsync(long projectId, long userId)
    {
        var row = await _db.ProjectUsers.FindAsync(projectId, userId);
        if (row != null)
        {
            _db.ProjectUsers.Remove(row);
            await _db.SaveChangesAsync();
        }
    }

    public Task<List<MilestoneTemplate>> GetTemplatesAsync() => _db.MilestoneTemplates.AsNoTracking().ToListAsync();

    public async Task<MilestoneTemplate> AddTemplateAsync(MilestoneTemplate template)
    {
        _db.MilestoneTemplates.Add(template);
        await _db.SaveChangesAsync();
        return template;
    }

    public async Task AddVarianceExplanationAsync(VarianceExplanation explanation)
    {
        _db.VarianceExplanations.Add(explanation);
        await _db.SaveChangesAsync();
    }

    public Task<List<VarianceExplanation>> GetVarianceExplanationsAsync(long projectId) =>
        _db.VarianceExplanations.Where(v => v.ProjectId == projectId).AsNoTracking().ToListAsync();
}
