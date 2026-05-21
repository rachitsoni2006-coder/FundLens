from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Fund, FundHolding, NAVHistory
from app.schemas import (
    OverlapRequest,
    OverlapResponse,
    OverlapResult,
    PredictionRequest,
    PredictionResponse,
    XIRRRequest,
    XIRRResponse,
)
from app.services.overlap import classify_overlap, compute_pair_overlap
from app.services.prediction import predict_nav_values
from app.services.returns import XIRRError, compute_xirr


router = APIRouter(prefix="/analytics", tags=["Analytics"])


class StoredOverlapRequest(BaseModel):
    fund_ids: list[int] = Field(..., min_length=2)


@router.post("/xirr", response_model=XIRRResponse)
def calculate_xirr(payload: XIRRRequest) -> XIRRResponse:
    amounts = [cashflow.amount for cashflow in payload.cashflows]
    dates = [cashflow.date for cashflow in payload.cashflows]

    try:
        xirr = compute_xirr(amounts, dates)
    except XIRRError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return XIRRResponse(
        xirr=round(xirr, 6),
        xirr_percent=round(xirr * 100, 2),
    )


@router.post("/overlap", response_model=OverlapResponse)
def calculate_overlap(payload: OverlapRequest) -> OverlapResponse:
    results: list[OverlapResult] = []
    funds = payload.funds

    for i in range(len(funds)):
        for j in range(i + 1, len(funds)):
            overlap_percent, common_holdings = compute_pair_overlap(
                holdings_a=funds[i].holdings,
                holdings_b=funds[j].holdings,
            )

            results.append(
                OverlapResult(
                    fund_a=funds[i].fund_name,
                    fund_b=funds[j].fund_name,
                    common_holdings=common_holdings,
                    overlap_percent=overlap_percent,
                    risk_level=classify_overlap(overlap_percent),
                )
            )

    return OverlapResponse(overlap_results=results)


@router.post("/overlap/stored", response_model=OverlapResponse)
def calculate_stored_overlap(
    payload: StoredOverlapRequest,
    db: Session = Depends(get_db),
) -> OverlapResponse:
    funds = db.query(Fund).filter(Fund.id.in_(payload.fund_ids)).all()

    if len(funds) != len(set(payload.fund_ids)):
        raise HTTPException(status_code=404, detail="One or more funds were not found")

    holdings_by_fund: dict[int, dict[str, float]] = {}

    rows = (
        db.query(FundHolding)
        .filter(FundHolding.fund_id.in_(payload.fund_ids))
        .all()
    )

    for row in rows:
        holdings_by_fund.setdefault(row.fund_id, {})[row.company_name] = row.weight

    results: list[OverlapResult] = []

    for i in range(len(funds)):
        for j in range(i + 1, len(funds)):
            fund_a = funds[i]
            fund_b = funds[j]

            overlap_percent, common_holdings = compute_pair_overlap(
                holdings_a=holdings_by_fund.get(fund_a.id, {}),
                holdings_b=holdings_by_fund.get(fund_b.id, {}),
            )

            results.append(
                OverlapResult(
                    fund_a=fund_a.name,
                    fund_b=fund_b.name,
                    common_holdings=common_holdings,
                    overlap_percent=overlap_percent,
                    risk_level=classify_overlap(overlap_percent),
                )
            )

    return OverlapResponse(overlap_results=results)


@router.post("/predict-nav", response_model=PredictionResponse)
def predict_nav(payload: PredictionRequest) -> PredictionResponse:
    try:
        predictions = predict_nav_values(
            nav_values=payload.nav_values,
            days=payload.days,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return PredictionResponse(
        fund_name=payload.fund_name,
        method="moving_average_with_trend",
        predictions=predictions,
    )


@router.get("/funds/{fund_id}/predict-nav", response_model=PredictionResponse)
def predict_nav_from_history(
    fund_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
) -> PredictionResponse:
    if days < 1 or days > 60:
        raise HTTPException(status_code=400, detail="days must be between 1 and 60")

    fund = db.query(Fund).filter(Fund.id == fund_id).first()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    nav_rows = (
        db.query(NAVHistory)
        .filter(NAVHistory.fund_id == fund_id)
        .order_by(NAVHistory.date.desc())
        .limit(30)
        .all()
    )

    nav_values = [row.nav for row in reversed(nav_rows)]

    if len(nav_values) < 3:
        raise HTTPException(status_code=400, detail="At least three NAV records are required")

    predictions = predict_nav_values(
        nav_values=nav_values,
        days=days,
    )

    return PredictionResponse(
        fund_name=fund.name,
        method="moving_average_with_trend",
        predictions=predictions,
    )
