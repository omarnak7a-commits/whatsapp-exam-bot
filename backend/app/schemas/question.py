from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class OptionBase(BaseModel):
    text: Optional[str] = None
    option_text: Optional[str] = None
    is_correct: bool = False
    order_index: int = 0

    @property
    def effective_text(self):
        return self.text or self.option_text or ""


class OptionCreate(BaseModel):
    text: str
    is_correct: bool = False
    order_index: int = 0


class OptionUpdate(BaseModel):
    text: Optional[str] = None
    is_correct: Optional[bool] = None
    order_index: Optional[int] = None


class OptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    text: str
    is_correct: bool
    order_index: int

    @classmethod
    def from_orm_compat(cls, obj):
        # Handle both text and option_text
        txt = getattr(obj, 'text', None) or getattr(obj, 'option_text', None) or ""
        return cls(
            id=obj.id,
            question_id=obj.question_id,
            text=txt,
            is_correct=obj.is_correct,
            order_index=obj.order_index,
        )


class PublicOptionOut(BaseModel):
    id: int
    text: str
    order_index: int


QUESTION_TYPES = {"multiple_choice", "true_false"}


class QuestionCreate(BaseModel):
    text: str
    order_index: int = 0
    points: int = 1
    question_type: str = "multiple_choice"
    options: List[OptionCreate] = Field(..., min_length=2, max_length=4, description="2-4 options required")

    @field_validator("question_type")
    @classmethod
    def _valid_type(cls, v: str) -> str:
        if v not in QUESTION_TYPES:
            raise ValueError("question_type must be multiple_choice or true_false")
        return v


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    order_index: Optional[int] = None
    points: Optional[int] = None
    question_type: Optional[str] = None
    options: Optional[List[OptionCreate]] = None


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_id: int
    text: str
    order_index: int
    points: int
    question_type: str = "multiple_choice"
    created_at: datetime
    options: List[OptionOut]

    @classmethod
    def from_orm_compat(cls, obj):
        txt = getattr(obj, 'text', None) or getattr(obj, 'question_text', None) or ""
        opts = []
        for o in obj.options:
            o_txt = getattr(o, 'text', None) or getattr(o, 'option_text', None) or ""
            opts.append(OptionOut(
                id=o.id,
                question_id=o.question_id,
                text=o_txt,
                is_correct=o.is_correct,
                order_index=o.order_index,
            ))
        return cls(
            id=obj.id,
            exam_id=obj.exam_id,
            text=txt,
            order_index=obj.order_index,
            points=getattr(obj, 'points', 1) or 1,
            created_at=obj.created_at,
            options=opts,
        )


class PublicQuestionOut(BaseModel):
    id: int
    text: str
    order_index: int
    points: int
    options: List[PublicOptionOut]
