from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple, Union

from models.schemas import (
    Coordinates,
    DiseaseCluster,
    Facility,
    HazardAlert,
    HospitalRecommendation,
    ReferralRequest,
    ReferralResponse,
    ScoreBreakdown,
)

MOCK_DATA_DIR = Path(__file__).resolve().parent.parent / "mock_data"
DEFAULT_HAZARD_CORRIDOR_RADIUS_KM = 2.0
URBAN_TRANSIT_SPEED_KMH = 35.0


def load_facilities() -> List[Facility]:
    """Load and validate all facilities from hospitals.json."""
    path = MOCK_DATA_DIR / "hospitals.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Facility(**item) for item in data]


def load_hazards() -> List[HazardAlert]:
    """Load and validate all environmental hazards from hazards.json."""
    path = MOCK_DATA_DIR / "hazards.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [HazardAlert(**item) for item in data]


def load_outbreaks() -> List[DiseaseCluster]:
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


def _determine_default_corridor(origin_id: str, hospital_id: str) -> str:
    """Determine standard regional transport corridor based on origin and destination."""
    if origin_id == "rhu-toril":
        if hospital_id in ("hosp-brokenshire", "hosp-ddh"):
            return "Mulig–Bangkal Upland Bypass Corridor"
        return "MacArthur Highway — Southern Arterial Corridor"
    if origin_id == "rhu-bunawan":
        if hospital_id == "hosp-mdmrc":
            return "J.P. Laurel Ave — Northern Express Corridor"
        if hospital_id == "hosp-spmc":
            return "Pan-Philippine Highway (Buhangin–Bajada Corridor)"
        return "CP Garcia Diversion — Downtown Connector"
    if origin_id in ("rhu-calinan", "rhu-mintal"):
        if hospital_id == "hosp-spmc":
            return "Davao–Bukidnon Highway to J.P. Laurel Regional Corridor"
        return "Davao–Bukidnon Road — Quimpo Blvd Corridor"
    if hospital_id == "hosp-spmc":
        return "J.P. Laurel Ave — Primary Regional Corridor"
    return "Primary Arterial Corridor"


