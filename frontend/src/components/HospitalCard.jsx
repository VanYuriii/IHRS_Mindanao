import React from 'react';
import {
  Clock,
  MapPin,
  Bed,
  HeartPulse,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Award,
  Biohazard,
  SlidersHorizontal,
  Route,
} from 'lucide-react';

function getRssTheme(score) {
  if (score >= 75) {
    return {
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bar: 'bg-emerald-500',
      label: 'Optimal Safety',
      Icon: ShieldCheck,
    };
  }
  if (score >= 50) {
    return {
      pill: 'bg-amber-50 text-amber-700 border-amber-200',
      bar: 'bg-amber-500',
      label: 'Moderate Caution',
      Icon: AlertTriangle,
    };
  }
  return {
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'bg-rose-500',
    label: 'High Risk Route',
    Icon: ShieldAlert,
  };
}

function getWarningBadgeStyle(warningText = '') {
  const lower = warningText.toLowerCase();
  if (
    lower.includes('outbreak') ||
    lower.includes('dengue') ||
    lower.includes('infectious') ||
    lower.includes('cluster')
  ) {
    return {
      classes: 'bg-violet-50 text-violet-700 border-violet-200',
      Icon: Biohazard,
    };
  }
  if (lower.includes('zero icu') || lower.includes('high') || lower.includes('critical')) {
    return {
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      Icon: ShieldAlert,
    };
  }
  return {
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: AlertTriangle,
  };
}

function formatSignedChip(val, isPositive = false) {
  const num = Number(val) || 0;
  if (isPositive) return `+${num.toFixed(1)}`;
  if (num === 0) return '0.0';
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}`;
}

export default function HospitalCard({
  recommendation,
  rank = 1,
  onDispatch,
  onInspectScore,
  isSelectedOnMap = false,
  onSelectOnMap,
}) {
  if (!recommendation || !recommendation.facility) return null;

  const {
    facility,
    transit_distance_km,
    estimated_transit_minutes,
    route_safety_score,
    active_hazard_warnings = [],
    capacity_status,
    recommended_corridor,
    score_breakdown,
  } = recommendation;

  const rssScore = Math.round(Number(route_safety_score) || 0);
  const rssTheme = getRssTheme(rssScore);
  const RssIcon = rssTheme.Icon;

  const totalBeds = facility.total_beds || 1;
  const availableBeds = facility.available_beds ?? 0;
  const icuAvailable = facility.icu_available ?? 0;
  const availabilityRatio = Math.min(
    100,
    Math.max(0, Math.round((availableBeds / totalBeds) * 100))
  );

  const hasWeatherDelay = active_hazard_warnings.some((w) => {
    const l = w.toLowerCase();
    return (
      l.includes('delay') ||
      l.includes('flood') ||
      l.includes('landslide') ||
      l.includes('hazard')
    );
  });

  const isTopRank = rank === 1;

  return (
    <div
      onClick={() => onSelectOnMap && onSelectOnMap(recommendation)}
      className={`bg-white rounded-xl shadow-sm transition-all overflow-hidden border ${
        isSelectedOnMap
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : isTopRank
          ? 'border-blue-300 ring-1 ring-blue-500/20'
          : 'border-slate-200 hover:border-slate-300'
      } ${onSelectOnMap ? 'cursor-pointer' : ''}`}
    >
      {/* Top Banner / Rank & Route Safety Score */}
      <div
        className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          isTopRank ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50/60 border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2">
          {isTopRank ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white shadow-sm">
              <Award className="w-3.5 h-3.5" />
              #1 Recommended Facility
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200/80 text-slate-700">
              #{rank} Facility
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white text-slate-600 border border-slate-200">
            {facility.tier} Tier
          </span>
        </div>

        {/* Route Safety Score Pill */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${rssTheme.pill}`}
          >
            <RssIcon className="w-3.5 h-3.5" />
            <span>RSS: {rssScore}/100</span>
            <span className="hidden sm:inline text-[11px] font-normal opacity-85">
              ({rssTheme.label})
            </span>
          </div>
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-5 space-y-4">
        {/* Facility Title & Distance / Transit Time */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {facility.name}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <strong className="font-semibold text-slate-800">
                  {transit_distance_km}
                </strong>{' '}
                km transit distance
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Est. Transit:{' '}
                <strong className="font-semibold text-slate-900">
                  {estimated_transit_minutes} mins
                </strong>
                {hasWeatherDelay && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                    Includes Hazard Delay
                  </span>
                )}
              </span>
            </div>

            {/* Recommended Corridor Badge */}
            {recommended_corridor && (
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <Route className="w-3 h-3 text-blue-600" />
                  <span>Corridor: {recommended_corridor}</span>
                </span>
              </div>
            )}
          </div>

          {/* Mini RSS Gauge Bar */}
          <div className="sm:w-32 shrink-0 bg-slate-50 border border-slate-200/80 rounded-lg p-2">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-500 font-medium">Route Safety</span>
              <span className="font-bold text-slate-800">{rssScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${rssTheme.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, rssScore))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Inline Preview of Score Breakdown Chips */}
        {score_breakdown && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">
              RSS Weights:
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-50 text-slate-700 border border-slate-200">
              <span>Base:</span>
              <strong className="text-slate-900">
                {formatSignedChip(score_breakdown.base_distance_score, true)}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-50 text-slate-700 border border-slate-200">
              <span>Capacity:</span>
              <strong
                className={
                  Number(score_breakdown.bed_capacity_penalty) < 0
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }
              >
                {formatSignedChip(score_breakdown.bed_capacity_penalty)}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-50 text-slate-700 border border-slate-200">
              <span>Hazard:</span>
              <strong
                className={
                  Number(score_breakdown.weather_hazard_penalty) < 0
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }
              >
                {formatSignedChip(score_breakdown.weather_hazard_penalty)}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-50 text-slate-700 border border-slate-200">
              <span>ICU:</span>
              <strong
                className={
                  Number(score_breakdown.icu_penalty) < 0
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }
              >
                {formatSignedChip(score_breakdown.icu_penalty)}
              </strong>
            </span>
          </div>
        )}

        {/* Bed & ICU Capacity Section */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Bed className="w-4 h-4 text-slate-500" />
              <span>General Bed Availability:</span>
              <span className="font-bold text-slate-900">
                {availableBeds} / {totalBeds} beds
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
                  icuAvailable > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                {icuAvailable} ICU {icuAvailable === 1 ? 'Bed' : 'Beds'}
              </span>

              {capacity_status && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white text-slate-700 border border-slate-200">
                  {capacity_status}
                </span>
              )}
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                availabilityRatio > 15
                  ? 'bg-blue-600'
                  : availabilityRatio > 5
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${availabilityRatio}%` }}
            />
          </div>
        </div>

        {/* Active Route Hazards & Warnings */}
        {active_hazard_warnings.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Active Route & Clinical Warnings ({active_hazard_warnings.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {active_hazard_warnings.map((warning, idx) => {
                const { classes, Icon } = getWarningBadgeStyle(warning);
                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${classes}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{warning}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Clear transit corridor — no active road hazards or outbreak alerts</span>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onInspectScore) onInspectScore(recommendation);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Inspect Route Score</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDispatch) onDispatch(recommendation);
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              isTopRank
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600'
                : 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900'
            }`}
          >
            <span>Dispatch Patient</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
