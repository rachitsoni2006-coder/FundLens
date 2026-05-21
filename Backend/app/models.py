from enum import Enum

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class TransactionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")


class Fund(Base):
    __tablename__ = "funds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    category = Column(String(120), nullable=True)
    amc = Column(String(160), nullable=True)
    scheme_code = Column(String(80), unique=True, nullable=True, index=True)
    current_nav = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="fund")
    nav_history = relationship("NAVHistory", back_populates="fund", cascade="all, delete-orphan")
    holdings = relationship("FundHolding", back_populates="fund", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False, index=True)
    transaction_type = Column(SQLEnum(TransactionType, native_enum=False), nullable=False)
    amount = Column(Float, nullable=False)
    units = Column(Float, nullable=False)
    nav = Column(Float, nullable=False)
    transaction_date = Column(Date, nullable=False, index=True)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")
    fund = relationship("Fund", back_populates="transactions")


class NAVHistory(Base):
    __tablename__ = "nav_history"
    __table_args__ = (UniqueConstraint("fund_id", "date", name="uq_nav_fund_date"),)

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    nav = Column(Float, nullable=False)

    fund = relationship("Fund", back_populates="nav_history")


class FundHolding(Base):
    __tablename__ = "fund_holdings"
    __table_args__ = (UniqueConstraint("fund_id", "company_name", name="uq_holding_fund_company"),)

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    sector = Column(String(120), nullable=True)
    weight = Column(Float, nullable=False)

    fund = relationship("Fund", back_populates="holdings")
