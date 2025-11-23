# backend/app/analytics_store.py

from typing import Dict, Any, List
from datetime import datetime
from collections import Counter

# In-memory store (for demo)
_RECENT_RECOMMENDATIONS: List[Dict[str, Any]] = []
_MAX_RECENT = 200  # keep last N records


def _compute_risk(quiz, result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Very simple churn / subscription risk heuristic.

    Idea:
    - Higher price + low subscription savings => higher risk
    - High savings + strong intent goals => lower risk
    """
    pricing = result.get("pricing") or {}
    bundle_price = pricing.get("bundle_price")
    sub_price = pricing.get("bundle_price_subscription")
    savings_pct = pricing.get("subscription_savings_pct")

    goals = getattr(quiz, "goals", []) or []
    profile_type = getattr(quiz, "profile_type", None)

    score = 50  # base

    # Price sensitivity
    if isinstance(bundle_price, (int, float)):
        if bundle_price >= 80:
            score += 20  # expensive bundle → more likely to churn
        elif bundle_price >= 60:
            score += 10
        elif bundle_price <= 40:
            score -= 10

    # Subscription savings
    if isinstance(savings_pct, (int, float)):
        if savings_pct >= 20:
            score -= 10  # good perceived deal
        elif savings_pct < 10:
            score += 5   # weak discount

    # Intent from goals (immunity / focus / gut health etc. → usually stronger intent)
    high_intent_goals = {"immunity", "brain_health", "gut_health", "energy"}
    if any(g in high_intent_goals for g in goals):
        score -= 5

    # Profile type tweaks
    # (purely heuristic – just to demonstrate segmentation)
    if profile_type == "bargain_hunter":
        score += 10
    elif profile_type == "loyal_parent":
        score -= 10

    # Clamp
    if score < 0:
        score = 0
    if score > 100:
        score = 100

    # Map to label
    if score >= 70:
        label = "high"
    elif score >= 45:
        label = "medium"
    else:
        label = "low"

    return {"risk_score": score, "risk_label": label}


def log_recommendation(quiz, result: Dict[str, Any]) -> None:
    """
    Store a compact record of the quiz + recommendation
    for use in the admin dashboard & CSV export.
    """
    record: Dict[str, Any] = {
        "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
        "profile_type": getattr(quiz, "profile_type", None),
        "age_group": getattr(quiz, "age_group", None),
        "goals": getattr(quiz, "goals", []) or [],
        "products": result.get("products", []) or [],
        "upsell": result.get("upsell", []) or [],
    }

    # Pricing info (if present)
    pricing = result.get("pricing") or {}
    record["bundle_price"] = pricing.get("bundle_price")
    record["bundle_price_subscription"] = pricing.get("bundle_price_subscription")

    # Risk / churn heuristic
    risk_info = _compute_risk(quiz, result)
    record["risk_score"] = risk_info["risk_score"]
    record["risk_label"] = risk_info["risk_label"]

    _RECENT_RECOMMENDATIONS.append(record)

    # Trim to last _MAX_RECENT items
    if len(_RECENT_RECOMMENDATIONS) > _MAX_RECENT:
        del _RECENT_RECOMMENDATIONS[0]


def get_recent_recommendations(limit: int = 100) -> List[Dict[str, Any]]:
    """
    Return most recent N recommendations (default 100),
    newest first.
    """
    items = _RECENT_RECOMMENDATIONS[-limit:]
    return list(reversed(items))


def get_segments_summary() -> Dict[str, Any]:
    """
    Aggregate stats for the admin overview:
    - total_recommendations
    - by_profile_type
    - by_age_group
    - product_counts
    - avg_bundle_price
    - avg_sub_price
    - avg_discount_pct
    - avg_products_per_bundle
    - by_risk_label
    - high_risk_share (% of total)
    """
    total = len(_RECENT_RECOMMENDATIONS)
    by_profile_type = Counter()
    by_age_group = Counter()
    product_counts = Counter()
    risk_counts = Counter()

    bundle_prices: List[float] = []
    sub_prices: List[float] = []
    num_products_list: List[int] = []

    for rec in _RECENT_RECOMMENDATIONS:
        # profile & age
        if rec.get("profile_type"):
            by_profile_type[rec["profile_type"]] += 1
        if rec.get("age_group"):
            by_age_group[rec["age_group"]] += 1

        # products
        prods = rec.get("products", []) or []
        for p in prods:
            product_counts[p] += 1

        # pricing metrics
        bp = rec.get("bundle_price")
        bsp = rec.get("bundle_price_subscription")
        if isinstance(bp, (int, float)):
            bundle_prices.append(float(bp))
        if isinstance(bsp, (int, float)):
            sub_prices.append(float(bsp))

        num_products_list.append(len(prods))

        # risk label
        label = rec.get("risk_label")
        if label:
            risk_counts[label] += 1

    def _avg(values: List[float]):
        return round(sum(values) / len(values), 2) if values else None

    avg_bundle_price = _avg(bundle_prices)
    avg_sub_price = _avg(sub_prices)
    avg_products_per_bundle = _avg(num_products_list)

    avg_discount_pct = None
    if avg_bundle_price and avg_sub_price and avg_bundle_price > 0:
        avg_discount_pct = int(
            round((1 - (avg_sub_price / avg_bundle_price)) * 100)
        )

    high_risk_share = None
    if total > 0 and risk_counts.get("high"):
        high_risk_share = round(
            risk_counts["high"] / total * 100, 1
        )

    return {
        "total_recommendations": total,
        "by_profile_type": dict(by_profile_type),
        "by_age_group": dict(by_age_group),
        "product_counts": dict(product_counts),
        "avg_bundle_price": avg_bundle_price,
        "avg_sub_price": avg_sub_price,
        "avg_discount_pct": avg_discount_pct,
        "avg_products_per_bundle": avg_products_per_bundle,
        "by_risk_label": dict(risk_counts),
        "high_risk_share": high_risk_share,
    }
