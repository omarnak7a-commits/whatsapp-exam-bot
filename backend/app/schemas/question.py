from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OptionBase(BaseModel):
    option_text: str
    is_correct: bool = False
    order_index: int = 0


class OptionCreate(OptionBase):
    pass


class OptionOut(OptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int


class QuestionCreate(BaseModel):
    question_text: str
    order_index: int = 0
    options: List[OptionCreate] = Field(..., min_length=2, description="At least 2 options required")



class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    order_index: Optional[int] = None
    options: Optional[List[OptionCreate]] = None


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_id: int
    question_text: str
    order_index: int
    created_at: datetime
    options: List[OptionOut]
