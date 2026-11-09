import React from 'react';
import {
  CheckCircle2,
  CloudRain,
  HeartPulse,
  Play,
  Sparkles,
  Loader2,
} from 'lucide-react';

export const SCENARIO_PRESETS = [
  {
    id: 'routine',
    title: 'Routine Operations (Clear Weather)',
    badge: 'Scenario 1 • Baseline',
    description:
      'Origin: Mintal RHU | Severity: Moderate | SPMC ranks #1 with clean routes',
    theme: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activeRing: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    Icon: CheckCircle2,
    payload: {
      id: 'routine',
      scenario_mode: 'routine',
      origin_facility_id: 'rhu-mintal',
      patient_severity: 'MODERATE',
      required_specialty: 'General Medicine',
      notes:
        'Routine inter-facility referral from Mintal Comprehensive Clinic under clear regional weather conditions.',
    },
  },
  {
    id: 'flood_cutoff',
    title: 'Matina Flash Flood (Route Cutoff)',
    badge: 'Scenario 2 • Hazard Rerouting',
    description:
      'Origin: Toril District RHU | Severity: Critical Trauma | Detects MacArthur Hwy flood & reroutes via bypass',
    theme: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      activeRing: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    Icon: CloudRain,
    payload: {
      id: 'flood_cutoff',
      scenario_mode: 'flood_cutoff',
      origin_facility_id: 'rhu-toril',
      patient_severity: 'CRITICAL',
      required_specialty: 'Trauma / Emergency',
      notes:
        'Critical vehicular trauma patient from Toril District RHU. MacArthur Highway / Matina Crossing flooded (+30m delay); requires upland bypass routing.',
    },
  },
  {
    id: 'icu_surge',
    title: 'Public Health Surge & ICU Saturation',
    badge: 'Scenario 3 • Capacity Reallocation',
    description:
      'Origin: Bunawan RHU | Severity: Critical ICU | SPMC ICU 100% full; reallocates to MDMRC or San Pedro',
    theme: {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      activeRing: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
    },
    Icon: HeartPulse,
    payload: {
      id: 'icu_surge',
      scenario_mode: 'icu_surge',
      origin_facility_id: 'rhu-bunawan',
      patient_severity: 'CRITICAL',
      required_specialty: 'Intensive Care (ICU)',
      notes:
        'Critical acute respiratory / dengue shock patient at Bunawan RHU. SPMC ICU at 100% saturation; requires immediate tertiary ICU reallocation.',
    },
  },
];

export default function ScenarioBar({
  activeScenarioId,
  onSelectScenario,
  isLoading = false,
}) {
  return (
    <section
      aria-label="Live Defense Demonstration Presets"
      className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Live Defense Demonstration Presets
            </h2>
            <p className="text-xs text-slate-500">
              One-click clinical triage & regional hazard simulation scenarios for panel evaluation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Recomputing RSS Telemetry...</span>
            </span>
          )}
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
            Interactive Panel Mode
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SCENARIO_PRESETS.map((scenario) => {
          const isSelected = activeScenarioId === scenario.id;
          const IconComponent = scenario.Icon;

          return (
            <button
              key={scenario.id}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectScenario && onSelectScenario(scenario.payload)}
              className={`group text-left rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected
                  ? scenario.theme.activeRing
                  : 'border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${scenario.theme.badge}`}
                  >
                    {scenario.badge}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      isSelected
                        ? 'text-blue-600'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isSelected ? 'Active' : 'Run Preset'}</span>
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${scenario.theme.iconBg}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {scenario.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