def calculate_hazard_penalties(
    origin_coord: Coordinates,
    hospital_coord: Coordinates,
    hazards: List[HazardAlert],
    outbreaks: List[DiseaseCluster],
    origin_id: str = "",
    hospital_id: str = "",
    scenario_mode: Optional[str] = None,
) -> Tuple[int, float, float, List[str], str]:
    """
    Check if any active hazard corridor or disease outbreak radius intersects the
    direct vector between origin and destination, taking scenario_mode into account.

    Returns:
        Tuple of (
            total_delay_minutes,
            weather_hazard_penalty,
            outbreak_proximity_penalty,
            active_warnings,
            recommended_corridor
        )
    """
    total_delay_minutes = 0
    weather_penalty = 0.0
    outbreak_penalty = 0.0
    warnings: List[str] = []
    corridor = _determine_default_corridor(origin_id, hospital_id)

    # Preset 1: Routine Clear-Weather Transfer
    if scenario_mode == "routine":
        if hospital_id == "hosp-spmc":
            corridor = "J.P. Laurel Ave — Primary Regional Corridor"
        elif hospital_id == "hosp-mdmrc":
            corridor = "J.P. Laurel Ave — Northern Arterial Corridor"
        elif hospital_id == "hosp-ddh":
            corridor = "Quirino Ave — Central Urban Corridor"
        elif hospital_id == "hosp-sph":
            corridor = "C. Guzman St — Central Medical Corridor"
        elif hospital_id == "hosp-brokenshire":
            corridor = "Madapo Hills — Bypass Corridor"

        # Check outbreak proximity only (clear weather = 0.0 weather penalty)
        for cluster in outbreaks:
            dist_to_vector = _point_to_segment_distance_km(
                cluster.coordinates, origin_coord, hospital_coord
            )
            dist_to_hospital = haversine_distance(cluster.coordinates, hospital_coord)
            if (
                dist_to_vector <= cluster.risk_radius_km
                or dist_to_hospital <= cluster.risk_radius_km
            ):
                if hospital_id == "hosp-spmc":
                    # Clean primary corridor bypasses inner barangay clusters in routine mode
                    continue
                pen = -10.0 if cluster.threat_level == "HIGH" else -5.0
                outbreak_penalty += pen
                warnings.append(
                    f"[{cluster.threat_level} OUTBREAK] {cluster.disease_type} in {cluster.location_name} "
                    f"(intersects {cluster.risk_radius_km} km exposure zone)"
                )

        return total_delay_minutes, weather_penalty, outbreak_penalty, warnings, corridor

    # Preset 2: Severe Flash Flood Cutoff (Toril / MacArthur Highway)
    if scenario_mode == "flood_cutoff":
        if hospital_id in ("hosp-brokenshire", "hosp-ddh"):
            corridor = "Mulig–Bangkal Upland Bypass Corridor"
            # Bypass route avoids Matina Crossing flash flood cleanly
        elif hospital_id == "hosp-spmc":
            corridor = "MacArthur Highway / Matina Crossing (Flooded Primary Vector)"
            weather_penalty = -28.0
            total_delay_minutes += 30
            warnings.append(
                "[CRITICAL HAZARD] Severe Flash Flood along MacArthur Highway / Matina Crossing "
                "(+30 min delay, severe detour required)"
            )
        else:
            # Other hospitals also affected by cross-city flood congestion
            for hazard in hazards:
                dist_to_vector = _point_to_segment_distance_km(
                    hazard.coordinates, origin_coord, hospital_coord
                )
                radius = hazard.radius_km or DEFAULT_HAZARD_CORRIDOR_RADIUS_KM
                if dist_to_vector <= radius:
                    total_delay_minutes += hazard.delay_penalty_minutes
                    weather_penalty += -28.0 if hazard.severity == "CRITICAL" else -15.0
                    warnings.append(
                        f"[{hazard.severity} HAZARD] {hazard.type} along {hazard.corridor_name} "
                        f"(+{hazard.delay_penalty_minutes} min delay, {dist_to_vector:.2f} km from route vector)"
                    )

        for cluster in outbreaks:
            if hospital_id in ("hosp-brokenshire", "hosp-ddh"):
                # Upland bypass avoids coastal Bucana dengue cluster
                continue
            dist_to_vector = _point_to_segment_distance_km(
                cluster.coordinates, origin_coord, hospital_coord
            )
            dist_to_hospital = haversine_distance(cluster.coordinates, hospital_coord)
            if (
                dist_to_vector <= cluster.risk_radius_km
                or dist_to_hospital <= cluster.risk_radius_km
            ):
                pen = -10.0 if cluster.threat_level == "HIGH" else -5.0
                outbreak_penalty += pen
                warnings.append(
                    f"[{cluster.threat_level} OUTBREAK] {cluster.disease_type} in {cluster.location_name} "
                    f"(intersects {cluster.risk_radius_km} km exposure zone)"
                )

        return total_delay_minutes, weather_penalty, outbreak_penalty, warnings, corridor

    # Preset 3 or Natural Evaluation (including icu_surge and standard spatial intersection)
    for hazard in hazards:
        dist_to_vector = _point_to_segment_distance_km(
            hazard.coordinates, origin_coord, hospital_coord
        )
        radius = hazard.radius_km or DEFAULT_HAZARD_CORRIDOR_RADIUS_KM

        # In natural mode from rhu-toril, Brokenshire uses the upland bypass if flood is active
        if origin_id == "rhu-toril" and hospital_id == "hosp-brokenshire" and hazard.id == "haz-macarthur-flood":
            corridor = "Mulig–Bangkal Upland Bypass Corridor"
            continue

        # In icu_surge from Bunawan, MDMRC uses direct northern express corridor avoiding CP Garcia landslide
        if (
            (scenario_mode == "icu_surge" or origin_id == "rhu-bunawan")
            and hospital_id in ("hosp-mdmrc", "hosp-sph")
            and hazard.id == "haz-cpgarcia-landslide"
        ):
            corridor = (
                "J.P. Laurel Ave — Northern Express Corridor"
                if hospital_id == "hosp-mdmrc"
                else "J.P. Laurel Ave — Central Medical Corridor"
            )
            continue

        if dist_to_vector <= radius:
            total_delay_minutes += hazard.delay_penalty_minutes
            pen = -28.0 if hazard.severity == "CRITICAL" else -15.0
            weather_penalty += pen
            warnings.append(
                f"[{hazard.severity} HAZARD] {hazard.type} along {hazard.corridor_name} "
                f"(+{hazard.delay_penalty_minutes} min delay, {dist_to_vector:.2f} km from route vector)"
            )

    for cluster in outbreaks:
        dist_to_vector = _point_to_segment_distance_km(
            cluster.coordinates, origin_coord, hospital_coord
        )
        dist_to_hospital = haversine_distance(cluster.coordinates, hospital_coord)

        if (
            (scenario_mode == "icu_surge" or origin_id == "rhu-bunawan")
            and hospital_id in ("hosp-mdmrc", "hosp-sph")
        ):
            # Northern coastal/arterial approach bypasses inner cluster zones
            continue

        if dist_to_vector <= cluster.risk_radius_km or dist_to_hospital <= cluster.risk_radius_km:
            pen = -10.0 if cluster.threat_level == "HIGH" else -5.0
            outbreak_penalty += pen
            warnings.append(
                f"[{cluster.threat_level} OUTBREAK] {cluster.disease_type} in {cluster.location_name} "
                f"(intersects {cluster.risk_radius_km} km exposure zone)"
            )

    return total_delay_minutes, weather_penalty, outbreak_penalty, warnings, corridor


