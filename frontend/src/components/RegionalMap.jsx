import React, { useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Biohazard,
  Building2,
  Clock,
  Route,
  Crosshair,
} from 'lucide-react';

const DAVAO_CENTER = [7.095, 125.595];
const DEFAULT_ZOOM = 12;

/**
 * Normalize coordinate inputs ({lat, lng} or [lat, lng]) into [lat, lng] tuple.
 */
function toLatLngTuple(coords) {
  if (!coords) return null;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  }
  if (typeof coords === 'object') {
    const lat = Number(coords.lat ?? coords.latitude);
    const lng = Number(coords.lng ?? coords.lon ?? coords.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  }
  return null;
}

/**
 * Helper component to smoothly recenter or fit bounds when origin/target facilities change,
 * or reset to Davao City regional overview.
 */
function MapViewportController({ originCoords, targetCoords }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (originCoords && targetCoords) {
      const bounds = L.latLngBounds([originCoords, targetCoords]);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 13, animate: true });
    }
  }, [map, originCoords, targetCoords]);

  return null;
}

/**
 * Build custom L.divIcon for Primary Health Units (RHUs).
 */
function createPrimaryPinIcon(isOrigin, shortLabel) {
  const ringHtml = isOrigin
    ? `
      <span style="position:absolute;inset:-8px;border-radius:9999px;background:rgba(37,99,235,0.28);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <span style="position:absolute;inset:-4px;border-radius:9999px;border:2px solid #1d4ed8;background:rgba(59,130,246,0.18);"></span>
    `
    : `
      <span style="position:absolute;inset:-5px;border-radius:9999px;background:rgba(59,130,246,0.22);animation:ping 2.2s cubic-bezier(0,0,0.2,1) infinite;"></span>
    `;

  const badgeHtml = isOrigin
    ? `<div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#1d4ed8;color:#ffffff;font-size:9px;font-weight:800;letter-spacing:0.04em;padding:1px 6px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 6px rgba(15,23,42,0.28);border:1px solid #93c5fd;">ORIGIN RHU</div>`
    : '';

  const html = `
    <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
      ${ringHtml}
      ${badgeHtml}
      <div style="position:relative;z-index:10;width:${isOrigin ? '30px' : '26px'};height:${
    isOrigin ? '30px' : '26px'
  };border-radius:9999px;background:${
    isOrigin ? '#1d4ed8' : '#2563eb'
  };border:2.5px solid #ffffff;box-shadow:0 4px 10px rgba(30,64,175,0.45);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:10px;font-family:ui-sans-serif,system-ui,sans-serif;">
        ${shortLabel || 'RHU'}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'ihrs-div-icon',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Build custom L.divIcon for Tertiary Receiving Hospitals based on Route Safety Score (RSS) and rank.
 */
function createHospitalPinIcon({ rank, rssScore, isSelected }) {
  let bgHex = '#334155'; // slate-700 default before evaluation
  let borderHex = '#f8fafc';
  let ringRgba = 'rgba(51,65,85,0.22)';

  if (typeof rssScore === 'number' && !Number.isNaN(rssScore)) {
    if (rssScore >= 75) {
      bgHex = '#059669'; // emerald-600
      ringRgba = 'rgba(16,185,129,0.32)';
    } else if (rssScore >= 50) {
      bgHex = '#d97706'; // amber-600
      ringRgba = 'rgba(245,158,11,0.32)';
    } else {
      bgHex = '#e11d48'; // rose-600
      ringRgba = 'rgba(244,63,94,0.32)';
    }
  }

  const isTopRank = rank === 1;
  const size = isSelected || isTopRank ? 38 : 34;

  const pulseRing =
    isTopRank || isSelected
      ? `<span style="position:absolute;inset:-7px;border-radius:9999px;background:${ringRgba};border:2px solid ${bgHex};"></span>`
      : '';

  const rankBadge = rank
    ? `<div style="position:absolute;top:-11px;right:-12px;z-index:20;background:${
        isTopRank ? '#1e40af' : '#0f172a'
      };color:#ffffff;font-size:10px;font-weight:800;padding:1px 5px;border-radius:9999px;border:1.5px solid #ffffff;box-shadow:0 2px 5px rgba(15,23,42,0.35);font-family:ui-sans-serif,system-ui,sans-serif;">#${rank}</div>`
    : '';

  const scorePill =
    typeof rssScore === 'number' && !Number.isNaN(rssScore)
      ? `<div style="position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);z-index:20;background:#0f172a;color:#ffffff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 4px rgba(15,23,42,0.3);border:1px solid rgba(255,255,255,0.25);font-family:ui-monospace,SFMono-Regular,monospace;">RSS ${Math.round(
          rssScore
        )}</div>`
      : '';

  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      ${pulseRing}
      ${rankBadge}
      <div style="position:relative;z-index:10;width:${size}px;height:${size}px;border-radius:10px;background:${bgHex};border:${
    isSelected ? '3px' : '2.5px'
  } solid ${borderHex};box-shadow:0 6px 14px rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:900;font-size:14px;font-family:ui-sans-serif,system-ui,sans-serif;">
        H
      </div>
      ${scorePill}
    </div>
  `;

  return L.divIcon({
    className: 'ihrs-div-icon',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function RegionalMap({
  facilities = [],
  recommendations = [],
  originFacility = null,
  hazards = [],
  outbreaks = [],
  selectedHospitalId = null,
  onSelectHospital = () => {},
}) {
  // Resolve origin facility object whether passed as an ID string or full facility object
  const resolvedOrigin = useMemo(() => {
    if (!originFacility) return null;
    if (typeof originFacility === 'object' && originFacility.coordinates) {
      return originFacility;
    }
    const originId = typeof originFacility === 'object' ? originFacility.id : originFacility;
    return facilities.find((f) => f.id === originId) || null;
  }, [originFacility, facilities]);

  // Index recommendations by hospital ID for fast lookup
  const recommendationById = useMemo(() => {
    const map = new Map();
    recommendations.forEach((rec, idx) => {
      const facId = rec.facility?.id || rec.facility_id || rec.id;
      if (facId) {
        map.set(facId, {
          ...rec,
          rank: idx + 1,
        });
      }
    });
    return map;
  }, [recommendations]);

  // Ensure all facilities from both `facilities` and `recommendations` are represented on the map
  const allFacilities = useMemo(() => {
    const byId = new Map();
    facilities.forEach((f) => {
      if (f?.id) byId.set(f.id, f);
    });
    recommendations.forEach((rec) => {
      if (rec?.facility?.id && !byId.has(rec.facility.id)) {
        byId.set(rec.facility.id, rec.facility);
      }
    });
    return Array.from(byId.values());
  }, [facilities, recommendations]);

  // Determine active target hospital (user-selected hospital or #1 recommended hospital)
  const activeTargetRecommendation = useMemo(() => {
    if (selectedHospitalId && recommendationById.has(selectedHospitalId)) {
      return recommendationById.get(selectedHospitalId);
    }
    return recommendations.length > 0 ? { ...recommendations[0], rank: 1 } : null;
  }, [selectedHospitalId, recommendationById, recommendations]);

  // Determine if there is a secondary hazard-affected hospital to show a subtle comparison line
  const secondaryHazardRecommendation = useMemo(() => {
    if (recommendations.length < 2) return null;
    const primaryTargetId = activeTargetRecommendation?.facility?.id;
    return (
      recommendations.find((rec) => {
        const id = rec.facility?.id;
        if (!id || id === primaryTargetId) return false;
        const score = Number(rec.route_safety_score ?? 100);
        return score < 75 || (rec.active_hazard_warnings && rec.active_hazard_warnings.length > 0);
      }) || null
    );
  }, [recommendations, activeTargetRecommendation]);

  const originCoords = toLatLngTuple(resolvedOrigin?.coordinates);
  const targetCoords = toLatLngTuple(activeTargetRecommendation?.facility?.coordinates);
  const secondaryCoords = toLatLngTuple(secondaryHazardRecommendation?.facility?.coordinates);

  const targetRssScore = Number(activeTargetRecommendation?.route_safety_score ?? 85);
  const primaryRouteColor =
    targetRssScore >= 75 ? '#059669' : targetRssScore >= 50 ? '#d97706' : '#e11d48';

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Clinical GIS Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-white">
                Davao Regional Spatial Telemetry &amp; Route Safety GIS
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE SATELLITE OVERLAY
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Real-time Primary RHU dispatch vectors, tertiary ICU capacity, flood corridors &amp; epidemiological buffers
            </p>
          </div>
        </div>

        {/* Active Route Summary Pill if evaluated */}
        {resolvedOrigin && activeTargetRecommendation?.facility ? (
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <Route className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-300 font-medium truncate max-w-[130px] sm:max-w-[170px]">
              {resolvedOrigin.name}
            </span>
            <span className="text-slate-500">→</span>
            <span className="text-white font-semibold truncate max-w-[140px] sm:max-w-[190px]">
              {activeTargetRecommendation.facility.name}
            </span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[11px] font-bold">
              {activeTargetRecommendation.estimated_transit_minutes}m
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
            <Crosshair className="w-3.5 h-3.5 text-blue-400" />
            <span>Davao Sector (7.095°N, 125.595°E)</span>
          </div>
        )}
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="relative w-full h-[380px] sm:h-[430px] bg-slate-100 z-0">
        <MapContainer
          center={DAVAO_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewportController originCoords={originCoords} targetCoords={targetCoords} />

          {/* Active Flood / Landslide Hazard Zones (Red Translucent Circles) */}
          {hazards.map((hazard, idx) => {
            const coords = toLatLngTuple(hazard.coordinates);
            if (!coords) return null;
            const radiusMeters = (Number(hazard.radius_km) || 1.35) * 1000;
            return (
              <Circle
                key={hazard.id || `hazard-${idx}`}
                center={coords}
                radius={radiusMeters}
                pathOptions={{
                  color: '#e11d48',
                  weight: 2,
                  dashArray: '6 4',
                  fillColor: '#f43f5e',
                  fillOpacity: 0.22,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div className="text-xs font-semibold text-rose-700">
                    ⚠️ {hazard.type}: {hazard.corridor_name} (+{hazard.delay_penalty_minutes} min)
                  </div>
                </Tooltip>
                <Popup>
                  <div className="space-y-1.5 text-xs min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-1">
                      <span className="font-bold text-rose-700 uppercase tracking-wide flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {hazard.type || 'Road Hazard'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        +{hazard.delay_penalty_minutes}m Delay
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">{hazard.corridor_name}</div>
                    <div className="text-slate-600 text-[11px]">
                      Severity: <strong className="text-slate-800">{hazard.severity}</strong> • Radius:{' '}
                      <strong className="text-slate-800">{hazard.radius_km || 1.35} km</strong>
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* Active Disease Outbreak Sectors (Violet Translucent Circles) */}
          {outbreaks.map((cluster, idx) => {
            const coords = toLatLngTuple(cluster.coordinates);
            if (!coords) return null;
            const radiusMeters = (Number(cluster.risk_radius_km) || 1.8) * 1000;
            return (
              <Circle
                key={cluster.id || `outbreak-${idx}`}
                center={coords}
                radius={radiusMeters}
                pathOptions={{
                  color: '#7c3aed',
                  weight: 2,
                  fillColor: '#8b5cf6',
                  fillOpacity: 0.18,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div className="text-xs font-semibold text-violet-700">
                    ☣️ {cluster.disease_type} — {cluster.location_name}
                  </div>
                </Tooltip>
                <Popup>
                  <div className="space-y-1.5 text-xs min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 border-b border-violet-100 pb-1">
                      <span className="font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1">
                        <Biohazard className="w-3.5 h-3.5" />
                        Outbreak Zone
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 font-bold text-[10px]">
                        {cluster.threat_level} Threat
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">{cluster.disease_type}</div>
                    <div className="text-slate-700 font-medium text-[11px]">
                      {cluster.location_name}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Bio-Containment Radius:{' '}
                      <strong className="text-slate-700">{cluster.risk_radius_km} km</strong>
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* Subtle Secondary Hazard-Impacted Comparison Route */}
          {originCoords && secondaryCoords && (
            <Polyline
              positions={[originCoords, secondaryCoords]}
              pathOptions={{
                color: '#94a3b8',
                weight: 2.5,
                dashArray: '4 8',
                opacity: 0.65,
              }}
            >
              <Tooltip sticky>
                <span className="text-xs font-medium text-slate-700">
                  Alternate Route: {secondaryHazardRecommendation?.facility?.name} (RSS{' '}
                  {Math.round(Number(secondaryHazardRecommendation?.route_safety_score || 0))}/100)
                </span>
              </Tooltip>
            </Polyline>
          )}

          {/* Primary Animated Recommended Referral Corridor Vector */}
          {originCoords && targetCoords && (
            <>
              {/* Outer glow casing */}
              <Polyline
                positions={[originCoords, targetCoords]}
                pathOptions={{
                  color: primaryRouteColor,
                  weight: 8,
                  opacity: 0.2,
                }}
              />
              {/* Animated foreground vector */}
              <Polyline
                positions={[originCoords, targetCoords]}
                pathOptions={{
                  color: primaryRouteColor,
                  weight: 4,
                  dashArray: '10 8',
                  opacity: 0.95,
                  className: 'ihrs-animated-route',
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-semibold">
                    Recommended Corridor:{' '}
                    {activeTargetRecommendation?.recommended_corridor ||
                      `${resolvedOrigin?.name} → ${activeTargetRecommendation?.facility?.name}`}{' '}
                    ({activeTargetRecommendation?.transit_distance_km} km •{' '}
                    {activeTargetRecommendation?.estimated_transit_minutes} mins)
                  </div>
                </Tooltip>
              </Polyline>
            </>
          )}

          {/* Facility Markers (Primary RHUs & Tertiary Hospitals) */}
          {allFacilities.map((facility) => {
            const coords = toLatLngTuple(facility.coordinates);
            if (!coords) return null;

            const isPrimary =
              String(facility.tier || '').toLowerCase() === 'primary' ||
              String(facility.id || '').startsWith('rhu-');
            const isOrigin = resolvedOrigin && resolvedOrigin.id === facility.id;
            const recInfo = recommendationById.get(facility.id);
            const isSelected =
              selectedHospitalId === facility.id ||
              (!selectedHospitalId && recInfo?.rank === 1);

            const icon = isPrimary
              ? createPrimaryPinIcon(isOrigin, 'RHU')
              : createHospitalPinIcon({
                  rank: recInfo?.rank,
                  rssScore:
                    recInfo?.route_safety_score !== undefined
                      ? Number(recInfo.route_safety_score)
                      : undefined,
                  isSelected,
                });

            return (
              <Marker
                key={facility.id}
                position={coords}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (!isPrimary && onSelectHospital) {
                      onSelectHospital(facility.id);
                    }
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">{facility.name}</span>
                    {recInfo && (
                      <span className="ml-1.5 font-mono font-semibold text-emerald-700">
                        (#{recInfo.rank} • RSS {Math.round(Number(recInfo.route_safety_score))}/100)
                      </span>
                    )}
                  </div>
                </Tooltip>

                <Popup>
                  <div className="space-y-2 text-xs min-w-[220px]">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <div>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                            isPrimary
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          {isPrimary
                            ? isOrigin
                              ? 'Active Origin RHU'
                              : 'Primary Care RHU'
                            : recInfo
                            ? `#${recInfo.rank} Tertiary Receiving`
                            : 'Tertiary Hospital'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs leading-snug">
                          {facility.name}
                        </h4>
                      </div>
                    </div>

                    {/* Bed & ICU Telemetry */}
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Available Beds</span>
                        <strong className="text-slate-900">
                          {facility.available_beds ?? 0} / {facility.total_beds ?? 0}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">ICU Capacity</span>
                        <strong
                          className={
                            (facility.icu_available ?? 0) > 0
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                          }
                        >
                          {facility.icu_available ?? 0} ICU Beds
                        </strong>
                      </div>
                    </div>

                    {/* Route Safety Score & ETA if evaluated */}
                    {recInfo && (
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Route Safety Score:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {Math.round(Number(recInfo.route_safety_score))}/100
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Est. Transit:
                          </span>
                          <span className="font-semibold text-slate-900">
                            {recInfo.estimated_transit_minutes} mins ({recInfo.transit_distance_km}{' '}
                            km)
                          </span>
                        </div>
                        {recInfo.recommended_corridor && (
                          <div className="text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            Corridor: <strong className="text-slate-800">{recInfo.recommended_corridor}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Clinical Map Legend Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm ring-2 ring-blue-400/40" />
            Primary RHU
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3 h-3 rounded bg-emerald-600 border border-white shadow-sm" />
            Optimal RSS &ge;75
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3 h-3 rounded bg-amber-600 border border-white shadow-sm" />
            Caution 50–74
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3 h-3 rounded bg-rose-600 border border-white shadow-sm" />
            High Risk &lt;50
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-600 border-dashed" />
            Flood/Hazard Zone
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3 h-3 rounded-full bg-violet-500/30 border border-violet-600" />
            Outbreak Radius
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-5 h-0.5 bg-emerald-600 border-b-2 border-dashed border-emerald-600" />
          <span>Recommended Transit Vector</span>
        </div>
      </div>
    </div>
  );
}
