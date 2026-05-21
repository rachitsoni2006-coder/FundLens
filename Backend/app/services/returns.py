from datetime import date


class XIRRError(ValueError):
    pass


def xnpv(rate: float, amounts: list[float], dates: list[date]) -> float:
    if rate <= -1:
        raise XIRRError("Rate must be greater than -100%")

    start_date = min(dates)

    return sum(
        amount / ((1 + rate) ** ((flow_date - start_date).days / 365.0))
        for amount, flow_date in zip(amounts, dates)
    )


def xnpv_derivative(rate: float, amounts: list[float], dates: list[date]) -> float:
    start_date = min(dates)
    derivative = 0.0

    for amount, flow_date in zip(amounts, dates):
        years = (flow_date - start_date).days / 365.0
        derivative -= years * amount / ((1 + rate) ** (years + 1))

    return derivative


def compute_xirr(amounts: list[float], dates: list[date]) -> float:
    if len(amounts) != len(dates) or len(amounts) < 2:
        raise XIRRError("At least two dated cashflows are required")

    if len(set(dates)) < 2:
        raise XIRRError("Cashflows must occur on at least two different dates")

    if not any(amount < 0 for amount in amounts) or not any(amount > 0 for amount in amounts):
        raise XIRRError("Cashflows must include at least one investment and one return")

    for initial_guess in (0.1, 0.0, 0.2, -0.2, 0.5, 1.0):
        rate = initial_guess

        for _ in range(100):
            value = xnpv(rate, amounts, dates)
            derivative = xnpv_derivative(rate, amounts, dates)

            if abs(value) < 0.0000001:
                return rate

            if abs(derivative) < 0.000000000001:
                break

            next_rate = rate - value / derivative

            if next_rate <= -0.9999 or next_rate > 100:
                break

            if abs(next_rate - rate) < 0.0000000001:
                return next_rate

            rate = next_rate

    low = -0.9999
    high = 10.0
    low_value = xnpv(low, amounts, dates)
    high_value = xnpv(high, amounts, dates)

    while low_value * high_value > 0 and high < 1000:
        high *= 2
        high_value = xnpv(high, amounts, dates)

    if low_value * high_value > 0:
        raise XIRRError("Could not solve XIRR for the provided cashflows")

    for _ in range(200):
        mid = (low + high) / 2
        mid_value = xnpv(mid, amounts, dates)

        if abs(mid_value) < 0.0000001:
            return mid

        if low_value * mid_value < 0:
            high = mid
            high_value = mid_value
        else:
            low = mid
            low_value = mid_value

    return (low + high) / 2
