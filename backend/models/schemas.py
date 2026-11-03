from typing import Literal
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float = Field(..., description="Latitude in decimal degrees")
    lng: float = Field(..., description="Longitude in decimal degrees")


class Facility(BaseModel):
    id: str = Field(..., description="Unique facility identifier")
    name: str = Field(..., description="Official healthcare facility name")
    tier: Literal["Primary", "Tertiary"] = Field(..., description="Facility care classification")
    total_beds: int = Field(..., ge=0, description="Total registered inpatient bed capacity")
    available_beds: int = Field(..., ge=0, description="Currently available general beds")
    icu_available: int = Field(..., ge=0, description="Currently available ICU beds")
    coordinates: Coordinates


class HazardAlert(BaseModel):
    id: str = Field(..., description="Unique hazard alert identifier")
    type: str = Field(..., description="Hazard category (e.g., Flooding, Landslide)")
    corridor_name: str = Field(..., description="Affected road or highway corridor")
    severity: Literal["MODERATE", "CRITICAL"] = Field(..., description="Hazard severity level")
    coordinates: Coordinates
    delay_penalty_minutes: int = Field(..., ge=0, description="Estimated transit delay in minutes")


class DiseaseCluster(BaseModel):
    id: str = Field(..., description="Unique outbreak cluster identifier")
    disease_type: str = Field(..., description="Pathogen or disease classification")
    location_name: str = Field(..., description="Barangay or sector name")
    threat_level: Literal["LOW", "MODERATE", "HIGH"] = Field(..., description="Epidemiological threat level")
    coordinates: Coordinates
    risk_radius_km: float = Field(..., gt=0, description="Radius of outbreak exposure zone in kilometers")


class ReferralRequest(BaseModel):
    origin_facility_id: str = Field(..., description="ID of the originating primary facility")
    patient_severity: Literal["LOW", "MODERATE", "CRITICAL"] = Field(
        ..., description="Clinical acuity triage level of the patient"
    )
    required_specialty: str = Field(default="General", description="Required medical specialty")


class HospitalRecommendation(BaseModel):
    facility: Facility
    transit_distance_km: float = Field(..., description="Great-circle distance in kilometers")
    estimated_transit_minutes: float = Field(..., description="Estimated total transit time including hazard delays")
    route_safety_score: float = Field(..., ge=0.0, le=100.0, description="Composite Route Safety Score (0.0 - 100.0)")
    active_hazard_warnings: list[str] = Field(default_factory=list, description="Active corridor and clinical warnings")
    capacity_status: str = Field(..., description="Human-readable bed and ICU capacity status")


class ReferralResponse(BaseModel):
    origin_facility: Facility
    timestamp: str = Field(..., description="ISO-8601 evaluation timestamp")
    recommendations: list[HospitalRecommendation]
