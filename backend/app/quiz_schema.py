from typing import List, Literal, Optional
from pydantic import BaseModel

QuestionType = Literal["single_choice", "multi_choice", "number", "text"]


class Option(BaseModel):
    id: str
    label: str


class Question(BaseModel):
    id: str
    text: str
    type: QuestionType
    options: Optional[List[Option]] = None
    required: bool = True
    help_text: Optional[str] = None


def get_quiz_questions() -> List[Question]:
    """
    Day 1: Hard-coded quiz questions.
    Later we can load these from DB or config.
    """
    return [
        Question(
            id="profile_type",
            text="Who are you shopping for today?",
            type="single_choice",
            options=[
                Option(id="child", label="Child"),
                Option(id="teen", label="Teenager"),
                Option(id="adult_woman", label="Adult woman"),
                Option(id="adult_man", label="Adult man"),
            ],
            help_text="We’ll personalize recommendations by age and life stage.",
        ),
        Question(
            id="age_group",
            text="What is their age group?",
            type="single_choice",
            options=[
                Option(id="0_3", label="0–3 years"),
                Option(id="4_8", label="4–8 years"),
                Option(id="9_13", label="9–13 years"),
                Option(id="14_18", label="14–18 years"),
                Option(id="19_30", label="19–30 years"),
                Option(id="31_50", label="31–50 years"),
                Option(id="51_plus", label="51+ years"),
            ],
        ),
        Question(
            id="diet",
            text="Any dietary preferences or restrictions?",
            type="multi_choice",
            options=[
                Option(id="vegetarian", label="Vegetarian"),
                Option(id="vegan", label="Vegan"),
                Option(id="gluten_free", label="Gluten-free"),
                Option(id="dairy_free", label="Dairy-free"),
                Option(id="no_restrictions", label="No major restrictions"),
            ],
        ),
        Question(
            id="goals",
            text="What are your top health goals?",
            type="multi_choice",
            options=[
                Option(id="immunity", label="Stronger immunity"),
                Option(id="brain", label="Focus & brain health"),
                Option(id="gut", label="Gut health & digestion"),
                Option(id="energy", label="More daily energy"),
                Option(id="sleep", label="Better sleep"),
                Option(id="bones", label="Bone & growth support"),
            ],
            help_text="Pick up to 3 priorities.",
        ),
        Question(
            id="lifestyle",
            text="Which of these best describes your lifestyle?",
            type="multi_choice",
            options=[
                Option(id="busy_parent", label="Busy parent"),
                Option(id="picky_eater", label="Very picky eater"),
                Option(id="screen_heavy", label="Lots of screen time"),
                Option(id="sports", label="Very active / sports"),
                Option(id="low_veggies", label="Not enough fruits & veggies"),
            ],
        ),
        Question(
            id="allergies",
            text="Any known allergies we should avoid in supplements?",
            type="text",
            help_text="Type 'none' if there are no known allergies.",
        ),
        Question(
            id="budget",
            text="What’s your monthly budget for vitamins/supplements (USD)?",
            type="number",
            help_text="Rough estimate is fine.",
        ),
    ]
