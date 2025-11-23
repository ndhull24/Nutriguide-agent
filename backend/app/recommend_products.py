# backend/app/recommend_products.py

from typing import Dict, List, Any

from .products_catalog import PRODUCT_CATALOG
from .llm_explainer import generate_llm_explanation


def _lower_age_from_group(age_group: str) -> int:
    """
    Convert age_group like '4_8' or '19_30' to a lower-bound age in years.
    Simple heuristic for safety checks.
    """
    if not age_group:
        return 0
    parts = age_group.split("_")
    try:
        return int(parts[0])
    except ValueError:
        # handle '51_plus' style
        try:
            return int(age_group.split("_")[0])
        except Exception:
            return 0


def _check_safety(product: Dict[str, Any], quiz) -> (bool, str | None):
    """
    Returns (is_safe, reason_if_not_safe).
    Uses age, allergies, and product contraindications.
    """
    user_age_lower = _lower_age_from_group(quiz.age_group or "")
    allergies = (quiz.allergies or "").lower()

    min_age = product.get("min_age")
    max_age = product.get("max_age")
    contraindications: List[str] = product.get("contraindications", [])

    # Age-based rule
    if isinstance(min_age, (int, float)) and user_age_lower and user_age_lower < min_age:
        return False, f"{product['name']} is intended for ages {min_age}+."

    if isinstance(max_age, (int, float)) and user_age_lower and user_age_lower > max_age:
        return False, f"{product['name']} is not intended above age {max_age}."

    # Allergy-based rules
    if "fish_allergy" in contraindications and any(
        word in allergies for word in ["fish", "seafood", "omega-3"]
    ):
        return False, f"{product['name']} was skipped due to reported fish/seafood allergy."

    if "dairy_allergy" in contraindications and any(
        word in allergies for word in ["dairy", "milk", "lactose", "casein", "whey"]
    ):
        return False, f"{product['name']} was skipped due to reported dairy allergy."

    if "nut_allergy" in contraindications and any(
        word in allergies for word in ["nut", "nuts", "peanut", "almond", "cashew"]
    ):
        return False, f"{product['name']} was skipped due to reported nut allergy."

    # If we reach here, product is considered safe
    return True, None




def _score_product(product: Dict[str, Any], quiz) -> Dict[str, Any]:
    """
    Score a single product based on how well it matches the quiz answers.
    Returns a dict with score and reasons.
    """
    profile = quiz.profile_type
    age = quiz.age_group
    goals = quiz.goals or []
    lifestyle = quiz.lifestyle or []
    diet = quiz.diet or []
    allergies = (quiz.allergies or "").lower()

    score = 0
    reasons: List[str] = []

    # Base priority weight
    base_priority = product.get("base_priority", 0)
    score += base_priority * 5
    if base_priority > 0:
        reasons.append("High-priority product in the core lineup.")

    # Profile type match
    if profile and profile in product.get("profile_types", []):
        score += 25
        reasons.append("Designed specifically for this age / life stage.")

    # Age group match
    if age and age in product.get("age_groups", []):
        score += 15
        reasons.append("Optimized for this age range.")

    # Goal overlap
    matched_goals = set(goals).intersection(product.get("goals", []))
    if matched_goals:
        score += 10 * len(matched_goals)
        goal_labels = ", ".join(matched_goals)
        reasons.append(f"Supports key goals: {goal_labels}.")

    # Lifestyle overlap
    matched_lifestyle = set(lifestyle).intersection(product.get("lifestyle", []))
    if matched_lifestyle:
        score += 6 * len(matched_lifestyle)
        lifestyle_labels = ", ".join(matched_lifestyle)
        reasons.append(f"Fits the lifestyle: {lifestyle_labels}.")

    # Diet tags (simple handling)
    if "vegan" in diet or "vegetarian" in diet:
        tags = product.get("diet_tags", [])
        if any("vegan" in t or "vegetarian" in t for t in tags):
            score += 6
            reasons.append("Suitable for vegetarian/vegan preferences.")

    # Allergy note (no real filtering yet, but mention it)
    if allergies and allergies != "none":
        reasons.append(f"Remember to check for allergens like: {allergies}.")

    return {
        "id": product["id"],
        "name": product["name"],
        "raw_score": score,
        "reasons": reasons,
        "is_core_candidate": base_priority > 0,
        # NEW: pricing info for later
        "price_usd": product.get("price_usd", 0.0),
        "servings": product.get("servings", 30),
        "subscription_discount": product.get("subscription_discount", 0.0),
    }


