import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple

from models.schemas import (
    Coordinates,
    DiseaseCluster,
    Facility,
    HazardAlert,
    HospitalRecommendation,
    ReferralRequest,
    ReferralResponse,
)

MOCK_DATA_DIR = Path(__file__).resolve().parent.parent / "mock_data"
DEFAULT_HAZARD_CORRIDOR_RADIUS_KM = 2.5
URBAN_TRANSIT_SPEED_KMH = 35.0


def load_facilities() -> list[Facility]:
    """Load and validate all facilities from hospitals.json."""
    path = MOCK_DATA_DIR / "hospitals.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Facility(**item) for item in data]


def load_hazards() -> list[HazardAlert]:
    """Load and validate all environmental hazards from hazards.json."""
    path = MOCK_DATA_DIR / "hazards.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [HazardAlert(**item) for item in data]


def load_outbreaks() -> list[DiseaseCluster]:
    """Load and validate all disease outbreak clusters from outbreaks.json."""
    path = MOCK_DATA_DIR / "outbreaks.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [DiseaseCluster(**item) for item in data]


def haversine_distance(coord1: Coordinates, coord2: Coordinates) -> float:
    """
    Calculate the great-circle distance in kilometers between two geographic coordinates
    using the Haversine formula.
    """
    earth_radius_km = 6371.0

    lat1_rad = math.radians(coord1.lat)
    lat2_rad = math.radians(coord2.lat)
    delta_lat = math.radians(coord2.lat - coord1.lat)
    delta_lng = math.radians(coord2.lng - coord1.lng)

    a = (
        math.sin(delta_lat / 2.0) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return earth_radius_km * c


def estimate_base_transit_time(distance_km: float) -> float:
    """
    Estimate baseline ambulance transit time in minutes assuming an urban transit
    speed of 35 km/h.
    """
    if distance_km <= 0.0:
        return 0.0
    return (distance_km / URBAN_TRANSIT_SPEED_KMH) * 60.0


def _point_to_segment_distance_km(
    point: Coordinates, seg_start: Coordinates, seg_end: Coordinates
) -> float:
    """
    Compute the minimum great-circle distance in kilometers from a point to the direct
    line segment between seg_start and seg_end using equirectangular projection scaling.
    """
    mean_lat_rad = math.radians((seg_start.lat + seg_end.lat) / 2.0)
    cos_lat = math.cos(mean_lat_rad)

    ax = seg_start.lng * cos_lat
    ay = seg_start.lat
    bx = seg_end.lng * cos_lat
    by = seg_end.lat
    px = point.lng * cos_lat
    py = point.lat

    dx = bx - ax
    dy = by - ay
    seg_len_sq = dx * dx + dy * dy

    if seg_len_sq == 0.0:
        return haversine_distance(point, seg_start)

    t = ((px - ax) * dx + (py - ay) * dy) / seg_len_sq
    t_clamped = max(0.0, min(1.0, t))

    closest_coord = Coordinates(
        lat=seg_start.lat + t_clamped * (seg_end.lat - seg_start.lat),
        lng=seg_start.lng + t_clamped * (seg_end.lng - seg_start.lng),
    )
    return haversine_distance(point, closest_coord)


def calculate_hazard_penalties(
    origin_coord: Coordinates,
    hospital_coord: Coordinates,
    hazards: list[HazardAlert],
    outbreaks: list[DiseaseCluster],
) -> Tuple[int, float, list[str]]:
    """
    Check if any active hazard corridor or disease outbreak radius intersects the
    direct vector between origin and destination.

    Returns:
        Tuple of (total_delay_minutes, total_hazard_penalty_points, active_warnings)
    """
    total_delay_minutes = 0
    total_penalty_points = 0.0
    warnings: list[str] = []

    for hazard in hazards:
        dist_to_vector = _point_to_segment_distance_km(
            hazard.coordinates, origin_coord, hospital_coord
        )
        if dist_to_vector <= DEFAULT_HAZARD_CORRIDOR_RADIUS_KM:
            total_delay_minutes += hazard.delay_penalty_minutes
            severity_base = 18.0 if hazard.severity == "CRITICAL" else 10.0
            delay_weight = hazard.delay_penalty_minutes * 0.45
            total_penalty_points += severity_base + delay_weight
            warnings.append(
                f"[{hazard.severity} HAZARD] {hazard.type} along {hazard.corridor_name} "
                f"(+{hazard.delay_penalty_minutes} min delay, {dist_to_vector:.2f} km from route vector)"
            )

    for cluster in outbreaks:
        dist_to_vector = _point_to_segment_distance_km(
            cluster.coordinates, origin_coord, hospital_coord
        )
        dist_to_hospital = haversine_distance(cluster.coordinates, hospital_coord)

        if dist_to_vector <= cluster.risk_radius_km or dist_to_hospital <= cluster.risk_radius_km:
            threat_weights = {"LOW": 4.0, "MODERATE": 9.0, "HIGH": 15.0}
            outbreak_penalty = threat_weights.get(cluster.threat_level, 8.0)
            total_penalty_points += outbreak_penalty
            warnings.append(
                f"[{cluster.threat_level} OUTBREAK] {cluster.disease_type} cluster in {cluster.location_name} "
                f"(intersects {cluster.risk_radius_km} km exposure zone)"
            )

    return total_delay_minutes, total_penalty_points, warnings


def compute_route_safety_score(
    distance_km: float,
    transit_time: float,
    bed_utilization_ratio: float,
    icu_available: int,
    hazard_penalty: float,
    severity: str,
) -> float:
    """
    Produce a composite Route Safety Score (RSS) scaled from 0.0 to 100.0 (100.0 is ideal).
    - Penalizes heavily if bed occupancy > 90% or if patient severity is 'CRITICAL' and ICU beds == 0.
    - Deducts points proportionally based on transit time/distance, hazard delays, and outbreak proximity.
    """
    score = 100.0

    # 1. Distance & Transit Time Deduction
    distance_deduction = min(15.0, distance_km * 0.55)
    transit_deduction = min(20.0, transit_time * 0.35)
    score -= distance_deduction + transit_deduction

    # 2. Bed Occupancy & Capacity Deduction
    clamped_utilization = max(0.0, min(1.0, bed_utilization_ratio))
    capacity_deduction = clamped_utilization * 15.0
    if clamped_utilization > 0.90:
        # Heavy congestion penalty when bed occupancy exceeds 90%
        capacity_deduction += 18.0
    score -= capacity_deduction

    # 3. Critical Acuity & ICU Availability Penalty
    normalized_severity = severity.upper()
    if normalized_severity == "CRITICAL":
        if icu_available == 0:
            score -= 35.0
        elif icu_available <= 2:
            score -= 10.0
    elif normalized_severity == "MODERATE" and icu_available == 0:
        score -= 5.0

    # 4. Environmental Hazard & Outbreak Penalty
    score -= hazard_penalty

    return round(max(0.0, min(100.0, score)), 2)


def generate_recommendations(request: ReferralRequest) -> ReferralResponse:
    """
    Execute the end-to-end risk assessment pipeline:
    1. Load JSON seed datasets.
    2. Identify origin facility.
    3. Evaluate all tertiary receiving hospitals.
    4. Sort descending by route_safety_score.
    """
    facilities = load_facilities()
    hazards = load_hazards()
    outbreaks = load_outbreaks()

    origin_facility = next(
        (fac for fac in facilities if fac.id == request.origin_facility_id), None
    )
    if origin_facility is None:
        raise ValueError(f"Origin facility '{request.origin_facility_id}' not found.")

    tertiary_hospitals = [
        fac
        for fac in facilities
        if fac.tier == "Tertiary" and fac.id != origin_facility.id
    ]

    recommendations: list[HospitalRecommendation] = []

    for hospital in tertiary_hospitals:
        distance_km = haversine_distance(
            origin_facility.coordinates, hospital.coordinates
        )
        base_transit_mins = estimate_base_transit_time(distance_km)

        delay_mins, hazard_penalty, warnings = calculate_hazard_penalties(
            origin_coord=origin_facility.coordinates,
            hospital_coord=hospital.coordinates,
            hazards=hazards,
            outbreaks=outbreaks,
        )

        total_transit_mins = base_transit_mins + float(delay_mins)

        occupied_beds = max(0, hospital.total_beds - hospital.available_beds)
        bed_utilization_ratio = (
            occupied_beds / hospital.total_beds if hospital.total_beds > 0 else 1.0
        )
        occupancy_pct = round(bed_utilization_ratio * 100.0, 1)

        if bed_utilization_ratio > 0.90:
            warnings.append(
                f"[CAPACITY CRITICAL] High inpatient bed occupancy ({occupancy_pct}%)"
            )

        if request.patient_severity == "CRITICAL" and hospital.icu_available == 0:
            warnings.append(
                "[ICU DEFICIT] 0 ICU beds available for CRITICAL patient transfer"
            )

        if hospital.available_beds == 0:
            capacity_status = "Full Capacity (0 Beds Available)"
        elif bed_utilization_ratio > 0.90:
            capacity_status = (
                f"Critical Strain ({occupancy_pct}% Occupied | {hospital.available_beds} Beds, "
                f"{hospital.icu_available} ICU)"
            )
        else:
            capacity_status = (
                f"Available ({occupancy_pct}% Occupied | {hospital.available_beds} Beds, "
                f"{hospital.icu_available} ICU)"
            )

        rss = compute_route_safety_score(
            distance_km=distance_km,
            transit_time=total_transit_mins,
            bed_utilization_ratio=bed_utilization_ratio,
            icu_available=hospital.icu_available,
            hazard_penalty=hazard_penalty,
            severity=request.patient_severity,
        )

        recommendations.append(
            HospitalRecommendation(
                facility=hospital,
                transit_distance_km=round(distance_km, 2),
                estimated_transit_minutes=round(total_transit_mins, 2),
                route_safety_score=rss,
                active_hazard_warnings=warnings,
                capacity_status=capacity_status,
            )
        )

    recommendations.sort(key=lambda rec: rec.route_safety_score, reverse=True)

    return ReferralResponse(
        origin_facility=origin_facility,
        timestamp=datetime.now(timezone.utc).isoformat(),
        recommendations=recommendations,
    )
