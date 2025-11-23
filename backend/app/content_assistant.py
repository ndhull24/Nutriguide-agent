# backend/app/content_assistant.py

from typing import Dict, Any, List
from .recommendation import QuizResponse


def _nice_list(items: List[str]) -> str:
    items = [x for x in items if x]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " and " + items[-1]


def generate_email_copy(quiz: QuizResponse, recommendation: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate simple, template-based engagement content
    (subject + preview + body) for email / SMS etc.

    No LLM required – safe even when your OpenAI quota is out.
    """

    profile = quiz.profile_type or "family"
    age_group = quiz.age_group or ""
    goals = quiz.goals or []
    lifestyle = quiz.lifestyle or []

    products = recommendation.get("products") or []
    product_details = recommendation.get("product_details") or []
    pricing = recommendation.get("pricing") or {}

    # Pick 1–2 headline products
    main_products = products[:2] if products else [p["name"] for p in product_details[:2]]
    main_products_str = _nice_list(main_products)

    # Human-readable goals sentence
    goal_labels_map = {
        "immunity": "immunity",
        "brain_health": "focus and brain health",
        "gut_health": "gut health",
        "energy": "steady energy",
        "sleep": "better sleep",
    }
    goal_labels = [goal_labels_map.get(g, g.replace("_", " ")) for g in goals]
    goals_str = _nice_list(goal_labels)

    lifestyle_str = _nice_list(lifestyle)

    # Subject line based on profile
    if profile == "busy_parent":
        subject = "A simple vitamin routine for your family"
    elif profile == "working_adult":
        subject = "Your daily nutrient plan, simplified"
    elif profile == "student":
        subject = "Focus, energy, and daily nutrients – tailored for you"
    else:
        subject = "Your personalized vitamin bundle from NutriGuide"

    # Preview line
    if goals_str:
        preview_line = f"We picked {main_products_str} to support {goals_str}."
    else:
        preview_line = f"We picked {main_products_str} based on your quiz answers."

    # Price snippet if available
    bundle_price = pricing.get("bundle_price")
    sub_price = pricing.get("bundle_price_subscription")
    savings_pct = pricing.get("subscription_savings_pct")

    price_line = ""
    if isinstance(bundle_price, (int, float)):
        price_line = f"Your bundle comes to around ${bundle_price:.2f} per month"
        if isinstance(sub_price, (int, float)) and savings_pct is not None:
            price_line += f", or ${sub_price:.2f} with subscription ({savings_pct}% off)."
        else:
            price_line += "."
    elif isinstance(sub_price, (int, float)):
        price_line = f"On subscription, your bundle is around ${sub_price:.2f} per month."

    # Build bullet list of products with 1–2 reasons each
    bullets = []
    for p in product_details:
        reasons = p.get("reasons") or []
        short_reasons = reasons[:2]
        reason_text = " ".join(short_reasons)
        if reason_text:
            bullets.append(f"- {p['name']}: {reason_text}")
        else:
            bullets.append(f"- {p['name']}")

    if not bullets and products:
        bullets = [f"- {name}" for name in products]

    bullets_text = "\n".join(bullets)

    # Lifestyle sentence
    lifestyle_sentence = ""
    if lifestyle_str:
        lifestyle_sentence = f"We also considered your lifestyle ({lifestyle_str}) so this feels realistic to stick with."

    # Age sentence
    age_sentence = ""
    if age_group:
        age_sentence = f"This bundle is tuned for the {age_group.replace('_', ' ')} age range."

    # Final body text (plain text – easy to reuse in email, SMS, in-app)
    body_parts = [
        "Hi there,",
        "",
        "Thanks for taking the NutriGuide quiz. Based on your answers, here’s a simple starting plan:",
        "",
        bullets_text,
    ]

    if age_sentence:
        body_parts.extend(["", age_sentence])
    if lifestyle_sentence:
        body_parts.extend(["", lifestyle_sentence])
    if price_line:
        body_parts.extend(["", price_line])

    if goals_str:
        body_parts.extend([
            "",
            f"The goal is to support {goals_str} in a way that fits your day-to-day, without adding more overwhelm.",
        ])

    body_parts.extend([
        "",
        "You can always adjust this bundle over time – swap products in or out as your needs change.",
        "",
        "Best,",
        "NutriGuide Assistant",
    ])

    body_text = "\n".join(body_parts)

    return {
        "subject": subject,
        "preview_line": preview_line,
        "body_text": body_text,
    }