def get_recommendation(quiz) -> Dict[str, Any]:
    """
    Score all products, pick top core products and upsell candidates,
    and return a structured recommendation.
    """

    safe_products: List[Dict[str, Any]] = []
    safety_notes: List[str] = []

    for p in PRODUCT_CATALOG:
        is_safe, reason = _check_safety(p, quiz)
        if is_safe:
            safe_products.append(p)
        elif reason:
            safety_notes.append(reason)

    # If everything got filtered out by mistake, fall back to full catalog
    products_to_score = safe_products or PRODUCT_CATALOG
    if not safe_products and safety_notes:
        safety_notes.append(
            "We could not find products that fully match all safety filters, "
            "so we are showing general options. Please review with your doctor."
        )

    scored = [_score_product(p, quiz) for p in products_to_score]


    # Normalize scores 0–100
    max_score = max((p["raw_score"] for p in scored), default=0)
    if max_score > 0:
        for p in scored:
            p["score"] = round(p["raw_score"] / max_score * 100)
    else:
        for p in scored:
            p["score"] = 0

    # Sort by score desc
    scored.sort(key=lambda p: p["score"], reverse=True)

    core_candidates = [p for p in scored if p["is_core_candidate"]]
    upsell_candidates = [p for p in scored if not p["is_core_candidate"]]

    # Pick top 3 core products
    core_selected = core_candidates[:3]

    # Pick up to 2 upsells with non-zero score
    upsell_selected = [p for p in upsell_candidates if p["score"] > 0][:2]

        # ---------- PRICING CALCULATIONS ----------
    # Full-price monthly bundle (sum of core products)
    bundle_price = sum(p.get("price_usd", 0.0) for p in core_selected)

    # Subscription bundle: apply product-level subscription_discount if present
    bundle_price_subscription = 0.0
    for p in core_selected:
        price = p.get("price_usd", 0.0)
        disc = p.get("subscription_discount", 0.0) or 0.0
        bundle_price_subscription += price * (1.0 - disc)

    # Round nicely
    bundle_price = round(bundle_price, 2)
    bundle_price_subscription = round(bundle_price_subscription, 2)

    subscription_savings_pct = 0
    if bundle_price > 0 and bundle_price_subscription < bundle_price:
        subscription_savings_pct = int(
            round((1 - (bundle_price_subscription / bundle_price)) * 100)
        )


    # Prepare simple string lists for backward compatibility
    core_names = [p["name"] for p in core_selected]
    upsell_names = [p["name"] for p in upsell_selected]

    # Overall explanation bullets (flatten some reasons)
    overall_explanations: List[str] = []
    for p in core_selected:
        # Pick top 1–2 reasons per product
        for r in p["reasons"][:2]:
            text = f"{p['name']}: {r}"
            if text not in overall_explanations:
                overall_explanations.append(text)

    bundle_summary = (
        f"We selected {len(core_selected)} core products based on your "
        "profile, goals, and lifestyle."
    )

    result = {
        "products": core_names,
        "upsell": upsell_names,
        "explanation": overall_explanations,
        "bundle_summary": bundle_summary,
        "product_details": [
            {
                "id": p["id"],
                "name": p["name"],
                "score": p["score"],
                "reasons": p["reasons"],
                "price_usd": round(p.get("price_usd", 0.0), 2),
                "price_per_day": round(
                    (p.get("price_usd", 0.0) / (p.get("servings", 30) or 30)), 2
                ),
            }
            for p in core_selected
        ],
        "safety_notes": safety_notes,
        "pricing": {
            "bundle_price": bundle_price,
            "bundle_price_subscription": bundle_price_subscription,
            "subscription_savings_pct": subscription_savings_pct,
        },
    }

    # Generate LLM explanation (optional)
    llm_explanation = generate_llm_explanation(quiz, result["product_details"])
    if llm_explanation:
        result["llm_explanation"] = llm_explanation

    return result

