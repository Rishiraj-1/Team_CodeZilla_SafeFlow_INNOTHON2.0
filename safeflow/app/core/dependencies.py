from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import models
from app.schemas import token as token_schema
from app.schemas import user as user_schema
from app.crud import user as crud_user
from app.db.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token") # Path to your token endpoint

async def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> user_schema.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = token_schema.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = crud_user.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user_schema.User.from_orm(user)


async def get_current_active_user(
    current_user: user_schema.User = Depends(get_current_user),
) -> user_schema.User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(
    current_user: user_schema.User = Depends(get_current_active_user),
) -> user_schema.User:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user