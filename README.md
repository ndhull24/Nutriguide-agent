# NutriGuide AI – Personalized Quiz & Retention Assistant for First Day

This project is a prototype AI-powered **quiz + recommendation + retention** engine inspired by [First Day](https://firstday.com/).

It shows how First Day could:

- Convert more visitors using a **personalized conversational quiz**
- Increase subscription revenue with **smart bundles + upsells + pricing**
- Reduce churn using a **simple subscription risk heuristic**
- Save CX/marketing time via an **engagement content assistant**
- Give the business a **live operational dashboard** with segments & exportable data

---

## 1. Features

### 👪 Customer-facing Quiz & Bundle Recommender

- React-based quiz flow that asks about:
  - Age & profile type (busy parent, working adult, student, etc.)
  - Goals (immunity, brain health, gut health, energy, sleep)
  - Lifestyle (busy parent, picky eater, etc.)
  - Diet & allergy info
- FastAPI backend scores products against the quiz answers using:
  - Product catalog metadata
  - Base priority (core vs upsell)
  - Goal & lifestyle matches
  - Age range & profile fit
- Returns a bundle with:
  - **Core products** (e.g., multivitamin, probiotic, boosters)
  - **Optional upsells**
  - A simple **bundle summary**
  - Optional **LLM-style explanation** (when an OpenAI key is available)

### 💰 Pricing & Subscription View

- Backend enriches the bundle with pricing metadata:
  - Estimated **bundle price**
  - **Subscription price** with % savings
- Frontend shows:
  - Total per month
  - Subscribe & save price + discount %

This is where First Day can tune AOV (average order value) and experiment with offer structures.

### 📉 Simple Subscription Risk / Churn Heuristic

For each recommendation, the backend computes:

- A **risk_score** (0–100)
- A **risk_label**: `low`, `medium`, or `high`

Heuristic uses:

- Bundle price (higher = more risk)
- Subscription savings (higher savings = less risk)
- Intent signals from goals
- Profile type (e.g., bargain hunter vs loyal parent)

This is not a full predictive model yet, but it shows how First Day could:

- Identify high-risk cohorts
- Design different retention strategies by segment

### ✉️ Content / Engagement Assistant

After a bundle is recommended, the app can generate **ready-to-use messaging**:

- **Subject** line
- **Preview line**
- **Body text**

The backend uses quiz + recommendation to create a **template-based**, human-readable email/SMS-style message, e.g.:

> "We picked kids' multivitamin + probiotic to support immunity and gut health, tuned for the 4–8 age range and a picky eater lifestyle."

It’s designed to:

- Help CX agents explain bundles
- Help lifecycle marketers create campaigns faster
- Work **even when LLM quota is exhausted** (no hard dependency on OpenAI)

### 📊 Admin / Ops Dashboard

Admin view (built into the same React app) shows:

- **Overview cards**:
  - Total recommendations
  - Average bundle price
  - Average subscription net price
  - Average discount %
  - Average products per bundle
  - Top profile types
  - Top products
  - Risk distribution + **share of high-risk bundles**
- **Recent recommendations table**:
  - Time
  - Profile & age group
  - Goals
  - Products & upsells
  - Bundle price & subscription price
  - **Risk label**

There is also:

- **Profile filter** (e.g., only busy_parent)
- **Refresh** button
- **Export CSV** endpoint → data can be opened in Excel / Sheets

---

## 2. Tech Stack

**Backend**

- Python 3.11+  
- FastAPI  
- Uvicorn  
- Pydantic  
- (Optional) OpenAI SDK for LLM explanations  

**Frontend**

- React (Vite)  
- Plain CSS-in-JS (inline styles) for simplicity  

**Data & State**

- In-memory analytics store (`analytics_store.py`) for:
  - Recent recommendations
  - Segment summaries
  - Risk counts

In a real deployment, that store would be replaced with a database or data warehouse (e.g., Postgres, BigQuery).

---

## 3. Project Structure (simplified)

```text
NutriGuideAI_Firstday/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app & routes
│   │   ├── quiz_schema.py         # Quiz questions & pydantic schemas
│   │   ├── recommendation.py      # QuizResponse model
│   │   ├── products_catalog.py    # Product catalog & metadata
│   │   ├── recommend_products.py  # Scoring & pricing/bundle logic
│   │   ├── llm_explainer.py       # Optional LLM explanation (OpenAI)
│   │   ├── analytics_store.py     # In-memory logging & segment summary
│   │   └── content_assistant.py   # Engagement / email copy generator
│   └── requirements.txt
└── frontend/
    └── quiz-ui/
        ├── index.html
        ├── package.json
        └── src/
            └── App.jsx            # Quiz + result + admin dashboard UI
