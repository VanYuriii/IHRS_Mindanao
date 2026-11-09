from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Tuple, Union

from fastapi import APIRouter, HTTPException, status

from models.schemas import ReferralRequest, ReferralResponse
from services.risk_engine import generate_recommendations

router = APIRouter(prefix="/api/referrals", tags=["Referrals"])


@router.post(
    "/recommend",
    response_model=ReferralResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute risk-adjusted hospital referral recommendations",
)
def recommend_referrals(request: ReferralRequest) -> ReferralResponse:
    """
    Evaluate all tertiary hospitals in the Davao Region against distance, base transit
    speed, inpatient capacity, ICU availability, active corridor hazards, and epidemic
    disease clusters. Returns recommendations sorted descending by route_safety_score.
    """
    try:
        return generate_recommendations(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Risk assessment engine error: {str(exc)}",
        ) from exc
