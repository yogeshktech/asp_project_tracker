namespace project_tracker_madhu.Common;

public static class EntityCodes
{
    public const string Resort = "RST";
    public const string Property = "PRP";
    public const string Project = "PRJ";
    public const string CostCenter = "CC";
    public const string Item = "ITM";
    public const string Unit = "UNT";

    public static string Next(IEnumerable<string?> existing, string prefix)
    {
        var set = new HashSet<string>(
            existing.Where(c => !string.IsNullOrWhiteSpace(c)).Select(c => c!.Trim()),
            StringComparer.OrdinalIgnoreCase);
        var head = prefix + "-";
        var max = 0;
        foreach (var c in set)
        {
            if (!c.StartsWith(head, StringComparison.OrdinalIgnoreCase)) continue;
            var tail = c[head.Length..];
            if (tail.Contains('-', StringComparison.Ordinal)) continue;
            if (int.TryParse(tail, out var n) && n > max) max = n;
        }

        string code;
        do
        {
            max++;
            code = $"{prefix}-{max:D3}";
        } while (set.Contains(code));
        return code;
    }

    public static string NextChild(string parentCode, IEnumerable<string?> existing)
    {
        var parent = string.IsNullOrWhiteSpace(parentCode) ? Project : parentCode.Trim();
        var set = new HashSet<string>(
            existing.Where(c => !string.IsNullOrWhiteSpace(c)).Select(c => c!.Trim()),
            StringComparer.OrdinalIgnoreCase);
        var head = parent + "-";
        var max = 0;
        foreach (var c in set)
        {
            if (!c.StartsWith(head, StringComparison.OrdinalIgnoreCase)) continue;
            var tail = c[head.Length..];
            if (tail.Contains('-', StringComparison.Ordinal)) continue;
            if (int.TryParse(tail, out var n) && n > max) max = n;
        }

        string code;
        do
        {
            max++;
            code = $"{parent}-{max:D2}";
        } while (set.Contains(code));
        return code;
    }
}
