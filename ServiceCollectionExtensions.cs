using project_tracker_madhu.BusinessLayer.Authentication;
using project_tracker_madhu.BusinessLayer.BoqModule;
using project_tracker_madhu.BusinessLayer.Budgets;
using project_tracker_madhu.BusinessLayer.Closure;
using project_tracker_madhu.BusinessLayer.Costs;
using project_tracker_madhu.BusinessLayer.Issues;
using project_tracker_madhu.BusinessLayer.Items;
using project_tracker_madhu.BusinessLayer.Notifications;
using project_tracker_madhu.BusinessLayer.Projects;
using project_tracker_madhu.BusinessLayer.Reports;
using project_tracker_madhu.BusinessLayer.Roles;
using project_tracker_madhu.BusinessLayer.Tasks;
using project_tracker_madhu.BusinessLayer.Users;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Authentication;
using project_tracker_madhu.DatabaseLayer.BoqModule;
using project_tracker_madhu.DatabaseLayer.Budgets;
using project_tracker_madhu.DatabaseLayer.Closure;
using project_tracker_madhu.DatabaseLayer.Costs;
using project_tracker_madhu.DatabaseLayer.Issues;
using project_tracker_madhu.DatabaseLayer.Items;
using project_tracker_madhu.DatabaseLayer.Notifications;
using project_tracker_madhu.DatabaseLayer.Projects;
using project_tracker_madhu.DatabaseLayer.Reports;
using project_tracker_madhu.DatabaseLayer.Roles;
using project_tracker_madhu.DatabaseLayer.Tasks;
using project_tracker_madhu.DatabaseLayer.Users;

namespace project_tracker_madhu;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddWisetrackModules(this IServiceCollection services)
    {
        services.AddSingleton<JwtTokenGenerator>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IEmailService, SmtpEmailService>();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddHostedService<EscalationBackgroundService>();

        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IAuthService, AuthService>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUserService, UserService>();

        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IRoleService, RoleService>();

        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<IProjectService, ProjectService>();

        services.AddScoped<IBudgetRepository, BudgetRepository>();
        services.AddScoped<IBudgetService, BudgetService>();

        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<IItemService, ItemService>();

        services.AddScoped<IBOQRepository, BOQRepository>();
        services.AddScoped<IBOQService, BOQService>();

        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<ITaskService, TaskService>();

        services.AddScoped<ICostRepository, CostRepository>();
        services.AddScoped<ICostService, CostService>();

        services.AddScoped<IIssueRepository, IssueRepository>();
        services.AddScoped<IIssueService, IssueService>();

        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<INotificationService, NotificationService>();

        services.AddScoped<IReportRepository, ReportRepository>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IDashboardService, DashboardService>();

        services.AddScoped<IClosureRepository, ClosureRepository>();
        services.AddScoped<IClosureService, ClosureService>();

        return services;
    }
}
