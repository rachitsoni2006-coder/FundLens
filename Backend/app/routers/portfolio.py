from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Fund, NAVHistory, Transaction, TransactionType, User
from app.schemas import (
    FundPosition,
    PortfolioSummary,
    TransactionCreate,
    TransactionPublic,
    TransactionUpdate,
    XIRRResponse,
)
from app.security import get_current_user
from app.services.returns import XIRRError, compute_xirr


router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


def resolve_fund(payload: TransactionCreate, db: Session) -> Fund:
    if payload.fund_id is not None:
        fund = db.query(Fund).filter(Fund.id == payload.fund_id).first()

        if not fund:
            raise HTTPException(status_code=404, detail="Fund not found")

        return fund

    fund_name = payload.fund_name.strip()
    fund = db.query(Fund).filter(Fund.name == fund_name).first()

    if fund:
        return fund

    fund = Fund(
        name=fund_name,
        current_nav=payload.nav,
    )

    db.add(fund)
    db.flush()

    return fund


def complete_transaction_numbers(
    amount: float,
    units: float | None,
    nav: float | None,
) -> tuple[float, float]:
    if units is None and nav is None:
        raise HTTPException(status_code=400, detail="Provide units or nav")

    if units is None:
        units = amount / nav

    if nav is None:
        nav = amount / units

    return units, nav


def sync_nav(
    fund: Fund,
    nav: float,
    nav_date: date,
    db: Session,
) -> None:
    fund.current_nav = nav

    existing_nav = (
        db.query(NAVHistory)
        .filter(
            NAVHistory.fund_id == fund.id,
            NAVHistory.date == nav_date,
        )
        .first()
    )

    if existing_nav:
        existing_nav.nav = nav
    else:
        db.add(
            NAVHistory(
                fund_id=fund.id,
                date=nav_date,
                nav=nav,
            )
        )


def net_units_for_user(
    db: Session,
    user_id: int,
    fund_id: int,
    exclude_transaction_id: int | None = None,
) -> float:
    query = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.fund_id == fund_id,
    )

    if exclude_transaction_id is not None:
        query = query.filter(Transaction.id != exclude_transaction_id)

    units = 0.0

    for transaction in query.all():
        if transaction.transaction_type == TransactionType.BUY:
            units += transaction.units
        else:
            units -= transaction.units

    return units


def build_summary(transactions: list[Transaction]) -> PortfolioSummary:
    grouped: dict[int, dict[str, object]] = {}

    for transaction in transactions:
        fund = transaction.fund

        row = grouped.setdefault(
            fund.id,
            {
                "fund": fund,
                "buy_amount": 0.0,
                "sell_amount": 0.0,
                "buy_units": 0.0,
                "units": 0.0,
            },
        )

        if transaction.transaction_type == TransactionType.BUY:
            row["buy_amount"] = float(row["buy_amount"]) + transaction.amount
            row["buy_units"] = float(row["buy_units"]) + transaction.units
            row["units"] = float(row["units"]) + transaction.units
        else:
            row["sell_amount"] = float(row["sell_amount"]) + transaction.amount
            row["units"] = float(row["units"]) - transaction.units

    positions: list[FundPosition] = []

    total_buy_amount = 0.0
    total_redeemed_amount = 0.0
    known_current_value = 0.0
    has_current_values = False

    for row in grouped.values():
        fund = row["fund"]

        buy_amount = round(float(row["buy_amount"]), 2)
        sell_amount = round(float(row["sell_amount"]), 2)
        net_invested = round(buy_amount - sell_amount, 2)
        units = round(float(row["units"]), 6)
        buy_units = float(row["buy_units"])

        average_buy_nav = round(buy_amount / buy_units, 4) if buy_units > 0 else None

        current_value = None
        gain_loss = None
        gain_loss_percent = None

        if fund.current_nav is not None:
            current_value = round(max(units, 0) * fund.current_nav, 2)
            known_current_value += current_value
            has_current_values = True

            gain_loss = round(current_value - net_invested, 2)

            if net_invested:
                gain_loss_percent = round((gain_loss / net_invested) * 100, 2)

        total_buy_amount += buy_amount
        total_redeemed_amount += sell_amount

        positions.append(
            FundPosition(
                fund_id=fund.id,
                fund_name=fund.name,
                category=fund.category,
                invested_amount=buy_amount,
                redeemed_amount=sell_amount,
                net_invested=net_invested,
                units=units,
                average_buy_nav=average_buy_nav,
                current_nav=fund.current_nav,
                current_value=current_value,
                gain_loss=gain_loss,
                gain_loss_percent=gain_loss_percent,
            )
        )

    if has_current_values and known_current_value > 0:
        for position in positions:
            if position.current_value is not None:
                position.allocation_percent = round(
                    (position.current_value / known_current_value) * 100,
                    2,
                )

    net_invested_total = round(total_buy_amount - total_redeemed_amount, 2)

    current_value_total = round(known_current_value, 2) if has_current_values else None
    portfolio_gain = None
    portfolio_gain_percent = None

    if current_value_total is not None:
        portfolio_gain = round(current_value_total - net_invested_total, 2)

        if net_invested_total:
            portfolio_gain_percent = round(
                (portfolio_gain / net_invested_total) * 100,
                2,
            )

    positions.sort(key=lambda item: item.current_value or 0, reverse=True)

    return PortfolioSummary(
        total_buy_amount=round(total_buy_amount, 2),
        total_redeemed_amount=round(total_redeemed_amount, 2),
        net_invested=net_invested_total,
        current_value=current_value_total,
        gain_loss=portfolio_gain,
        gain_loss_percent=portfolio_gain_percent,
        total_funds=len(positions),
        total_transactions=len(transactions),
        positions=positions,
    )


