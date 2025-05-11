from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from app.db import database, models
from app.schemas import user as user_schema, token as token_schema
from app.crud import user as crud_user
from app.core import security
from app.core.config import settings
from app.core.dependencies import get_current_admin_user, get_current_active_user

router = APIRouter()

@router.post("/token", response_model=token_schema.Token)
async def login_for_access_token(
    db: Session = Depends(database.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = crud_user.get_user_by_email(db, email=form_data.username) # username is email
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/users/", response_model=user_schema.User, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user: user_schema.UserCreate,
    db: Session = Depends(database.get_db),
    current_admin: user_schema.User = Depends(get_current_admin_user) # Admin only
):
    db_user = crud_user.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud_user.create_user(db=db, user=user)

@router.get("/users/me", response_model=user_schema.User)
async def read_users_me(current_user: user_schema.User = Depends(get_current_active_user)):
    return current_user

@router.get("/users/", response_model=List[user_schema.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_admin: user_schema.User = Depends(get_current_admin_user) # Admin only
):
    users = crud_user.get_users(db, skip=skip, limit=limit)
    return users

@router.delete("/users/{user_id}", response_model=user_schema.User)
def delete_user_by_id(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_admin: user_schema.User = Depends(get_current_admin_user) # Admin only
):
    user_to_delete = crud_user.delete_user(db, user_id=user_id)
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_delete