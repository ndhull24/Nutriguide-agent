from typing import List, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from dotenv import load_dotenv

from .quiz_schema import Question, get_quiz_questions
from .recommendation import QuizResponse as QuizAnswers  # request model alias
from .recommend_products import get_recommendation
from .analytics_store import (
    log_recommendation,
    get_recent_recommendations,
    get_segments_summary,
)
from pydantic import BaseModel
from .content_assistant import generate_email_copy


# Load environment variables (for OpenAI key etc.)
load_dotenv()


app = FastAPI(
    title="NutriGuide AI Backend",
    version="0.1.0",
    description="Quiz + recommendation + admin analytics backend for NutriGuide AI.",
)

# CORS: allow your Vite dev server
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "NutriGuide backend is running"}


@app.get("/quiz/questions", response_model=List[Question])
def get_questions():
    """
    Return the list of quiz questions (schema defined in quiz_schema.py).
    """
    return get_quiz_questions()


@app.post("/quiz/recommend")
async def recommend_products_endpoint(quiz: QuizAnswers):
    """
    Main recommendation endpoint:
    - Accepts quiz answers (QuizAnswers model)
    - Calls scoring engine to pick products + pricing
    - Logs the result for admin analytics
    - Returns bundle + pricing + safety + explanation
    """
    result = get_recommendation(quiz)
    # log for admin / analytics dashboard
    log_recommendation(quiz, result)
    return result


@app.get("/admin/recent-recommendations")
async def admin_recent_recommendations():
    """
    Return the most recent quiz + recommendation records
    for internal admin / analytics view.
    """
    return {"items": get_recent_recommendations()}


@app.get("/admin/segments-summary")
async def admin_segments_summary():
    """
    Aggregate basic stats (by profile type, age group, product frequency,
    average bundle price, subscription price, etc.).
    """
    return get_segments_summary()


@app.get("/admin/export-recent")
async def admin_export_recent():
    """
    Export recent recommendations as CSV (for quick analysis in Excel/Sheets).
    """
    items = get_recent_recommendations()

    # CSV header
    lines = [
        "timestamp,profile_type,age_group,goals,products,upsell,bundle_price,bundle_price_subscription"
    ]

    for rec in items:
        def _join_list(val):
            if isinstance(val, list):
                return ";".join(str(x) for x in val)
            return "" if val is None else str(val)

        timestamp = rec.get("timestamp", "")
        profile_type = rec.get("profile_type", "")
        age_group = rec.get("age_group", "")
        goals = _join_list(rec.get("goals"))
        products = _join_list(rec.get("products"))
        upsell = _join_list(rec.get("upsell"))
        bundle_price = rec.get("bundle_price", "")
        sub_price = rec.get("bundle_price_subscription", "")

        # Escape commas/quotes properly
        row = [
            timestamp,
            profile_type,
            age_group,
            goals,
            products,
            upsell,
            bundle_price,
            sub_price,
        ]
        safe_row = []
        for field in row:
            s = "" if field is None else str(field)
            if any(c in s for c in [",", ";", '"']):
                s = '"' + s.replace('"', '""') + '"'
            safe_row.append(s)

        lines.append(",".join(safe_row))

    csv_data = "\n".join(lines)
    return PlainTextResponse(csv_data, media_type="text/csv")

class ContentRequest(BaseModel):
    quiz: QuizAnswers
    recommendation: Dict[str, Any]


@app.post("/content/welcome-email")
async def content_welcome_email(payload: ContentRequest):
    """
    Generate engagement content (subject + preview + body) for a given
    quiz + recommendation combo.
    This does NOT call any LLM, so it works even when OpenAI quota is exhausted.
    """
    email = generate_email_copy(payload.quiz, payload.recommendation)
    return email
