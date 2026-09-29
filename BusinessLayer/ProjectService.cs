using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
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
    private readonly AppDbContext _db;

    public ProjectService(IProjectRepository repository, ITaskRepository tasks, IUserRepository users, IPermissionService permissions, IAuditService audit, AppDbContext db)
    {
        _repository = repository;
        _tasks = tasks;
        _users = users;
        _permissions = permissions;
        _audit = audit;
        _db = db;
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
        var list = new List<ProjectResponseDto>();
        foreach (var project in projects) list.Add(await MapForUserAsync(project, userId));
        await PopulateProjectBudgetsAsync(list, userId);
        AssignNumericLevels(list);
        return list;
    }

    public async Task<List<ProjectResponseDto>> GetHierarchyAsync(long userId, long resortId)
    {
        var allowed = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var all = (await _repository.GetHierarchyAsync(resortId)).Where(p => allowed.Contains(p.Id)).ToList();
        var mapped = new List<ProjectResponseDto>();
        foreach (var project in all) mapped.Add(await MapForUserAsync(project, userId));
        await PopulateProjectBudgetsAsync(mapped, userId);
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
        var dto = await MapForUserAsync(project, userId);
        await PopulateProjectBudgetsAsync(new List<ProjectResponseDto> { dto }, userId);
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
        entity.Code = string.IsNullOrWhiteSpace(dto.Code) ? await NextProjectCodeAsync(dto.ParentProjectId) : dto.Code.Trim();
        var project = await _repository.AddProjectAsync(entity);
        var initialTeam = (dto.TeamUserIds ?? new()).Append(userId).Append(entity.OwnerId.Value).Distinct();
        foreach (var memberId in initialTeam)
            await _repository.AssignUserAsync(new ProjectUser
            {
                ProjectId = project.Id,
                UserId = memberId,
                TeamRole = memberId == entity.OwnerId ? "Owner" : "Member"
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
        await _audit.LogAsync(userId, "Create", "Project", project.Id);
        return Map(await _repository.GetProjectAsync(project.Id) ?? project);
    }

    public async Task<ProjectResponseDto?> UpdateAsync(long userId, long id, UpdateProjectDto dto)
    {
        var project = await _repository.GetProjectAsync(id);
        if (project == null) return null;
        var fieldRights = await _permissions.GetProjectFieldPermissionsAsync(userId, id);
        var moduleUpdate = await _permissions.CanUpdateModuleAsync(userId, id, "Projects");
        var changedFields = ProjectFieldsChanged(project, dto);
        if (!moduleUpdate && (changedFields.Count == 0 || changedFields.Any(f => !fieldRights.TryGetValue(f, out var right) || !right.Equals("edit", StringComparison.OrdinalIgnoreCase)) || HasUnscopedProjectChanges(project, dto)))
            return null;
        foreach (var field in fieldRights.Where(x => x.Value.Equals("view", StringComparison.OrdinalIgnoreCase) || x.Value.Equals("hidden", StringComparison.OrdinalIgnoreCase)))
            if (ProjectFieldChanged(project, dto, field.Key))
                throw new UnauthorizedAccessException($"No edit permission on project field {field.Key}.");
        var previousEndDate = project.EndDate;
        ApplyDto(project, dto);
        if (previousEndDate != project.EndDate && project.EndDate.HasValue)
            await ShiftBackwardScheduleMilestonesAsync(id, previousEndDate, project.EndDate.Value);
        if (string.IsNullOrWhiteSpace(project.Code))
            project.Code = await NextProjectCodeAsync(project.ParentProjectId);
        project.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateProjectAsync(project);
        await _audit.LogAsync(userId, "Update", "Project", id);
        return await MapForUserAsync(project, userId);
    }

    private async Task ShiftBackwardScheduleMilestonesAsync(long projectId, DateOnly? previousProjectEndDate, DateOnly newCompletionDate)
    {
        const string marker = "Backward-scheduled from project completion (";
        const string legacyMarker = "Backward-scheduled from handover (PM-17)";
        var milestones = await _db.Milestones
            .Where(m => m.ProjectId == projectId && m.Description != null &&
                (m.Description.Contains(marker) || m.Description.Contains(legacyMarker)))
            .ToListAsync();
        foreach (var milestone in milestones)
        {
            var description = milestone.Description!;
            var markerStart = description.IndexOf(marker, StringComparison.Ordinal);
            DateOnly previousCompletionDate;
            if (markerStart >= 0)
            {
                var anchorStart = markerStart + marker.Length;
                var anchorEnd = description.IndexOf(')', anchorStart);
                if (anchorEnd < 0 || !DateOnly.TryParse(description[anchorStart..anchorEnd], out previousCompletionDate)) continue;
            }
            else
            {
                if (!previousProjectEndDate.HasValue || !description.Contains(legacyMarker, StringComparison.Ordinal)) continue;
                previousCompletionDate = previousProjectEndDate.Value;
            }
            var deltaDays = newCompletionDate.DayNumber - previousCompletionDate.DayNumber;
            if (deltaDays == 0) continue;
            if (milestone.StartDate.HasValue) milestone.StartDate = milestone.StartDate.Value.AddDays(deltaDays);
            if (milestone.DueDate.HasValue) milestone.DueDate = milestone.DueDate.Value.AddDays(deltaDays);
            milestone.Description = markerStart >= 0
                ? description[..(markerStart + marker.Length)] + $"{newCompletionDate:yyyy-MM-dd}" + description[description.IndexOf(')', markerStart + marker.Length)..]
                : description.Replace(legacyMarker, $"{marker}{newCompletionDate:yyyy-MM-dd}) (PM-17)", StringComparison.Ordinal);
        }
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
        if (!await _permissions.CanUpdateModuleAsync(userId, projectId, "Projects"))
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
        if (!await _permissions.CanUpdateModuleAsync(userId, projectId, "Projects"))
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
        var varianceType = request.VarianceType.Trim();
        if (varianceType is not ("Cost" or "Schedule"))
            throw new InvalidOperationException("Variance type must be Cost or Schedule.");
        var canEdit = varianceType == "Cost"
            ? await _permissions.CanEditModuleAsync(userId, request.ProjectId, "Costs")
            : await _permissions.CanEditModuleAsync(userId, request.ProjectId, "Tasks");
        if (!canEdit)
            throw new UnauthorizedAccessException("No permission.");
        if (string.IsNullOrWhiteSpace(request.Explanation))
            throw new InvalidOperationException("Variance explanation is required.");
        await _repository.AddVarianceExplanationAsync(new VarianceExplanation
        {
            ProjectId = request.ProjectId,
            VarianceType = varianceType,
            Explanation = request.Explanation.Trim(),
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<List<VarianceExplanation>> GetVarianceExplanationsAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId)) return new();
        var rows = await _repository.GetVarianceExplanationsAsync(projectId);
        var canViewCost = await _permissions.CanViewModuleAsync(userId, projectId, "Costs");
        var canViewSchedule = await _permissions.CanViewModuleAsync(userId, projectId, "Tasks");
        return rows.Where(v => v.VarianceType == "Cost" ? canViewCost : canViewSchedule).ToList();
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
        using var templateJson = System.Text.Json.JsonDocument.Parse(template.TemplateJson);
        if (templateJson.RootElement.ValueKind != System.Text.Json.JsonValueKind.Array)
            throw new InvalidOperationException("Template must contain a JSON array of milestones.");
        var milestones = new List<Milestone>();
        foreach (var item in templateJson.RootElement.EnumerateArray())
        {
            var name = item.ValueKind == System.Text.Json.JsonValueKind.String
                ? item.GetString()
                : item.TryGetProperty("name", out var nameProperty) ? nameProperty.GetString() : null;
            if (string.IsNullOrWhiteSpace(name)) continue;
            DateOnly? dueDate = null;
            if (item.ValueKind == System.Text.Json.JsonValueKind.Object
                && item.TryGetProperty("dueDate", out var dueProperty)
                && DateOnly.TryParse(dueProperty.GetString(), out var parsedDue)) dueDate = parsedDue;
            DateOnly? startDate = null;
            if (item.ValueKind == System.Text.Json.JsonValueKind.Object
                && item.TryGetProperty("startDate", out var startProperty)
                && DateOnly.TryParse(startProperty.GetString(), out var parsedStart)) startDate = parsedStart;
            if (request.AnchorDate.HasValue && item.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                if (item.TryGetProperty("startOffsetDays", out var startOffset) && startOffset.TryGetInt32(out var startDays))
                    startDate = request.AnchorDate.Value.AddDays(startDays);
                if (item.TryGetProperty("dueOffsetDays", out var dueOffset) && dueOffset.TryGetInt32(out var dueDays))
                    dueDate = request.AnchorDate.Value.AddDays(dueDays);
                else if (item.TryGetProperty("offsetDays", out var offset) && offset.TryGetInt32(out var legacyDays))
                    dueDate = request.AnchorDate.Value.AddDays(legacyDays);
            }
            var milestoneDescription = item.ValueKind == System.Text.Json.JsonValueKind.Object
                && item.TryGetProperty("description", out var descriptionProperty) ? descriptionProperty.GetString() : null;
            var hasRelativeDates = item.ValueKind == System.Text.Json.JsonValueKind.Object
                && (item.TryGetProperty("startOffsetDays", out _) || item.TryGetProperty("dueOffsetDays", out _) || item.TryGetProperty("offsetDays", out _));
            if (request.AnchorDate.HasValue && hasRelativeDates)
            {
                var scheduleTag = $"Backward-scheduled from project completion ({request.AnchorDate.Value:yyyy-MM-dd}) (PM-17)";
                milestoneDescription = string.IsNullOrWhiteSpace(milestoneDescription) ? scheduleTag : $"{milestoneDescription}\n{scheduleTag}";
            }
            milestones.Add(await _tasks.AddMilestoneAsync(new Milestone
            {
                ProjectId = request.ProjectId,
                Name = name,
                Description = milestoneDescription,
                StartDate = startDate,
                DueDate = dueDate,
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
        project.Code = dto.Code;
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

    private async Task<ProjectResponseDto> MapForUserAsync(Project p, long userId)
    {
        var dto = Map(p);
        var rights = await _permissions.GetProjectFieldPermissionsAsync(userId, p.Id);
        foreach (var field in rights.Where(x => x.Value.Equals("hidden", StringComparison.OrdinalIgnoreCase)))
            switch (field.Key.ToLowerInvariant())
            {
                case "clientname": dto.ClientName = null; break;
                case "sponsor": dto.Sponsor = null; break;
                case "currency": dto.Currency = ""; break;
                case "description": dto.Description = null; break;
                case "profilenotes": dto.ProfileNotes = null; break;
                case "ownerid": dto.OwnerId = null; dto.OwnerName = null; break;
                case "budget": dto.ProjectBudgetAmount = null; dto.ProjectBudgetCurrency = null; break;
                case "projectbudgetamount": dto.ProjectBudgetAmount = null; dto.ProjectBudgetCurrency = null; break;
                case "budgetcurrency": dto.ProjectBudgetAmount = null; dto.ProjectBudgetCurrency = null; break;
                case "projectbudgetcurrency": dto.ProjectBudgetAmount = null; dto.ProjectBudgetCurrency = null; break;
                case "startdate": dto.StartDate = null; break;
                case "enddate": dto.EndDate = null; break;
            }
        return dto;
    }

    private async Task PopulateProjectBudgetsAsync(List<ProjectResponseDto> projects, long userId)
    {
        if (projects.Count == 0) return;
        var canViewBudget = new HashSet<long>();
        foreach (var project in projects)
            if (await _permissions.CanViewModuleAsync(userId, project.Id, "Budgets")) canViewBudget.Add(project.Id);

        var parentIds = projects.Where(p => p.ParentProjectId.HasValue).Select(p => p.ParentProjectId.Value).Distinct();
        var permittedParents = new HashSet<long>();
        foreach (var parentId in parentIds)
            if (!canViewBudget.Contains(parentId) && await _permissions.CanViewModuleAsync(userId, parentId, "Budgets"))
                permittedParents.Add(parentId);
        var budgetProjectIds = canViewBudget.Concat(permittedParents).Distinct().ToList();
        if (budgetProjectIds.Count == 0) return;

        var budgets = await _db.Budgets.AsNoTracking().Where(b => budgetProjectIds.Contains(b.ProjectId))
            .Select(b => new { b.Id, b.ProjectId, b.ApprovedAmount, b.Currency }).ToListAsync();
        var budgetIds = budgets.Select(b => b.Id).ToList();
        var allocations = await _db.BudgetAllocations.AsNoTracking().Where(a => budgetIds.Contains(a.BudgetId))
            .Select(a => new { ParentId = a.Budget.ProjectId, CostProjectId = a.CostCenter.ProjectId, Amount = a.AllocatedAmount, Currency = a.Budget.Currency })
            .ToListAsync();

        foreach (var project in projects.Where(p => canViewBudget.Contains(p.Id)))
        {
            var ownBudgets = budgets.Where(b => b.ProjectId == project.Id).ToList();
            var parentAllocations = project.ParentProjectId.HasValue &&
                (canViewBudget.Contains(project.ParentProjectId.Value) || permittedParents.Contains(project.ParentProjectId.Value))
                ? allocations.Where(a => a.ParentId == project.ParentProjectId.Value && a.CostProjectId == project.Id).ToList()
                : allocations.Where(a => false).ToList();
            var allocatedFromParent = parentAllocations.Sum(a => a.Amount);
            if (allocatedFromParent > 0)
            {
                project.ProjectBudgetAmount = allocatedFromParent;
                project.ProjectBudgetCurrency = parentAllocations[0].Currency;
            }
            else if (ownBudgets.Count > 0)
            {
                project.ProjectBudgetAmount = ownBudgets.Sum(b => b.ApprovedAmount);
                project.ProjectBudgetCurrency = ownBudgets[0].Currency;
            }
        }
    }

    private static bool ProjectFieldChanged(Project p, UpdateProjectDto dto, string field) => field.ToLowerInvariant() switch
    {
        "clientname" => p.ClientName != dto.ClientName,
        "sponsor" => p.Sponsor != dto.Sponsor,
        "currency" => p.Currency != dto.Currency,
        "description" => p.Description != dto.Description,
        "profilenotes" => p.ProfileNotes != dto.ProfileNotes,
        "ownerid" => p.OwnerId != dto.OwnerId,
        "startdate" => p.StartDate != dto.StartDate,
        "enddate" => p.EndDate != dto.EndDate,
        _ => false
    };

    private static List<string> ProjectFieldsChanged(Project p, UpdateProjectDto dto) =>
        new[] { "clientName", "sponsor", "currency", "ownerId", "description", "profileNotes", "startDate", "endDate" }
            .Where(field => ProjectFieldChanged(p, dto, field)).ToList();

    private static bool HasUnscopedProjectChanges(Project p, UpdateProjectDto d) =>
        p.ResortId != d.ResortId || p.ParentProjectId != d.ParentProjectId || p.ProjectTypeId != d.ProjectTypeId ||
        p.PropertyId != d.PropertyId || p.AllowExternalView != d.AllowExternalView || p.Name != d.Name ||
        p.Code != d.Code || p.Status != d.Status;

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