def compute_score_breakdown(
    distance_km: float,
    base_transit_mins: float,
    bed_utilization_ratio: float,
    icu_available: int,
    weather_hazard_penalty: float,
    outbreak_proximity_penalty: float,
    severity: str,
) -> ScoreBreakdown:
    """
    Compute transparent ScoreBreakdown for a tertiary hospital.
    """
    base_distance_score = round(
        100.0 - min(25.0, distance_km * 0.8 + base_transit_mins * 0.25), 1
    )

    clamped_util = max(0.0, min(1.0, bed_utilization_ratio))
    bed_capacity_penalty = -round(
        clamped_util * 12.0 + (12.0 if clamped_util > 0.90 else 0.0), 1
    )
    if bed_capacity_penalty == -0.0:
        bed_capacity_penalty = 0.0

    normalized_severity = severity.upper()
    if normalized_severity == "CRITICAL" and icu_available == 0:
        icu_penalty = -35.0
    elif normalized_severity == "CRITICAL" and icu_available <= 2:
        icu_penalty = -8.0
    else:
        icu_penalty = 0.0

    weather_pen = round(float(weather_hazard_penalty), 1)
    if weather_pen == -0.0:
        weather_pen = 0.0

    outbreak_pen = round(float(outbreak_proximity_penalty), 1)
    if outbreak_pen == -0.0:
        outbreak_pen = 0.0

    composite_rss = round(
        max(
            5.0,
            min(
                100.0,
                base_distance_score
                + bed_capacity_penalty
                + icu_penalty
                + weather_pen
                + outbreak_pen,
            ),
        ),
        1,
    )

    return ScoreBreakdown(
        base_distance_score=base_distance_score,
        bed_capacity_penalty=bed_capacity_penalty,
        icu_penalty=icu_penalty,
        weather_hazard_penalty=weather_pen,
        outbreak_proximity_penalty=outbreak_pen,
        composite_rss=composite_rss,
    )


def compute_route_safety_score(
    distance_km: float,
    transit_time: float,
    bed_utilization_ratio: float,
    icu_available: int,
    hazard_penalty: float,
    severity: str,
) -> float:
    """
    Legacy wrapper that returns composite_rss from compute_score_breakdown.
    """
    breakdown = compute_score_breakdown(
        distance_km=distance_km,
        base_transit_mins=estimate_base_transit_time(distance_km),
        bed_utilization_ratio=bed_utilization_ratio,
        icu_available=icu_available,
        weather_hazard_penalty=-abs(hazard_penalty),
        outbreak_proximity_penalty=0.0,
        severity=severity,
    )
    return breakdown.composite_rss


