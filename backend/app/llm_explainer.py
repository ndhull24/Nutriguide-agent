import os
from typing import List, Optional, Dict, Any

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # if library not installed


def _fallback_explanation(quiz, product_details: List[Dict[str, Any]]) -> str:
    """
    Simple, non-LLM explanation so the UI always has something to show.
    """
    profile_bits = []
    if quiz.profile_type:
        profile_bits.append(quiz.profile_type.replace("_", " "))
    if quiz.age_group:
        profile_bits.append(f"age group {quiz.age_group}")
    summary_profile = ", ".join(profile_bits) or "your current situation"

    goals = ", ".join(quiz.goals or []) or "overall wellness"
    lifestyle = ", ".join(quiz.lifestyle or []) or "everyday routine"

    product_names = ", ".join(p["name"] for p in product_details) or "this bundle"

    text = (
        f"Based on {summary_profile}, your main goals ({goals}), and your lifestyle "
        f"({lifestyle}), we selected {product_names}. Together, these products are "
        f"designed to help cover daily nutrition gaps, support energy and immunity, "
        f"and make it easier to stay consistent. Always check the ingredients if you "
        f"have allergies and talk to your doctor or pediatrician if you have any "
        f"questions about starting new supplements."
    )
    return text


def generate_llm_explanation(
    quiz,
    product_details: List[Dict[str, Any]],
) -> str:
    """
    Uses OpenAI if available; otherwise falls back to a rule-based explanation.
    This function ALWAYS returns a string (never None), so the API response
    will always include 'llm_explanation'.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        # No key or library → fallback only
        return _fallback_explanation(quiz, product_details)

    client = OpenAI(api_key=api_key)

    # Build compact profile text
    profile_bits = []
    if quiz.profile_type:
        profile_bits.append(f"profile type = {quiz.profile_type}")
    if quiz.age_group:
        profile_bits.append(f"age group = {quiz.age_group}")
    if quiz.goals:
        profile_bits.append(f"goals = {', '.join(quiz.goals)}")
    if quiz.lifestyle:
        profile_bits.append(f"lifestyle = {', '.join(quiz.lifestyle)}")
    if quiz.diet:
        profile_bits.append(f"diet = {', '.join(quiz.diet)}")
    if quiz.allergies:
        profile_bits.append(f"allergies = {quiz.allergies}")
    profile_text = "; ".join(profile_bits) or "basic profile information"

    products_text_lines = []
    for p in product_details:
        line = f"- {p['name']} (fit score {p['score']}/100)"
        if p.get("reasons"):
            line += f": {'; '.join(p['reasons'][:3])}"
        products_text_lines.append(line)
    products_block = "\n".join(products_text_lines)

    user_prompt = f"""
You are a helpful pediatric & family nutrition assistant.

A customer completed a quiz. Here is their profile:
{profile_text}

We scored and selected these products for them:
{products_block}

Write a short, friendly explanation (120–180 words) in simple language that:
- Summarizes their situation in 1–2 sentences
- Explains how this bundle supports their health goals
- Avoids any medical claims, diagnoses, or guarantees
- Encourages them to talk to their doctor if unsure

Tone: warm, reassuring, and easy to understand. Do NOT mention scores.
"""

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a careful, safety-conscious nutrition assistant.",
                },
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=220,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        # If quota/any error → log and fall back
        print("LLM explanation error:", e)
        return _fallback_explanation(quiz, product_details)
