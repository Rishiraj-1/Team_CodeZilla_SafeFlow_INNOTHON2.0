from pydantic import BaseModel, EmailStr
from typing import Optional
from app.db.models import UserRole

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.USER

class User(UserBase):
    id: int
    is_active: bool
    role: UserRole

    class Config:
        from_attributes = True

class UserInDB(User):
    hashed_password: str
