"""
Two endpoints, one forecast:
  - GET /api/analytics/projections     -> numbers only (simple_projection)
  - GET /api/analytics/ai-projections  -> same numbers + an LLM narrative
    (ai_projection wraps simple_projection rather than recomputing anything)

simple_projection is plain ordinary-least-squares linear regression,
implemented by hand (no numpy/pandas) since it's five lines of arithmetic
and pulling in a whole numeric stack for this project would cost more than
it saves. O(n) time, O(1) extra space over the input series.
"""

from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

from flask import current_app

from app.utils.reports import generate_sales_report

GEMINI_TIMEOUT_SECONDS = 15


def _least_squares_forecast(values: list[float], periods_ahead: int) -> list[float]:
    """Fits y = a + b*x over values (x = 0..n-1) and projects `periods_ahead` more points."""
    n = len(values)
    if n == 0:
        return [0.0] * periods_ahead
    if n == 1:
        return [values[0]] * periods_ahead

    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = sum(values) / n

    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values))
    denominator = sum((x - x_mean) ** 2 for x in xs)
    slope = numerator / denominator if denominator else 0.0
    intercept = y_mean - slope * x_mean

    return [max(0.0, intercept + slope * (n - 1 + i)) for i in range(1, periods_ahead + 1)]


def simple_projection(period: str = "monthly", periods_ahead: int = 3) -> dict:
    history = generate_sales_report(period)
    revenues = [bucket["revenue"] for bucket in history]
    forecast_values = _least_squares_forecast(revenues, periods_ahead)

    return {
        "period": period,
        "history": history,
        "forecast": [{"period": f"+{i + 1}", "projectedRevenue": round(v, 2)} for i, v in enumerate(forecast_values)],
    }


def _fallback_narrative(projection: dict) -> str:
    history = projection["history"]
    forecast = projection["forecast"]
    if not history or not forecast:
        return "Not enough sales history yet to generate a projection."

    trend = "growing" if forecast[0]["projectedRevenue"] >= history[-1]["revenue"] else "slowing"
    return (
        f"Based on historical data across {len(history)} {projection['period']} interval(s), "
        f"sales revenue is trending {trend}. Forward-looking statistical projections for the next "
        f"{len(forecast)} period(s) are: "
        + ", ".join(f"{f['period']}: ₹{f['projectedRevenue']:,.2f}" for f in forecast)
        + ". (Statistical linear regression model; configure GEMINI_API_KEY for an AI executive narrative)."
    )


def _call_gemini(api_key: str, model_name: str, prompt: str) -> str:
    """Runs in a worker thread so ai_projection() can enforce a hard wall-clock timeout around it (see below)."""
    import google.generativeai as genai  # imported lazily - only required when AI narratives are turned on

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(prompt, request_options={"timeout": GEMINI_TIMEOUT_SECONDS})

    narrative = getattr(response, "text", None)
    if not narrative:
        raise ValueError(f"Gemini returned no usable text (prompt_feedback={getattr(response, 'prompt_feedback', None)})")
    # Sanitize any stray dollar symbols into Indian Rupee symbol
    return narrative.replace("$", "₹")


def ai_projection(period: str = "monthly", periods_ahead: int = 3) -> dict:
    """
    Same numbers as simple_projection(), plus a narrative in INR (₹).
    If GEMINI_API_KEY is configured, the narrative comes from Gemini;
    otherwise a templated statistical narrative is used.
    """
    projection = simple_projection(period, periods_ahead)
    api_key = current_app.config.get("GEMINI_API_KEY")

    if not api_key:
        projection["narrative"] = _fallback_narrative(projection)
        projection["aiGenerated"] = False
        return projection

    prompt = (
        "You are an executive retail financial analyst for Retail Mart, an Indian retail enterprise. "
        "All monetary values are in Indian Rupees (INR / ₹). "
        "MANDATORY INSTRUCTION: NEVER use dollar signs ($) or USD in your narrative. "
        "Always prefix currency values with ₹ or Rs. (e.g. ₹15,000). "
        "Rely strictly on the real historical and projected figures provided below without hallucinating. "
        "Clearly distinguish historical sales performance from forward-looking projected revenue. "
        "Provide a concise, 3-4 sentence executive summary.\n\n"
        f"Interval: {projection['period']}\n"
        f"Historical Revenue: {projection['history']}\n"
        f"Projected Forecast: {projection['forecast']}"
    )
    model_name = current_app.config.get("GEMINI_MODEL") or "gemini-2.0-flash"

    try:
        # Belt-and-braces timeout: the Gemini SDK's own `request_options`
        # timeout (set inside _call_gemini) isn't reliably honored on every
        # network condition (observed hangs past it on a fully blocked
        # connection) - so this wraps the whole call in a real thread-level
        # deadline that can't be bypassed by anything the SDK does
        # internally. Whichever fires first, this endpoint never hangs.
        #
        # shutdown(wait=False) in `finally` is deliberate: if the call
        # timed out, the worker thread is still stuck inside the SDK and
        # may never return - waiting for it to finish (the default
        # `with ThreadPoolExecutor()` behavior) would just relocate the
        # hang to here instead of preventing it. Abandoning the thread
        # (it dies with the process) is the correct tradeoff so the
        # request itself never blocks.
        executor = ThreadPoolExecutor(max_workers=1)
        try:
            future = executor.submit(_call_gemini, api_key, model_name, prompt)
            narrative = future.result(timeout=GEMINI_TIMEOUT_SECONDS + 2)
            projection["narrative"] = narrative
            projection["aiGenerated"] = True
        finally:
            executor.shutdown(wait=False)
    except FutureTimeoutError:
        current_app.logger.error(
            "Gemini AI projection timed out after %ss - falling back to the statistical narrative",
            GEMINI_TIMEOUT_SECONDS + 2,
        )
        projection["narrative"] = _fallback_narrative(projection)
        projection["aiGenerated"] = False
    except Exception:  # noqa: BLE001 - AI narrative is a nice-to-have, never break the endpoint over it
        # Logged (not silent) so a real misconfiguration - bad API key, an
        # invalid/retired model name, quota exhaustion - is visible in the
        # server console instead of just quietly always falling back.
        current_app.logger.exception("Gemini AI projection failed - falling back to the statistical narrative")
        projection["narrative"] = _fallback_narrative(projection)
        projection["aiGenerated"] = False

    return projection