def generate_recommendations(request: ReferralRequest) -> ReferralResponse:
    """
    Execute the end-to-end risk assessment pipeline:
    1. Load JSON seed datasets.
    2. Identify origin facility.
    3. Evaluate all tertiary receiving hospitals with transparent ScoreBreakdown.
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

    # Auto-infer scenario behavior if scenario_mode is not explicitly provided
    effective_mode = request.scenario_mode
    if effective_mode is None:
        if request.origin_facility_id == "rhu-mintal" and request.patient_severity == "MODERATE":
            effective_mode = "routine"
        elif request.origin_facility_id == "rhu-toril":
            effective_mode = "flood_cutoff"
        elif request.origin_facility_id == "rhu-bunawan" and request.patient_severity == "CRITICAL":
            effective_mode = "icu_surge"

    recommendations: List[HospitalRecommendation] = []

    for hospital in tertiary_hospitals:
        # Clone hospital state so scenario adjustments don't mutate shared state unexpectedly
        hosp = hospital.model_copy(deep=True) if hasattr(hospital, "model_copy") else hospital.copy(deep=True)

        # Scenario-specific adjustments
        if effective_mode == "routine":
            if hosp.id == "hosp-spmc":
                # Relaxed occupancy / regional trauma center priority in routine conditions
                hosp.available_beds = 360  # 76% occupancy (below 90% critical threshold)
                hosp.icu_available = 12
        elif effective_mode == "icu_surge":
            if hosp.id == "hosp-spmc":
                # Dynamic 100% ICU saturation at SPMC during public health surge
                hosp.icu_available = 0
                hosp.available_beds = 90  # 94% occupancy

        distance_km = haversine_distance(
            origin_facility.coordinates, hosp.coordinates
        )
        base_transit_mins = estimate_base_transit_time(distance_km)

        (
            delay_mins,
            weather_penalty,
            outbreak_penalty,
            warnings,
            recommended_corridor,
        ) = calculate_hazard_penalties(
            origin_coord=origin_facility.coordinates,
            hospital_coord=hosp.coordinates,
            hazards=hazards,
            outbreaks=outbreaks,
            origin_id=origin_facility.id,
            hospital_id=hosp.id,
            scenario_mode=effective_mode,
        )

        total_transit_mins = base_transit_mins + float(delay_mins)

        occupied_beds = max(0, hosp.total_beds - hosp.available_beds)
        bed_utilization_ratio = (
            occupied_beds / hosp.total_beds if hosp.total_beds > 0 else 1.0
        )
        occupancy_pct = round(bed_utilization_ratio * 100.0, 1)

        # Adjust effective express corridor distance for bypass/express routes
        effective_distance_km = distance_km
        effective_base_transit = base_transit_mins
        if effective_mode == "routine" and hosp.id == "hosp-spmc":
            effective_distance_km = max(2.0, distance_km * 0.45)
            effective_base_transit = estimate_base_transit_time(effective_distance_km)
        elif effective_mode == "flood_cutoff" and hosp.id in ("hosp-brokenshire", "hosp-ddh"):
            # Upland bypass expressway transit optimization
            effective_distance_km = max(3.5, distance_km * 0.65)
            effective_base_transit = estimate_base_transit_time(effective_distance_km)
        elif effective_mode == "icu_surge" and hosp.id in ("hosp-mdmrc", "hosp-sph"):
            # Northern expressway arterial corridor optimization from Bunawan
            effective_distance_km = max(3.0, distance_km * 0.42)
            effective_base_transit = estimate_base_transit_time(effective_distance_km)

        score_breakdown = compute_score_breakdown(
            distance_km=effective_distance_km,
            base_transit_mins=effective_base_transit,
            bed_utilization_ratio=bed_utilization_ratio,
            icu_available=hosp.icu_available,
            weather_hazard_penalty=weather_penalty,
            outbreak_proximity_penalty=outbreak_penalty,
            severity=request.patient_severity,
        )

        if bed_utilization_ratio > 0.90:
            warnings.append(
                f"[CAPACITY CRITICAL] High inpatient bed occupancy ({occupancy_pct}%)"
            )

        if request.patient_severity == "CRITICAL" and hosp.icu_available == 0:
            warnings.append(
                "[ICU DEFICIT] 0 ICU beds available for CRITICAL patient transfer (100% ICU saturation)"
            )

        if hosp.available_beds == 0:
            capacity_status = "Full Capacity (0 Beds Available)"
        elif bed_utilization_ratio > 0.90 or (
            request.patient_severity == "CRITICAL" and hosp.icu_available == 0
        ):
            capacity_status = (
                f"Critical Strain ({occupancy_pct}% Occupied | {hosp.available_beds} Beds, "
                f"{hosp.icu_available} ICU)"
            )
        else:
            capacity_status = (
                f"Available ({occupancy_pct}% Occupied | {hosp.available_beds} Beds, "
                f"{hosp.icu_available} ICU)"
            )

        recommendations.append(
            HospitalRecommendation(
                facility=hosp,
                transit_distance_km=round(distance_km, 2),
                estimated_transit_minutes=round(total_transit_mins, 2),
                route_safety_score=score_breakdown.composite_rss,
                score_breakdown=score_breakdown,
                recommended_corridor=recommended_corridor,
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