@router.post("/transactions", response_model=TransactionPublic, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    fund = resolve_fund(payload, db)

    units, nav = complete_transaction_numbers(
        amount=payload.amount,
        units=payload.units,
        nav=payload.nav,
    )

    if payload.transaction_type == TransactionType.SELL:
        available_units = net_units_for_user(
            db=db,
            user_id=current_user.id,
            fund_id=fund.id,
        )

        if units > available_units + 0.00000001:
            raise HTTPException(status_code=400, detail="Sell units cannot exceed available units")

    transaction = Transaction(
        user_id=current_user.id,
        fund_id=fund.id,
        transaction_type=payload.transaction_type,
        amount=payload.amount,
        units=units,
        nav=nav,
        transaction_date=payload.transaction_date,
        note=payload.note.strip() if payload.note else None,
    )

    sync_nav(
        fund=fund,
        nav=nav,
        nav_date=payload.transaction_date,
        db=db,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get("/transactions", response_model=list[TransactionPublic])
def list_transactions(
    fund_id: int | None = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Transaction]:
    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.fund))
        .filter(Transaction.user_id == current_user.id)
    )

    if fund_id is not None:
        query = query.filter(Transaction.fund_id == fund_id)

    return (
        query
        .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        .limit(limit)
        .all()
    )


@router.get("/transactions/{transaction_id}", response_model=TransactionPublic)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    transaction = (
        db.query(Transaction)
        .options(joinedload(Transaction.fund))
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return transaction


@router.patch("/transactions/{transaction_id}", response_model=TransactionPublic)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    transaction = (
        db.query(Transaction)
        .options(joinedload(Transaction.fund))
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    transaction_type = payload.transaction_type or transaction.transaction_type
    amount = payload.amount if payload.amount is not None else transaction.amount
    units = payload.units if payload.units is not None else transaction.units
    nav = payload.nav if payload.nav is not None else transaction.nav
    transaction_date = payload.transaction_date or transaction.transaction_date

    if payload.amount is not None and payload.units is None and payload.nav is None:
        nav = amount / units
    elif payload.nav is not None and payload.units is None:
        units = amount / nav
    elif payload.units is not None and payload.nav is None:
        nav = amount / units

    if transaction_type == TransactionType.SELL:
        available_units = net_units_for_user(
            db=db,
            user_id=current_user.id,
            fund_id=transaction.fund_id,
            exclude_transaction_id=transaction.id,
        )

        if units > available_units + 0.00000001:
            raise HTTPException(status_code=400, detail="Sell units cannot exceed available units")

    transaction.transaction_type = transaction_type
    transaction.amount = amount
    transaction.units = units
    transaction.nav = nav
    transaction.transaction_date = transaction_date

    if payload.note is not None:
        transaction.note = payload.note.strip() or None

    sync_nav(
        fund=transaction.fund,
        nav=nav,
        nav_date=transaction_date,
        db=db,
    )

    db.commit()
    db.refresh(transaction)

    return transaction


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()


@router.get("/summary", response_model=PortfolioSummary)
def portfolio_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PortfolioSummary:
    transactions = (
        db.query(Transaction)
        .options(joinedload(Transaction.fund))
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.asc(), Transaction.id.asc())
        .all()
    )

    return build_summary(transactions)


@router.get("/xirr", response_model=XIRRResponse)
def portfolio_xirr(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> XIRRResponse:
    transactions = (
        db.query(Transaction)
        .options(joinedload(Transaction.fund))
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.asc(), Transaction.id.asc())
        .all()
    )

    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions available for XIRR")

    summary = build_summary(transactions)

    if summary.current_value is None or summary.current_value <= 0:
        raise HTTPException(status_code=400, detail="Current NAV values are required for portfolio XIRR")

    amounts: list[float] = []
    dates: list[date] = []

    for transaction in transactions:
        multiplier = -1 if transaction.transaction_type == TransactionType.BUY else 1
        amounts.append(multiplier * transaction.amount)
        dates.append(transaction.transaction_date)

    amounts.append(summary.current_value)
    dates.append(date.today())

    try:
        xirr = compute_xirr(amounts, dates)
    except XIRRError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return XIRRResponse(
        xirr=round(xirr, 6),
        xirr_percent=round(xirr * 100, 2),
    )