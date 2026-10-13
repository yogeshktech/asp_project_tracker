using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.BoqModule;
using project_tracker_madhu.DatabaseLayer.Items;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;
using project_tracker_madhu.DatabaseLayer.Context;
using Microsoft.EntityFrameworkCore;

namespace project_tracker_madhu.BusinessLayer.BoqModule;

public interface IBOQService
{
    Task<List<Boq>> GetByProjectAsync(long userId, long projectId);
    Task<Boq?> GetAsync(long id);
    Task<Boq?> UpdateAsync(long id, UpdateBoqRequest request, long userId);
    Task<BOQValidationResultDto> ImportAsync(BOQImportDto dto, long? userId);
    Task<Boq> CreateFromMasterAsync(long projectId, List<BoqFromMasterLineRequest> lines, long? userId);
    Task<BoqVersion> CreateRevisionAsync(long boqId, string? remarks, long userId);
    Task<BoqVersion?> SetCurrentBaselineAsync(long boqId, long versionId, long userId);
    Task<BoqItem?> UpdateRevisionItemAsync(long boqId, long versionId, long itemId, UpdateBoqVersionItemRequest request, long userId);
}

public class BOQService : IBOQService
{
    private readonly IBOQRepository _repository;
    private readonly IItemRepository _items;
    private readonly IAuditService _audit;
    private readonly IPermissionService _permissions;
    private readonly AppDbContext _db;

    public BOQService(IBOQRepository repository, IItemRepository items, IAuditService audit, IPermissionService permissions, AppDbContext db)
    {
        _repository = repository;
        _items = items;
        _audit = audit;
        _permissions = permissions;
        _db = db;
    }

