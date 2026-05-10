from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import create_access_token, get_password_hash, verify_password
from ..config import settings
from ..database import get_db
from ..models import User
from ..schemas import AdminLoginIn, ApiResponse, UserOut
from ..rate_limit import rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])
_sms_codes: dict[str, str] = {}


def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "phone": user.phone,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "favorites": [],
        "createdAt": user.created_at,
    }


@router.post("/login", response_model=ApiResponse)
def login(payload: dict, request: Request):
    rate_limit(request, key="auth_login", max_requests=10, window_seconds=60)
    phone = str(payload.get("phone", "")).strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone is required")
    if not settings.allow_dev_auth_codes:
        raise HTTPException(status_code=503, detail="SMS authentication provider is not configured")
    _sms_codes[phone] = settings.dev_sms_code
    return ApiResponse(message="SMS код отправлен")


@router.post("/verify", response_model=ApiResponse)
def verify(payload: dict, request: Request, db: Session = Depends(get_db)):
    rate_limit(request, key="auth_verify", max_requests=20, window_seconds=60)
    phone = str(payload.get("phone", "")).strip()
    code = str(payload.get("code", "")).strip()
    if not phone or not code:
        raise HTTPException(status_code=400, detail="Phone and code are required")
    if _sms_codes.get(phone) != code:
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(phone=phone, name=f"Покупатель {phone[-4:]}", role="customer")
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(str(user.id))
    _sms_codes.pop(phone, None)
    return ApiResponse(data={"token": token, "user": _user_to_dict(user)})


@router.post("/register", response_model=ApiResponse)
def register(payload: dict, db: Session = Depends(get_db)):
    phone = str(payload.get("phone", "")).strip()
    name = str(payload.get("name", "")).strip()
    email = payload.get("email")

    if not phone or not name:
        raise HTTPException(status_code=400, detail="Phone and name are required")

    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже существует")

    user = User(phone=phone, name=name, email=email, role="customer")
    db.add(user)
    db.commit()
    db.refresh(user)
    return ApiResponse(message="Пользователь зарегистрирован", data={"id": user.id})


@router.post("/logout", response_model=ApiResponse)
def logout():
    return ApiResponse(message="Вы вышли из аккаунта")


@router.post("/admin/login", response_model=ApiResponse)
def admin_login(payload: AdminLoginIn, request: Request, db: Session = Depends(get_db)):
    rate_limit(request, key="auth_admin_login", max_requests=5, window_seconds=60)
    user = db.query(User).filter(User.phone == payload.login).first()

    if (
        settings.allow_admin_bootstrap
        and not user
        and payload.login == settings.admin_login
        and payload.password == settings.admin_password
    ):
        user = User(
            phone=settings.admin_login,
            name="Main Admin",
            role="admin",
            password_hash=get_password_hash(settings.admin_password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user or user.role != "admin" or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return ApiResponse(data={"token": token, "user": UserOut.model_validate(user).model_dump()})
