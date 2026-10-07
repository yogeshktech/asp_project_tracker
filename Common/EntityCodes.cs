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

    public static string NextResort(string name, IEnumerable<string?> existing)
    {
        var codes = existing.Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var words = (name ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(word => new string(word.Where(char.IsLetterOrDigit).ToArray()))
            .Where(word => word.Length > 0).ToArray();
        var prefix = words.Length == 0 ? "RST" : words[0].Length >= 3
            ? words[0][..3].ToUpperInvariant()
            : string.Concat(words.Take(3).Select(word => char.ToUpperInvariant(word[0])));
        var max = 0;
        foreach (var code in codes)
        {
            var marker = code.LastIndexOf("-RST-", StringComparison.OrdinalIgnoreCase);
            var number = marker >= 0 ? code[(marker + 5)..]
                : code.StartsWith("RST-", StringComparison.OrdinalIgnoreCase) ? code[4..] : string.Empty;
            if (int.TryParse(number, out var value) && value > max) max = value;
        }

        string next;
        do { next = $"{prefix}-RST-{++max:D3}"; }
        while (codes.Contains(next));
        return next;
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