    public async Task<List<Boq>> GetByProjectAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "BOQ")) return new();
        return await _repository.GetByProjectAsync(projectId);
    }
    public Task<Boq?> GetAsync(long id) => _repository.GetAsync(id);

    private async Task<int> NextProjectBoqVersionAsync(long projectId) =>
        (await _db.Boqs.Where(b => b.ProjectId == projectId).MaxAsync(b => (int?)b.ProjectVersionNo) ?? 0) + 1;

    public async Task<Boq?> UpdateAsync(long id, UpdateBoqRequest request, long userId)
    {
        var boq = await _repository.GetAsync(id);
        if (boq == null) return null;
        await _permissions.EnsureModuleAsync(userId, boq.ProjectId, "BOQ", "edit");
        var title = request.Title?.Trim() ?? string.Empty;
        var status = request.Status?.Trim() ?? string.Empty;
        var allowedStatuses = new[] { "Draft", "Imported", "Under Review", "Submitted", "Approved", "Rejected", "Completed", "Cancelled", "Baseline" };
        if (string.IsNullOrWhiteSpace(title)) throw new InvalidOperationException("BOQ title is required.");
        if (!allowedStatuses.Contains(status, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException("Choose a valid BOQ status.");
        var previousStatus = boq.Status;
        boq.Title = title;
        boq.Status = allowedStatuses.First(s => string.Equals(s, status, StringComparison.OrdinalIgnoreCase));
        boq.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(boq);
        if (!string.Equals(previousStatus, boq.Status, StringComparison.Ordinal))
        {
            var email = await _db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefaultAsync() ?? "Unknown";
            await _audit.LogAsync(userId, "StatusUpdate", "BOQStatus", id,
                $"Previous status: {previousStatus}; New status: {boq.Status}; Email: {email}");
        }
        return boq;
    }

    public async Task<BOQValidationResultDto> ImportAsync(BOQImportDto dto, long? userId)
    {
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, dto.ProjectId, "BOQ", dto.Commit ? "edit" : "view");
        var result = new BOQValidationResultDto { TotalRows = dto.Lines.Count };
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenItems = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < dto.Lines.Count; i++)
        {
            var row = dto.Lines[i];
            var rowNo = row.LineNo ?? i + 1;

            foreach (var importError in (row.ImportErrors ?? new()).Distinct(StringComparer.OrdinalIgnoreCase))
            {
                var separator = importError.IndexOf(':');
                result.Errors.Add(new BOQValidationErrorDto
                {
                    Row = rowNo,
                    Field = separator > 0 ? importError[..separator] : "Row",
                    Message = separator > 0 ? importError[(separator + 1)..].Trim() : importError
                });
            }

            if (string.IsNullOrWhiteSpace(row.Description) && !row.ItemId.HasValue && string.IsNullOrWhiteSpace(row.ItemCode))
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "Description", Message = "Description or item reference required." });

            if (row.Quantity <= 0)
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "Quantity", Message = "Quantity must be greater than zero." });

            if (row.UnitPrice < 0)
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "UnitPrice", Message = "Unit price cannot be negative." });

            if (row.TotalAmount.HasValue && row.TotalAmount.Value < 0)
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "TotalAmount", Message = "Total amount cannot be negative." });

            if (string.IsNullOrWhiteSpace(row.Unit))
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "Unit", Message = "Unit is required (for example: pcs, m, kg)." });

            decimal? calculatedAmount = null;
            try { calculatedAmount = row.Quantity * row.UnitPrice; }
            catch (OverflowException) { result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "TotalAmount", Message = "Quantity × unit price exceeds the supported amount range." }); }
            if (row.TotalAmount.HasValue && row.TotalAmount.Value >= 0 && calculatedAmount.HasValue && row.Quantity > 0 && row.UnitPrice >= 0 &&
                Math.Abs(row.TotalAmount.Value - calculatedAmount.Value) > 0.01m)
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "TotalAmount", Message = $"Total amount {row.TotalAmount.Value:0.##} does not match quantity × unit price ({calculatedAmount.Value:0.##})." });

            if (!string.IsNullOrWhiteSpace(row.ItemCode))
            {
                if (!seenCodes.Add(row.ItemCode))
                    result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "ItemCode", Message = "Duplicate item code in import." });
            }

            var duplicateKey = !string.IsNullOrWhiteSpace(row.ItemCode)
                ? "code:" + row.ItemCode.Trim()
                : "item:" + (row.Description?.Trim() ?? "") + "|" + (row.Unit?.Trim() ?? "");
            if (!seenItems.Add(duplicateKey) && string.IsNullOrWhiteSpace(row.ItemCode) && !string.IsNullOrWhiteSpace(row.Description))
                result.Errors.Add(new BOQValidationErrorDto { Row = rowNo, Field = "Description", Message = "Duplicate item description and unit in import." });
        }

        result.ErrorCount = result.Errors.Count;
        result.IsValid = result.ErrorCount == 0;

        if (!dto.Commit || !result.IsValid)
            return result;

        await using var transaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var projectVersionNo = await NextProjectBoqVersionAsync(dto.ProjectId);
        var boq = await _repository.AddAsync(new Boq
        {
            ProjectId = dto.ProjectId,
            ProjectVersionNo = projectVersionNo,
            Title = dto.Title,
            Status = "Imported",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });

        var version = await _repository.AddVersionAsync(new BoqVersion
        {
            BoqId = boq.Id,
            VersionNo = 1,
            IsCurrentBaseline = true,
            Remarks = dto.Remarks,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });

        var lines = new List<BoqItem>();
        foreach (var l in dto.Lines)
        {
            long? itemId = l.ItemId;
            Item? masterItem = itemId.HasValue ? await _items.GetAsync(itemId.Value) : null;
            if (!itemId.HasValue && !string.IsNullOrWhiteSpace(l.ItemCode))
            {
                masterItem = await _items.GetByCodeAsync(l.ItemCode);
                itemId = masterItem?.Id;
            }

            lines.Add(new BoqItem
            {
                BoqVersionId = version.Id,
                ItemId = itemId,
                ItemCode = masterItem?.ItemCode ?? l.ItemCode,
                ItemName = masterItem?.Name ?? l.Description,
                LineNo = l.LineNo ?? lines.Count + 1,
                DisplayLineNo = (l.LineNo ?? lines.Count + 1).ToString(),
                Description = l.Description,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                Amount = l.Quantity * l.UnitPrice,
                Unit = l.Unit ?? masterItem?.Unit?.Name,
                Brand = l.Brand ?? masterItem?.Brand?.Name,
                ImageUrl = masterItem?.ImageUrl,
                Remarks = l.Remarks,
                AttachmentPath = l.AttachmentPath,
                AttachmentName = l.AttachmentName
            });
        }

        await _repository.AddItemsAsync(lines);
        await transaction.CommitAsync();
        await _audit.LogAsync(userId, "Import", "BOQ", boq.Id, $"{lines.Count} lines");
        result.CommittedBoq = await _repository.GetAsync(boq.Id);
        return result;
    }

    public async Task<Boq> CreateFromMasterAsync(long projectId, List<BoqFromMasterLineRequest> requestedLines, long? userId)
    {
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, projectId, "BOQ", "edit");
        if (requestedLines.Count == 0) throw new InvalidOperationException("Select at least one Item Master item.");
        var items = new List<(BoqFromMasterLineRequest Request, Item Item)>();
        foreach (var line in requestedLines)
        {
            if (line.Quantity <= 0) throw new InvalidOperationException($"Quantity must be greater than zero for item {line.ItemId}.");
            if (line.UnitPrice < 0) throw new InvalidOperationException($"Price cannot be negative for item {line.ItemId}.");
            var item = await _items.GetAsync(line.ItemId) ?? throw new InvalidOperationException($"Item {line.ItemId} was not found in Item Master.");
            items.Add((line, item));
        }
        await using var transaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var projectVersionNo = await NextProjectBoqVersionAsync(projectId);
        var boq = await _repository.AddAsync(new Boq
        {
            ProjectId = projectId,
            ProjectVersionNo = projectVersionNo,
            Title = "BOQ from Item Master",
            Status = "Draft",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });

        var version = await _repository.AddVersionAsync(new BoqVersion
        {
            BoqId = boq.Id,
            VersionNo = 1,
            IsCurrentBaseline = true,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });

        var lines = new List<BoqItem>();
        var lineNo = 1;
        foreach (var selection in items)
        {
            var item = selection.Item;
            var request = selection.Request;
            lines.Add(new BoqItem
            {
                BoqVersionId = version.Id,
                ItemId = item.Id,
                ItemCode = item.ItemCode,
                ItemName = item.Name,
                LineNo = lineNo,
                DisplayLineNo = (lineNo++).ToString(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? item.Description ?? item.Name : request.Description.Trim(),
                Quantity = request.Quantity,
                UnitPrice = request.UnitPrice,
                Amount = request.Quantity * request.UnitPrice,
                Unit = item.Unit?.Name,
                Brand = item.Brand?.Name,
                ImageUrl = item.ImageUrl,
                Remarks = request.Remarks,
                AttachmentPath = request.AttachmentPath,
                AttachmentName = request.AttachmentName
            });
        }

        await _repository.AddItemsAsync(lines);
        await transaction.CommitAsync();
        return await _repository.GetAsync(boq.Id) ?? boq;
    }

    public async Task<BoqVersion> CreateRevisionAsync(long boqId, string? remarks, long userId)
    {
        var boq = await _repository.GetAsync(boqId) ?? throw new KeyNotFoundException("BOQ was not found.");
        await _permissions.EnsureModuleAsync(userId, boq.ProjectId, "BOQ", "edit");
        var latest = boq.Versions.OrderByDescending(v => v.VersionNo).FirstOrDefault();
        if (latest == null) throw new InvalidOperationException("This BOQ has no version to revise.");

        var revision = await _repository.AddVersionAsync(new BoqVersion
        {
            BoqId = boqId,
            VersionNo = boq.Versions.Max(v => v.VersionNo) + 1,
            Remarks = string.IsNullOrWhiteSpace(remarks) ? "Revision from version " + latest.VersionNo : remarks.Trim(),
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            IsCurrentBaseline = false
        });
        var copiedItems = latest.Items.Select(item => new BoqItem
        {
            BoqVersionId = revision.Id,
            ItemId = item.ItemId,
            ItemCode = item.ItemCode,
            ItemName = item.ItemName,
            LineNo = item.LineNo,
            DisplayLineNo = item.DisplayLineNo ?? item.LineNo?.ToString(),
            Description = item.Description,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            Amount = item.Amount,
            Unit = item.Unit,
            Brand = item.Brand,
            ImageUrl = item.ImageUrl,
            Remarks = item.Remarks,
            AttachmentPath = item.AttachmentPath,
            AttachmentName = item.AttachmentName
        }).ToList();
        await _repository.AddItemsAsync(copiedItems);
        await _audit.LogAsync(userId, "CreateRevision", "BOQ", boqId, $"Version {revision.VersionNo} from version {latest.VersionNo}");
        revision.Items = copiedItems;
        return revision;
    }

    public async Task<BoqVersion?> SetCurrentBaselineAsync(long boqId, long versionId, long userId)
    {
        var boq = await _repository.GetAsync(boqId);
        if (boq == null) return null;
        await _permissions.EnsureModuleAsync(userId, boq.ProjectId, "BOQ", "edit");
        var selected = boq.Versions.SingleOrDefault(v => v.Id == versionId);
        if (selected == null) return null;
        await _repository.SetCurrentBaselineAsync(boqId, versionId);
        foreach (var version in boq.Versions) version.IsCurrentBaseline = version.Id == versionId;
        await _audit.LogAsync(userId, "SetBaseline", "BOQ", boqId, $"Current baseline set to version {selected.VersionNo}");
        return selected;
    }

    public async Task<BoqItem?> UpdateRevisionItemAsync(long boqId, long versionId, long itemId, UpdateBoqVersionItemRequest request, long userId)
    {
        var boq = await _repository.GetAsync(boqId);
        if (boq == null) return null;
        await _permissions.EnsureModuleAsync(userId, boq.ProjectId, "BOQ", "edit");
        var latest = boq.Versions.OrderByDescending(v => v.VersionNo).FirstOrDefault();
        if (latest == null || latest.Id != versionId || latest.IsCurrentBaseline)
            throw new InvalidOperationException("Only the latest non-baseline revision can be edited. Create a new revision first.");
        if (request.Quantity <= 0) throw new InvalidOperationException("Quantity must be greater than zero.");
        if (request.UnitPrice < 0) throw new InvalidOperationException("Purchase price cannot be negative.");
        var item = await _repository.GetItemAsync(itemId);
        if (item == null || item.BoqVersionId != versionId) return null;
        var previousVersion = boq.Versions.Where(v => v.VersionNo < latest.VersionNo).OrderByDescending(v => v.VersionNo).FirstOrDefault();
        var previousItem = previousVersion?.Items.FirstOrDefault(i => i.LineNo == item.LineNo);
        var description = request.Description?.Trim();
        var remarks = request.Remarks?.Trim();
        var lineChanged = previousItem != null &&
            (previousItem.Quantity != request.Quantity || previousItem.UnitPrice != request.UnitPrice ||
             !string.Equals(previousItem.Description, description, StringComparison.Ordinal) ||
             !string.Equals(previousItem.Remarks, remarks, StringComparison.Ordinal));
        decimal amount;
        try { amount = request.Quantity * request.UnitPrice; }
        catch (OverflowException) { throw new InvalidOperationException("Quantity × purchase price exceeds the supported amount range."); }
        if (previousItem != null)
        {
            var previousSerial = previousItem.DisplayLineNo ?? previousItem.LineNo?.ToString() ?? item.LineNo?.ToString() ?? "1";
            if (lineChanged)
            {
                var serialParts = previousSerial.Split('.');
                var revisionCount = serialParts.Length > 1 && int.TryParse(serialParts[^1], out var previousRevision) ? previousRevision : 0;
                item.DisplayLineNo = $"{serialParts[0]}.{revisionCount + 1}";
            }
            else item.DisplayLineNo = previousSerial;
        }
        item.Quantity = request.Quantity;
        item.UnitPrice = request.UnitPrice;
        item.Amount = amount;
        item.Description = description;
        item.Remarks = remarks;
        await _repository.UpdateItemAsync(item);
        await _audit.LogAsync(userId, "UpdateRevisionLine", "BOQ", boqId, $"Version {latest.VersionNo}, line {itemId}");
        return item;
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
