from typing import List, Optional
from pydantic import BaseModel


class QuizResponse(BaseModel):
    profile_type: Optional[str]
    age_group: Optional[str]
    diet: Optional[List[str]]
    goals: Optional[List[str]]
    lifestyle: Optional[List[str]]
    allergies: Optional[str]
    budget: Optional[str]
