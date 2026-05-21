def as_percentages(holdings: dict[str, float]) -> dict[str, float]:
    cleaned = {
        name.strip().lower(): float(weight)
        for name, weight in holdings.items()
        if name.strip() and weight > 0
    }

    if not cleaned:
        return {}

    total = sum(cleaned.values())

    if total <= 1.5:
        return {name: weight * 100 for name, weight in cleaned.items()}

    return cleaned


def classify_overlap(overlap_percent: float) -> str:
    if overlap_percent < 20:
        return "Low"

    if overlap_percent <= 35:
        return "Moderate"

    return "High"


def compute_pair_overlap(
    holdings_a: dict[str, float],
    holdings_b: dict[str, float],
) -> tuple[float, int]:
    normalized_a = as_percentages(holdings_a)
    normalized_b = as_percentages(holdings_b)

    common_names = set(normalized_a).intersection(normalized_b)

    overlap = sum(
        min(normalized_a[name], normalized_b[name])
        for name in common_names
    )

    return round(overlap, 2), len(common_names)
