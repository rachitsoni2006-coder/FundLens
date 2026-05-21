def predict_nav_values(nav_values: list[float], days: int) -> list[dict[str, float | int]]:
    if any(nav <= 0 for nav in nav_values):
        raise ValueError("NAV values must be positive")

    history = [float(value) for value in nav_values]
    first_nav = history[0]
    last_nav = history[-1]

    trend = (last_nav - first_nav) / max(len(history) - 1, 1)

    predictions: list[dict[str, float | int]] = []

    for day in range(1, days + 1):
        window = history[-3:]
        moving_average = sum(window) / len(window)
        predicted_nav = max(moving_average + trend, 0.01)

        predictions.append(
            {
                "day": day,
                "predicted_nav": round(predicted_nav, 4),
            }
        )

        history.append(predicted_nav)

    return predictions
