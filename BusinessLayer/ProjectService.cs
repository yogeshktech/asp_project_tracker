using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Projects;
using project_tracker_madhu.DatabaseLayer.Tasks;
using project_tracker_madhu.DatabaseLayer.Users;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Projects;

public interface IProjectService
{
    Task<List<Resort>> GetResortsAsync();
    Task<Resort?> GetResortAsync(long id);
    Task<Resort> CreateResortAsync(CreateResortRequest request, long? userId);
    Task<Resort?> UpdateResortAsync(long id, UpdateResortRequest request, long? userId);
    Task DeleteResortAsync(long id, long? userId);
    Task<List<Property>> GetPropertiesAsync(long? resortId);
    Task<Property> CreatePropertyAsync(CreatePropertyRequest request, long? userId);
    Task<Property?> UpdatePropertyAsync(long id, UpdatePropertyRequest request, long? userId);
    Task DeletePropertyAsync(long id, long? userId);
    Task<List<ProjectType>> GetProjectTypesAsync();
    Task<ProjectType> CreateProjectTypeAsync(CreateProjectTypeRequest request, long? userId);
    Task<ProjectType?> UpdateProjectTypeAsync(long id, UpdateProjectTypeRequest request, long? userId);
    Task DeleteProjectTypeAsync(long id, long? userId);
    Task<List<ProjectResponseDto>> GetProjectsForUserAsync(long userId, long? resortId, long? parentId);
    Task<List<ProjectResponseDto>> GetHierarchyAsync(long userId, long resortId);
    Task<ProjectResponseDto?> GetProjectAsync(long userId, long id);
    Task<ProjectResponseDto> CreateAsync(long userId, CreateProjectDto dto);
    Task<ProjectResponseDto?> UpdateAsync(long userId, long id, UpdateProjectDto dto);
    Task DeleteAsync(long userId, long id);
    Task AssignUserAsync(long userId, long projectId, AssignProjectUserRequest request);
    Task RemoveUserAsync(long userId, long projectId, long memberUserId);
    Task<List<ProjectTeamMemberDto>> GetTeamAsync(long userId, long projectId);
    Task AddVarianceExplanationAsync(long userId, VarianceExplanationRequest request);
    Task<List<VarianceExplanation>> GetVarianceExplanationsAsync(long userId, long projectId);
    Task<MilestoneTemplate> SaveTemplateAsync(MilestoneTemplateRequest request);
    Task<List<MilestoneTemplate>> GetTemplatesAsync();
    Task<List<Milestone>> CloneTemplateAsync(long userId, CloneTemplateRequest request);
}

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _repository;
    private readonly ITaskRepository _tasks;
    private readonly IUserRepository _users;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;

    public ProjectService(IProjectRepository repository, ITaskRepository tasks, IUserRepository users, IPermissionService permissions, IAuditService audit)
    {
        _repository = repository;
        _tasks = tasks;
        _users = users;
        _permissions = permissions;
        _audit = audit;
    }

    public Task<List<Resort>> GetResortsAsync() => _repository.GetResortsAsync();
    public Task<Resort?> GetResortAsync(long id) => _repository.GetResortAsync(id);

    public async Task<Resort> CreateResortAsync(CreateResortRequest request, long? userId)
    {
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, 0, "Resorts", "edit");
        var code = EntityCodes.Next((await _repository.GetResortsAsync()).Select(r => r.Code), EntityCodes.Resort);
        var resort = await _repository.AddResortAsync(new Resort
        {
            Name = request.Name,
            Location = request.Location,
            Code = code,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Resort", resort.Id);
        return resort;
    }

    public async Task<Resort?> UpdateResortAsync(long id, UpdateResortRequest request, long? userId)
    {
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, 0, "Resorts", "update");
        var resort = await _repository.GetResortAsync(id);
        if (resort == null) return null;
        resort.Name = request.Name;
        resort.Location = request.Location;
        if (string.IsNullOrWhiteSpace(resort.Code))
            resort.Code = EntityCodes.Next((await _repository.GetResortsAsync()).Select(r => r.Code), EntityCodes.Resort);
        resort.IsActive = request.IsActive;
        resort.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateResortAsync(resort);
        await _audit.LogAsync(userId, "Update", "Resort", id);
        return resort;
    }

    public async Task DeleteResortAsync(long id, long? userId)
    {
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, 0, "Resorts", "delete");
        await _repository.DeleteResortAsync(id);
        await _audit.LogAsync(userId, "Delete", "Resort", id);
    }

    public Task<List<Property>> GetPropertiesAsync(long? resortId) => _repository.GetPropertiesAsync(resortId);

    public async Task<Property> CreatePropertyAsync(CreatePropertyRequest request, long? userId)
    {
        var code = EntityCodes.Next((await _repository.GetPropertiesAsync(null)).Select(p => p.Code), EntityCodes.Property);
        var property = await _repository.AddPropertyAsync(new Property
        {
            ResortId = request.ResortId,
            Name = request.Name,
            Code = code,
            Description = request.Description,
            Location = request.Location,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Property", property.Id);
        return property;
    }

    public async Task<Property?> UpdatePropertyAsync(long id, UpdatePropertyRequest request, long? userId)
    {
        var property = await _repository.GetPropertyAsync(id);
        if (property == null) return null;
        property.ResortId = request.ResortId;
        property.Name = request.Name;
        if (string.IsNullOrWhiteSpace(property.Code))
            property.Code = EntityCodes.Next((await _repository.GetPropertiesAsync(null)).Select(p => p.Code), EntityCodes.Property);
        property.Description = request.Description;
        property.Location = request.Location;
        property.IsActive = request.IsActive;
        property.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdatePropertyAsync(property);
        await _audit.LogAsync(userId, "Update", "Property", id);
        return property;
    }

    public async Task DeletePropertyAsync(long id, long? userId)
    {
        await _repository.DeletePropertyAsync(id);
        await _audit.LogAsync(userId, "Delete", "Property", id);
    }

    public Task<List<ProjectType>> GetProjectTypesAsync() => _repository.GetProjectTypesAsync();

    public async Task<ProjectType> CreateProjectTypeAsync(CreateProjectTypeRequest request, long? userId)
    {
        var type = await _repository.AddProjectTypeAsync(new ProjectType
        {
            Name = request.Name,
            Description = request.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "ProjectType", type.Id);
        return type;
    }

    public async Task<ProjectType?> UpdateProjectTypeAsync(long id, UpdateProjectTypeRequest request, long? userId)
    {
        var type = await _repository.GetProjectTypeAsync(id);
        if (type == null) return null;
        type.Name = request.Name;
        type.Description = request.Description;
        type.IsActive = request.IsActive;
        await _repository.UpdateProjectTypeAsync(type);
        await _audit.LogAsync(userId, "Update", "ProjectType", id);
        return type;
    }

    public async Task DeleteProjectTypeAsync(long id, long? userId)
    {
        await _repository.DeleteProjectTypeAsync(id);
        await _audit.LogAsync(userId, "Delete", "ProjectType", id);
    }

    public async Task<List<ProjectResponseDto>> GetProjectsForUserAsync(long userId, long? resortId, long? parentId)
    {
        var allowed = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var projects = await _repository.GetProjectsAsync(allowed, resortId, parentId);
        var list = projects.Select(Map).ToList();
        AssignNumericLevels(list);
        return list;
    }

    public async Task<List<ProjectResponseDto>> GetHierarchyAsync(long userId, long resortId)
    {
        var allowed = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var all = (await _repository.GetHierarchyAsync(resortId)).Where(p => allowed.Contains(p.Id)).ToList();
        var mapped = all.Select(Map).ToList();
        AssignNumericLevels(mapped);
        var byParent = mapped.GroupBy(p => p.ParentProjectId ?? 0L).ToDictionary(g => g.Key, g => g.ToList());

        List<ProjectResponseDto> AttachChildren(long parentKey)
        {
            if (!byParent.TryGetValue(parentKey, out var children)) return new();
            foreach (var child in children)
                child.SubProjects = AttachChildren(child.Id);
            return children;
        }

        return AttachChildren(0);
    }

    public async Task<ProjectResponseDto?> GetProjectAsync(long userId, long id)
    {
        if (!await _permissions.CanViewProjectAsync(userId, id)) return null;
        var project = await _repository.GetProjectAsync(id);
        if (project == null) return null;
        var dto = Map(project);
        // Compute depth by walking parents
        var depth = 1;
        var cursor = project.ParentProjectId;
        var guard = 0;
        while (cursor.HasValue && guard++ < 50)
        {
            depth++;
            var parent = await _repository.GetProjectAsync(cursor.Value);
            cursor = parent?.ParentProjectId;
        }
        dto.Level = depth.ToString();
        return dto;
    }

    public async Task<ProjectResponseDto> CreateAsync(long userId, CreateProjectDto dto)
    {
        if (!await _permissions.IsAdminAsync(userId) && dto.ParentProjectId.HasValue &&
            !await _permissions.CanEditModuleAsync(userId, dto.ParentProjectId.Value, "Projects"))
            throw new UnauthorizedAccessException("No edit permission on parent project.");

        var entity = FromDto(dto);
        entity.OwnerId ??= userId;
        entity.Code = await NextProjectCodeAsync(dto.ParentProjectId);
        var project = await _repository.AddProjectAsync(entity);
        await _repository.AssignUserAsync(new ProjectUser
        {
            ProjectId = project.Id,
            UserId = userId,
            TeamRole = "Member"
        });
        if (!await _permissions.IsAdminAsync(userId))
        {
            foreach (var module in PermissionService.ProjectModules)
            {
                await _users.SetProjectPermissionAsync(new ProjectPermission
                {
                    ProjectId = project.Id,
                    UserId = userId,
                    Module = module,
                    CanView = true,
                    CanEdit = true,
                    CanUpdate = true,
                    CanDelete = true
                });
            }
        }
        if (dto.OwnerId.HasValue && dto.OwnerId != userId)
        {
            await _repository.AssignUserAsync(new ProjectUser
            {
                ProjectId = project.Id,
                UserId = dto.OwnerId.Value,
                TeamRole = "Member"
            });
        }
        await _audit.LogAsync(userId, "Create", "Project", project.Id);
        return Map(await _repository.GetProjectAsync(project.Id) ?? project);
    }

    public async Task<ProjectResponseDto?> UpdateAsync(long userId, long id, UpdateProjectDto dto)
    {
        if (!await _permissions.CanUpdateModuleAsync(userId, id, "Projects")) return null;
        var project = await _repository.GetProjectAsync(id);
        if (project == null) return null;
        ApplyDto(project, dto);
        if (string.IsNullOrWhiteSpace(project.Code))
            project.Code = await NextProjectCodeAsync(project.ParentProjectId);
        project.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateProjectAsync(project);
        await _audit.LogAsync(userId, "Update", "Project", id);
        return Map(project);
    }

    public async Task DeleteAsync(long userId, long id)
    {
        if (!await _permissions.CanDeleteModuleAsync(userId, id, "Projects"))
            throw new UnauthorizedAccessException("No permission to delete project.");
        await _repository.DeleteProjectAsync(id);
        await _audit.LogAsync(userId, "Delete", "Project", id);
    }

    public async Task AssignUserAsync(long userId, long projectId, AssignProjectUserRequest request)
    {
        if (!await _permissions.CanEditModuleAsync(userId, projectId, "Users"))
            throw new UnauthorizedAccessException("No permission to assign users.");
        await _repository.AssignUserAsync(new ProjectUser
        {
            ProjectId = projectId,
            UserId = request.UserId,
            TeamRole = request.TeamRole
        });
        await _audit.LogAsync(userId, "AssignUser", "Project", projectId, $"User {request.UserId}");
    }

    public async Task RemoveUserAsync(long userId, long projectId, long memberUserId)
    {
        if (!await _permissions.CanEditModuleAsync(userId, projectId, "Users"))
            throw new UnauthorizedAccessException("No permission.");
        await _repository.RemoveUserAsync(projectId, memberUserId);
        await _audit.LogAsync(userId, "RemoveUser", "Project", projectId, $"User {memberUserId}");
    }

    public async Task<List<ProjectTeamMemberDto>> GetTeamAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId))
            throw new UnauthorizedAccessException("No permission to view project team.");
        var project = await _repository.GetProjectAsync(projectId)
            ?? throw new InvalidOperationException("Project not found");
        return project.ProjectUsers
            .Where(pu => pu.User == null || pu.User.IsActive)
            .Select(pu => new ProjectTeamMemberDto
            {
                UserId = pu.UserId,
                FullName = pu.User?.FullName ?? $"User {pu.UserId}",
                Email = pu.User?.Email ?? "",
                TeamRole = pu.TeamRole
            })
            .OrderBy(m => m.FullName)
            .ToList();
    }

    public async Task AddVarianceExplanationAsync(long userId, VarianceExplanationRequest request)
    {
        if (!await _permissions.CanEditModuleAsync(userId, request.ProjectId, "Costs"))
            throw new UnauthorizedAccessException("No permission.");
        await _repository.AddVarianceExplanationAsync(new VarianceExplanation
        {
            ProjectId = request.ProjectId,
            VarianceType = request.VarianceType,
            Explanation = request.Explanation,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<List<VarianceExplanation>> GetVarianceExplanationsAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId)) return new();
        return await _repository.GetVarianceExplanationsAsync(projectId);
    }

    public Task<MilestoneTemplate> SaveTemplateAsync(MilestoneTemplateRequest request) =>
        _repository.AddTemplateAsync(new MilestoneTemplate
        {
            Name = request.Name,
            ProjectTypeId = request.ProjectTypeId,
            TemplateJson = request.TemplateJson,
            CreatedAt = DateTime.UtcNow
        });

    public Task<List<MilestoneTemplate>> GetTemplatesAsync() => _repository.GetTemplatesAsync();

    public async Task<List<Milestone>> CloneTemplateAsync(long userId, CloneTemplateRequest request)
    {
        if (!await _permissions.CanEditModuleAsync(userId, request.ProjectId, "Tasks"))
            throw new UnauthorizedAccessException("No permission.");
        var templates = await _repository.GetTemplatesAsync();
        var template = templates.FirstOrDefault(t => t.Id == request.TemplateId)
            ?? throw new InvalidOperationException("Template not found");
        // Simple JSON array of milestone names expected: ["Design","Procurement",...]
        var names = System.Text.Json.JsonSerializer.Deserialize<List<string>>(template.TemplateJson) ?? new();
        var milestones = new List<Milestone>();
        foreach (var name in names)
        {
            milestones.Add(await _tasks.AddMilestoneAsync(new Milestone
            {
                ProjectId = request.ProjectId,
                Name = name,
                Status = "NotStarted",
                CreatedAt = DateTime.UtcNow
            }));
        }
        await _audit.LogAsync(userId, "CloneTemplate", "MilestoneTemplate", request.TemplateId);
        return milestones;
    }

    private async Task<string> NextProjectCodeAsync(long? parentProjectId)
    {
        var codes = await _repository.ListProjectCodesAsync();
        if (parentProjectId.HasValue)
        {
            var parent = await _repository.GetProjectAsync(parentProjectId.Value);
            var parentCode = parent?.Code;
            if (!string.IsNullOrWhiteSpace(parentCode))
                return EntityCodes.NextChild(parentCode, codes);
        }
        return EntityCodes.Next(codes, EntityCodes.Project);
    }

    private static Project FromDto(CreateProjectDto dto) => new()
    {
        ResortId = dto.ResortId,
        ParentProjectId = dto.ParentProjectId,
        OwnerId = dto.OwnerId,
        ProjectTypeId = dto.ProjectTypeId,
        PropertyId = dto.PropertyId,
        ClientName = dto.ClientName,
        Sponsor = dto.Sponsor,
        Currency = dto.Currency,
        AllowExternalView = dto.AllowExternalView,
        Name = dto.Name,
        Code = null,
        Description = dto.Description,
        Status = dto.Status,
        StartDate = dto.StartDate,
        EndDate = dto.EndDate,
        ProfileNotes = dto.ProfileNotes,
        CreatedAt = DateTime.UtcNow
    };

    private static void ApplyDto(Project project, CreateProjectDto dto)
    {
        project.ResortId = dto.ResortId;
        project.ParentProjectId = dto.ParentProjectId;
        project.OwnerId = dto.OwnerId;
        project.ProjectTypeId = dto.ProjectTypeId;
        project.PropertyId = dto.PropertyId;
        project.ClientName = dto.ClientName;
        project.Sponsor = dto.Sponsor;
        project.Currency = dto.Currency;
        project.AllowExternalView = dto.AllowExternalView;
        project.Name = dto.Name;
        project.Description = dto.Description;
        project.Status = dto.Status;
        project.StartDate = dto.StartDate;
        project.EndDate = dto.EndDate;
        project.ProfileNotes = dto.ProfileNotes;
    }

    private static ProjectResponseDto Map(Project p) => new()
    {
        Id = p.Id,
        ResortId = p.ResortId,
        ResortName = p.Resort?.Name,
        ParentProjectId = p.ParentProjectId,
        OwnerId = p.OwnerId,
        OwnerName = p.Owner?.FullName,
        ProjectTypeId = p.ProjectTypeId,
        ProjectTypeName = p.ProjectType?.Name,
        PropertyId = p.PropertyId,
        PropertyName = p.Property?.Name,
        ClientName = p.ClientName,
        Sponsor = p.Sponsor,
        Currency = p.Currency,
        AllowExternalView = p.AllowExternalView,
        Name = p.Name,
        Code = p.Code,
        Description = p.Description,
        Status = p.Status,
        StartDate = p.StartDate,
        EndDate = p.EndDate,
        ProfileNotes = p.ProfileNotes,
        // Numeric depth string; AssignNumericLevels overwrites when full list is available
        Level = p.ParentProjectId == null ? "1" : "2"
    };

    private static void AssignNumericLevels(List<ProjectResponseDto> list)
    {
        var byId = list.ToDictionary(p => p.Id);
        int Depth(ProjectResponseDto p, HashSet<long> seen)
        {
            if (!p.ParentProjectId.HasValue) return 1;
            if (!seen.Add(p.ParentProjectId.Value)) return 1;
            if (!byId.TryGetValue(p.ParentProjectId.Value, out var parent)) return 2;
            return Depth(parent, seen) + 1;
        }

        foreach (var p in list)
            p.Level = Depth(p, new HashSet<long>()).ToString();
    }
}
