from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Fund, FundHolding, NAVHistory, User
from app.schemas import (
    FundCreate,
    FundPublic,
    FundUpdate,
    HoldingCreate,
    HoldingPublic,
    NAVCreate,
    NAVPublic,
)
from app.security import get_current_user


router = APIRouter(prefix="/funds", tags=["Funds"])


def clean_optional(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    return cleaned or None


def get_fund_or_404(fund_id: int, db: Session) -> Fund:
    fund = db.query(Fund).filter(Fund.id == fund_id).first()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    return fund


@router.post("", response_model=FundPublic, status_code=status.HTTP_201_CREATED)
def create_fund(
    payload: FundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Fund:
    name = payload.name.strip()

    existing_name = db.query(Fund).filter(Fund.name == name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="A fund with this name already exists")

    scheme_code = clean_optional(payload.scheme_code)

    if scheme_code:
        existing_scheme = db.query(Fund).filter(Fund.scheme_code == scheme_code).first()
        if existing_scheme:
            raise HTTPException(status_code=400, detail="A fund with this scheme code already exists")

    fund = Fund(
        name=name,
        category=clean_optional(payload.category),
        amc=clean_optional(payload.amc),
        scheme_code=scheme_code,
        current_nav=payload.current_nav,
    )

    db.add(fund)
    db.commit()
    db.refresh(fund)

    return fund


@router.get("", response_model=list[FundPublic])
def list_funds(
    q: str | None = Query(None, description="Search by fund name, AMC, category, or scheme code"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[Fund]:
    query = db.query(Fund)

    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            Fund.name.ilike(pattern)
            | Fund.amc.ilike(pattern)
            | Fund.category.ilike(pattern)
            | Fund.scheme_code.ilike(pattern)
        )

    return query.order_by(Fund.name.asc()).limit(limit).all()


@router.get("/{fund_id}", response_model=FundPublic)
def get_fund(fund_id: int, db: Session = Depends(get_db)) -> Fund:
    return get_fund_or_404(fund_id, db)


@router.patch("/{fund_id}", response_model=FundPublic)
def update_fund(
    fund_id: int,
    payload: FundUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Fund:
    fund = get_fund_or_404(fund_id, db)
    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is not None:
        new_name = updates["name"].strip()

        duplicate = db.query(Fund).filter(
            Fund.name == new_name,
            Fund.id != fund_id,
        ).first()

        if duplicate:
            raise HTTPException(status_code=400, detail="A fund with this name already exists")

        fund.name = new_name

    for field in ("category", "amc", "scheme_code"):
        if field in updates:
            setattr(fund, field, clean_optional(updates[field]))

    if "current_nav" in updates:
        fund.current_nav = updates["current_nav"]

    db.commit()
    db.refresh(fund)

    return fund


@router.post("/{fund_id}/nav", response_model=NAVPublic, status_code=status.HTTP_201_CREATED)
def upsert_nav(
    fund_id: int,
    payload: NAVCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NAVHistory:
    fund = get_fund_or_404(fund_id, db)

    nav_row = (
        db.query(NAVHistory)
        .filter(
            NAVHistory.fund_id == fund_id,
            NAVHistory.date == payload.date,
        )
        .first()
    )

    if nav_row:
        nav_row.nav = payload.nav
    else:
        nav_row = NAVHistory(
            fund_id=fund_id,
            date=payload.date,
            nav=payload.nav,
        )
        db.add(nav_row)

    fund.current_nav = payload.nav

    db.commit()
    db.refresh(nav_row)

    return nav_row


@router.get("/{fund_id}/nav", response_model=list[NAVPublic])
def list_nav_history(
    fund_id: int,
    limit: int = Query(120, ge=1, le=1000),
    db: Session = Depends(get_db),
) -> list[NAVHistory]:
    get_fund_or_404(fund_id, db)

    return (
        db.query(NAVHistory)
        .filter(NAVHistory.fund_id == fund_id)
        .order_by(NAVHistory.date.desc())
        .limit(limit)
        .all()
    )


@router.put("/{fund_id}/holdings", response_model=list[HoldingPublic])
def replace_holdings(
    fund_id: int,
    payload: list[HoldingCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FundHolding]:
    get_fund_or_404(fund_id, db)

    seen: set[str] = set()
    holdings: list[FundHolding] = []

    for item in payload:
        company_name = item.company_name.strip()
        key = company_name.lower()

        if key in seen:
            raise HTTPException(status_code=400, detail=f"Duplicate holding: {company_name}")

        seen.add(key)

        holdings.append(
            FundHolding(
                fund_id=fund_id,
                company_name=company_name,
                sector=clean_optional(item.sector),
                weight=item.weight,
            )
        )

    db.query(FundHolding).filter(FundHolding.fund_id == fund_id).delete()
    db.add_all(holdings)
    db.commit()

    return (
        db.query(FundHolding)
        .filter(FundHolding.fund_id == fund_id)
        .order_by(FundHolding.weight.desc())
        .all()
    )


@router.get("/{fund_id}/holdings", response_model=list[HoldingPublic])
def list_holdings(
    fund_id: int,
    db: Session = Depends(get_db),
) -> list[FundHolding]:
    get_fund_or_404(fund_id, db)

    return (
        db.query(FundHolding)
        .filter(FundHolding.fund_id == fund_id)
        .order_by(FundHolding.weight.desc())
        .all()
    )
