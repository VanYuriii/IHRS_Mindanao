from typing import Any, Dict

from fastapi import APIRouter, status

from models.schemas import DiseaseCluster, Facility, HazardAlert
from services.risk_engine import load_facilities, load_hazards, load_outbreaks

router = APIRouter(prefix="/api", tags=["Facilities & Risks"])


@router.get(
    "/facilities",
    response_model=list[Facility],
    status_code=status.HTTP_200_OK,
    summary="List all registered primary and tertiary facilities",
)
def get_facilities() -> list[Facility]:
    """Return all registered RHUs and tertiary hospitals in the Davao Region dataset."""
    return load_facilities()


@router.get(
    "/risks",
response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="List active environmental hazards and disease clusters",
)
def get_active_risks() -> Dict[str, Any]:
    """Return all active environmental corridor hazards and epidemiological disease clusters."""
    return {
        "hazards": load_hazards(),
        "outbreaks": load_outbreaks(),
    }

