from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.models import Fund, FundHolding, NAVHistory, Transaction, User
from app.routers import analytics, auth, funds, portfolio


settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Backend API for FundLENS mutual fund portfolio analytics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(funds.router)
app.include_router(portfolio.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"message": "FundLENS API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
