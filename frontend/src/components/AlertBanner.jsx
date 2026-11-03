import React, { useState, useEffect } from 'react';
import { AlertTriangle, Biohazard, ChevronDown, ChevronUp, Clock, ShieldAlert } from 'lucide-react';
import { fetchRisks } from '../services/api';

export default function AlertBanner({ hazards: propHazards, outbreaks: propOutbreaks }) {
  const [internalHazards, setInternalHazards] = useState([]);
  const [internalOutbreaks, setInternalOutbreaks] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (propHazards !== undefined && propOutbreaks !== undefined) {
      return;
    }

    let isMounted = true;

    const loadRisks = async () => {
      try {
        const data = await fetchRisks();
        if (isMounted && data) {
          if (propHazards === undefined && Array.isArray(data.hazards)) {
            setInternalHazards(data.hazards);
          }
          if (propOutbreaks === undefined && Array.isArray(data.outbreaks)) {
            setInternalOutbreaks(data.outbreaks);
          }
        }
      } catch {
        // Handled silently if backend is unreachable; Header displays offline state
      }
    };

    loadRisks();

    return () => {
      isMounted = false;
    };
  }, [propHazards, propOutbreaks]);

  const hazards = propHazards !== undefined ? propHazards : internalHazards;
  const outbreaks = propOutbreaks !== undefined ? propOutbreaks : internalOutbreaks;

  const totalAlerts = (hazards?.length || 0) + (outbreaks?.length || 0);

  if (totalAlerts === 0) {
    return null;
  }

  return (
    <section
      aria-label="Regional Risk and Epidemiological Alerts"
      className="bg-slate-50 border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Summary bar with collapse toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Active Corridor &amp; Epidemiological Advisories ({totalAlerts})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <span>{isCollapsed ? 'Show Advisories' : 'Hide Advisories'}</span>
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Stacked clinical alert ribbons */}
        {!isCollapsed && (
          <div className="mt-2 space-y-1.5">
            {hazards.map((hazard) => {
              const isHighSeverity =
                hazard.severity?.toLowerCase() === 'high' ||
                hazard.severity?.toLowerCase() === 'critical';

              const ribbonClasses = isHighSeverity
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900';

              const badgeClasses = isHighSeverity
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : 'bg-amber-100 text-amber-800 border-amber-200';

              return (
                <div
                  key={hazard.id}
                  className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg border text-xs ${ribbonClasses}`}
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span className="font-semibold">
                      Active {hazard.type || 'Road'} Warning:
                    </span>
                    <span className="font-medium">{hazard.corridor_name}</span>
                    <span className="font-semibold">
                      (+{hazard.delay_penalty_minutes} min delay)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${badgeClasses}`}
                    >
                      <Clock className="w-3 h-3" />
                      Severity: {hazard.severity}
                    </span>
                  </div>
                </div>
              );
            })}

            {outbreaks.map((outbreak) => (
              <div
                key={outbreak.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg border text-xs bg-violet-50 border-violet-200 text-violet-900"
              >
                <div className="flex items-center gap-2.5">
                  <Biohazard className="w-4 h-4 shrink-0 text-violet-700" />
                  <span className="font-semibold">
                    {outbreak.disease_type} Surge Cluster:
                  </span>
                  <span className="font-medium">{outbreak.location_name}</span>
                  <span className="font-semibold">
                    ({outbreak.risk_radius_km} km threat radius)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-violet-100 text-violet-800 border border-violet-200">
                    Threat Level: {outbreak.threat_level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
