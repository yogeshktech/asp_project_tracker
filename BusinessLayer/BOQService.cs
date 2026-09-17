using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.BoqModule;
using project_tracker_madhu.DatabaseLayer.Items;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.BoqModule;

public interface IBOQService
{
    Task<List<Boq>> GetByProjectAsync(long projectId);
    Task<Boq?> GetAsync(long id);
    Task<BOQValidationResultDto> ImportAsync(BOQImportDto dto, long? userId);
    Task<Boq> CreateFromMasterAsync(long projectId, List<long> itemIds, long? userId);
}

public class BOQService : IBOQService
{
    private readonly IBOQRepository _repository;
    private readonly IItemRepository _items;
    private readonly IAuditService _audit;

    public BOQService(IBOQRepository repository, IItemRepository items, IAuditService audit)
    {
        _repository = repository;
        _items = items;
        _audit = audit;
    }

    public Task<List<Boq>> GetByProjectAsync(long projectId) => _repository.GetByProjectAsync(projectId);
    public Task<Boq?> GetAsync(long id) => _repository.GetAsync(id);

    public async Task<BOQValidationResultDto> ImportAsync(BOQImportDto dto, long? userId)
    {
        var result = new BOQValidationResultDto { TotalRows = dto.Lines.Count };
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < dto.Lines.Count; i++)
        {
            var row = dto.Lines[i];
            var rowNo = row.LineNo ?? i + 1;

            if (string.IsNullOrWhiteSpace(row.Description) && !row.ItemId.HasValue && string.IsNullOrWhiteSpace(row.ItemCode))
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "Description", Message = "Description or item reference required." });

            if (row.Quantity <= 0)
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "Quantity", Message = "Quantity must be greater than zero." });

            if (row.UnitPrice < 0)
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "UnitPrice", Message = "Unit price cannot be negative." });

            if (!string.IsNullOrWhiteSpace(row.ItemCode))
            {
                if (!seenCodes.Add(row.ItemCode))
                    result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "ItemCode", Message = "Duplicate item code in import." });
            }
        }

        result.ErrorCount = result.Errors.Count;
        result.IsValid = result.ErrorCount == 0;

        if (!dto.Commit || !result.IsValid)
            return result;

        var boq = await _repository.AddAsync(new Boq
        {
            ProjectId = dto.ProjectId,
            Title = dto.Title,
            Status = "Imported",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });

        var version = await _repository.AddVersionAsync(new BoqVersion
        {
            BoqId = boq.Id,
            VersionNo = 1,
            Remarks = dto.Remarks,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });

        var lines = new List<BoqItem>();
        foreach (var l in dto.Lines)
        {
            long? itemId = l.ItemId;
            if (!itemId.HasValue && !string.IsNullOrWhiteSpace(l.ItemCode))
            {
                var item = await _items.GetByCodeAsync(l.ItemCode);
                itemId = item?.Id;
            }

            lines.Add(new BoqItem
            {
                BoqVersionId = version.Id,
                ItemId = itemId,
                LineNo = l.LineNo,
                Description = l.Description,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                Amount = l.Quantity * l.UnitPrice,
                Remarks = CombineBoqRemarks(l)
            });
        }

        await _repository.AddItemsAsync(lines);
        await _audit.LogAsync(userId, "Import", "BOQ", boq.Id, $"{lines.Count} lines");
        result.CommittedBoq = await _repository.GetAsync(boq.Id);
        return result;
    }

    public async Task<Boq> CreateFromMasterAsync(long projectId, List<long> itemIds, long? userId)
    {
        var boq = await _repository.AddAsync(new Boq
        {
            ProjectId = projectId,
            Title = "BOQ from Item Master",
            Status = "Draft",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });

        var version = await _repository.AddVersionAsync(new BoqVersion
        {
            BoqId = boq.Id,
            VersionNo = 1,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });

        var lines = new List<BoqItem>();
        var lineNo = 1;
        foreach (var itemId in itemIds.Distinct())
        {
            var item = await _items.GetAsync(itemId);
            if (item == null) continue;
            lines.Add(new BoqItem
            {
                BoqVersionId = version.Id,
                ItemId = item.Id,
                LineNo = lineNo++,
                Description = item.Description ?? item.Name,
                Quantity = 1,
                UnitPrice = item.UnitPrice,
                Amount = item.UnitPrice
            });
        }

        await _repository.AddItemsAsync(lines);
        return await _repository.GetAsync(boq.Id) ?? boq;
    }

    private static string? CombineBoqRemarks(BOQImportLineDto line)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(line.Remarks)) parts.Add(line.Remarks);
        if (!string.IsNullOrWhiteSpace(line.Brand)) parts.Add($"Brand: {line.Brand}");
        if (!string.IsNullOrWhiteSpace(line.Unit)) parts.Add($"Unit: {line.Unit}");
        if (!string.IsNullOrWhiteSpace(line.AttachmentPath)) parts.Add(line.AttachmentPath);
        return parts.Count == 0 ? null : string.Join(" | ", parts);
    }
}
