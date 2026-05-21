from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models import TransactionType


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class FundCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    category: Optional[str] = Field(None, max_length=120)
    amc: Optional[str] = Field(None, max_length=160)
    scheme_code: Optional[str] = Field(None, max_length=80)
    current_nav: Optional[float] = Field(None, gt=0)


class FundUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    category: Optional[str] = Field(None, max_length=120)
    amc: Optional[str] = Field(None, max_length=160)
    scheme_code: Optional[str] = Field(None, max_length=80)
    current_nav: Optional[float] = Field(None, gt=0)


class FundPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: Optional[str] = None
    amc: Optional[str] = None
    scheme_code: Optional[str] = None
    current_nav: Optional[float] = None
    created_at: datetime


class NAVCreate(BaseModel):
    date: date
    nav: float = Field(..., gt=0)


class NAVPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fund_id: int
    date: date
    nav: float


class HoldingCreate(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    sector: Optional[str] = Field(None, max_length=120)
    weight: float = Field(..., ge=0, le=100)


class HoldingPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fund_id: int
    company_name: str
    sector: Optional[str] = None
    weight: float


class TransactionCreate(BaseModel):
    fund_id: Optional[int] = None
    fund_name: Optional[str] = Field(None, min_length=2, max_length=255)
    transaction_type: TransactionType = TransactionType.BUY
    amount: float = Field(..., gt=0)
    units: Optional[float] = Field(None, gt=0)
    nav: Optional[float] = Field(None, gt=0)
    transaction_date: date
    note: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_transaction(self):
        if self.fund_id is None and not self.fund_name:
            raise ValueError("Either fund_id or fund_name is required")
        if self.units is None and self.nav is None:
            raise ValueError("Provide units or nav so FundLENS can calculate the other value")
        return self


class TransactionUpdate(BaseModel):
    transaction_type: Optional[TransactionType] = None
    amount: Optional[float] = Field(None, gt=0)
    units: Optional[float] = Field(None, gt=0)
    nav: Optional[float] = Field(None, gt=0)
    transaction_date: Optional[date] = None
    note: Optional[str] = Field(None, max_length=500)


class TransactionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    fund_id: int
    transaction_type: TransactionType
    amount: float
    units: float
    nav: float
    transaction_date: date
    note: Optional[str] = None
    created_at: datetime
    fund: FundPublic


class FundPosition(BaseModel):
    fund_id: int
    fund_name: str
    category: Optional[str] = None
    invested_amount: float
    redeemed_amount: float
    net_invested: float
    units: float
    average_buy_nav: Optional[float] = None
    current_nav: Optional[float] = None
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_percent: Optional[float] = None
    allocation_percent: Optional[float] = None


class PortfolioSummary(BaseModel):
    total_buy_amount: float
    total_redeemed_amount: float
    net_invested: float
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_percent: Optional[float] = None
    total_funds: int
    total_transactions: int
    positions: list[FundPosition]


class CashFlow(BaseModel):
    date: date
    amount: float


class XIRRRequest(BaseModel):
    cashflows: list[CashFlow] = Field(..., min_length=2)


class XIRRResponse(BaseModel):
    xirr: float
    xirr_percent: float


class OverlapFund(BaseModel):
    fund_name: str
    holdings: dict[str, float]


class OverlapRequest(BaseModel):
    funds: list[OverlapFund] = Field(..., min_length=2)


class OverlapResult(BaseModel):
    fund_a: str
    fund_b: str
    common_holdings: int
    overlap_percent: float
    risk_level: str


class OverlapResponse(BaseModel):
    overlap_results: list[OverlapResult]


class PredictionRequest(BaseModel):
    fund_name: str
    nav_values: list[float] = Field(..., min_length=3)
    days: int = Field(7, ge=1, le=60)


class PredictionPoint(BaseModel):
    day: int
    predicted_nav: float


class PredictionResponse(BaseModel):
    fund_name: str
    method: str
    predictions: list[PredictionPoint]
