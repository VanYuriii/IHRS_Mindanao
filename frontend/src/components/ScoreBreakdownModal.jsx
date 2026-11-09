import React, { useEffect, useId } from 'react';
import {
  X,
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Navigation,
  Bed,
  HeartPulse,
  CloudRain,
  Biohazard,
  ArrowRight,
  Sigma,
} from 'lucide-react';

function getRssBadge(score) {
  if (score >= 75) {
    return {
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bar: 'bg-emerald-500',
      label: 'Optimal Safety',
      Icon: ShieldCheck,
    };
  }
  if (score >= 50) {
    return {
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      bar: 'bg-amber-500',
      label: 'Moderate Caution',
      Icon: AlertTriangle,
    };
  }
  return {
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'bg-rose-500',
    label: 'High Risk Route',
    Icon: ShieldAlert,
  };
}

function formatSignedScore(val, isPositiveBase = false) {
  const num = Number(val) || 0;
  if (isPositiveBase) {
    return `+${num.toFixed(1)} pts`;
  }
  if (num === 0) {
    return '0.0 pts (Optimal)';
  }
  return `${num > 0 ? '+' : ''}${num.toFixed(1)} pts`;
}

export default function ScoreBreakdownModal({
  isOpen,
  recommendation,
  originFacilityName = 'Origin Primary Care RHU',
  patientSeverity = 'CRITICAL',
  onClose,
  onDispatch,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !recommendation) return null;

  const {
    facility = {},
    transit_distance_km = 0,
    estimated_transit_minutes = 0,
    route_safety_score = 0,
    capacity_status = 'Normal',
    recommended_corridor = 'Primary Arterial Corridor',
    score_breakdown = {},
  } = recommendation;

  const baseDistanceScore =
    score_breakdown.base_distance_score ??
    Math.max(0, 100 - Number(transit_distance_km) * 2.2);
  const bedCapacityPenalty = score_breakdown.bed_capacity_penalty ?? 0;
  const icuPenalty = score_breakdown.icu_penalty ?? 0;
  const weatherHazardPenalty = score_breakdown.weather_hazard_penalty ?? 0;
  const outbreakProximityPenalty = score_breakdown.outbreak_proximity_penalty ?? 0;
  const compositeRss =
    score_breakdown.composite_rss ?? Number(route_safety_score) ?? 0;

  const rssBadge = getRssBadge(compositeRss);
  const RssIcon = rssBadge.Icon;

  const factors = [
    {
      key: 'base_distance_score',
      title: 'Base Transit & Distance Score',
      subtitle: `${transit_distance_km} km transit distance • Est. ${estimated_transit_minutes} mins (${recommended_corridor})`,
      value: baseDistanceScore,
      formatted: formatSignedScore(baseDistanceScore, true),
      barPct: Math.min(100, Math.max(0, Number(baseDistanceScore))),
      barColor: 'bg-blue-600',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      Icon: Navigation,
    },
    {
      key: 'bed_capacity_penalty',
      title: 'Bed Saturation Weight',
      subtitle: `Current Occupancy Status: ${capacity_status} (${facility.available_beds ?? 0}/${facility.total_beds ?? 0} beds free)`,
      value: bedCapacityPenalty,
      formatted: formatSignedScore(bedCapacityPenalty),
      barPct: Math.min(100, Math.abs(Number(bedCapacityPenalty)) * 2.5),
      barColor: Number(bedCapacityPenalty) < 0 ? 'bg-amber-500' : 'bg-emerald-500',
      badgeColor:
        Number(bedCapacityPenalty) < 0
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Icon: Bed,
    },
    {
      key: 'icu_penalty',
      title: 'ICU Readiness & Acuity Factor',
      subtitle: `Patient Severity: ${patientSeverity} • ${facility.icu_available ?? 0} Tertiary ICU beds available`,
      value: icuPenalty,
      formatted:
        Number(icuPenalty) === 0
          ? '0.0 pts (Optimal)'
          : formatSignedScore(icuPenalty),
      barPct: Math.min(100, Math.abs(Number(icuPenalty)) * 2),
      barColor: Number(icuPenalty) < 0 ? 'bg-rose-500' : 'bg-emerald-500',
      badgeColor:
        Number(icuPenalty) < 0
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Icon: HeartPulse,
    },
    {
      key: 'weather_hazard_penalty',
      title: 'Corridor Flood / Geohazard Intersection Factor',
      subtitle:
        Number(weatherHazardPenalty) < 0
          ? 'Active flood / rain hazard intersects primary route vector'
          : 'Zero active PAGASA flood or landslide intersections along corridor',
      value: weatherHazardPenalty,
      formatted: formatSignedScore(weatherHazardPenalty),
      barPct: Math.min(100, Math.abs(Number(weatherHazardPenalty)) * 2.5),
      barColor: Number(weatherHazardPenalty) < 0 ? 'bg-amber-500' : 'bg-emerald-500',
      badgeColor:
        Number(weatherHazardPenalty) < 0
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Icon: CloudRain,
    },
    {
      key: 'outbreak_proximity_penalty',
      title: 'Epidemiological Cluster Proximity Factor',
      subtitle:
        Number(outbreakProximityPenalty) < 0
          ? 'Proximity alert to active PIDSR infectious disease cluster'
          : 'Clear of active epidemiological containment zones',
      value: outbreakProximityPenalty,
      formatted: formatSignedScore(outbreakProximityPenalty),
      barPct: Math.min(100, Math.abs(Number(outbreakProximityPenalty)) * 3),
      barColor:
        Number(outbreakProximityPenalty) < 0 ? 'bg-violet-500' : 'bg-emerald-500',
      badgeColor:
        Number(outbreakProximityPenalty) < 0
          ? 'bg-violet-50 text-violet-700 border-violet-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Icon: Biohazard,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-bold text-slate-900">
                Algorithmic Route Safety Score (RSS) Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Multi-Variable Decision Support Audit • {originFacilityName} →{' '}
                <strong className="text-slate-700">{facility.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Composite RSS Summary Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Final Composite Route Safety Score (composite_rss)
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-extrabold text-slate-900">
                  {Number(compositeRss).toFixed(1)}{' '}
                  <span className="text-sm font-normal text-slate-500">/ 100</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${rssBadge.classes}`}
                >
                  <RssIcon className="w-3.5 h-3.5" />
                  <span>{rssBadge.label}</span>
                </span>
              </div>
            </div>

            <div className="sm:w-48 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Composite Index</span>
                <span className="font-bold text-slate-800">
                  {Math.round(compositeRss)}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${rssBadge.bar}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, Number(compositeRss)))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mathematical Equation Box */}
          <div className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-300">
              <Sigma className="w-3.5 h-3.5" />
              <span>Multi-Criteria Scoring Formula</span>
            </div>
            <code className="block text-xs font-mono text-slate-100 leading-relaxed break-words">
              RSS = clamp(Base_Distance_Score + Bed_Penalty + ICU_Penalty + Weather_Hazard_Penalty + Outbreak_Penalty, 0, 100)
            </code>
          </div>

          {/* Factor Breakdown List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Weighted Telemetry & Clinical Factors
            </h3>

            <div className="space-y-2.5">
              {factors.map((factor) => {
                const FactorIcon = factor.Icon;
                return (
                  <div
                    key={factor.key}
                    className="rounded-lg border border-slate-200 p-3.5 bg-white space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          <FactorIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {factor.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {factor.subtitle}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${factor.badgeColor}`}
                      >
                        {factor.formatted}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${factor.barColor}`}
                        style={{
                          width: `${Math.max(4, factor.barPct)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
              if (onDispatch) onDispatch(recommendation);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
          >
            <span>Proceed to Dispatch Patient</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
