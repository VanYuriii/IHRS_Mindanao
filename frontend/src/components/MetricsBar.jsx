import React from 'react';
import {
  Building2,
  CloudRain,
  Biohazard,
  Bed,
  HeartPulse,
} from 'lucide-react';

export default function MetricsBar({
  facilities = [],
  hazards = [],
  outbreaks = [],
}) {
  const totalFacilities = facilities.length || 9;
  const primaryCount = facilities.filter(
    (f) => String(f.tier || '').toLowerCase() === 'primary'
  ).length;
  const tertiaryFacilities = facilities.filter(
    (f) => String(f.tier || '').toLowerCase() === 'tertiary'
  );
  const tertiaryCount = tertiaryFacilities.length;

  const rhuDisplay = primaryCount || 4;
  const tertiaryDisplay = tertiaryCount || 5;

  // Calculate Tertiary Bed Saturation & ICU availability
  const totalBeds = tertiaryFacilities.reduce(
    (acc, f) => acc + (Number(f.total_beds) || 0),
    0
  );
  const availableBeds = tertiaryFacilities.reduce(
    (acc, f) => acc + (Number(f.available_beds) || 0),
    0
  );
  const totalIcuAvailable = tertiaryFacilities.reduce(
    (acc, f) => acc + (Number(f.icu_available) || 0),
    0
  );

  const occupancyPct =
    totalBeds > 0
      ? Math.round(((totalBeds - availableBeds) / totalBeds) * 1000) / 10
      : 84.2;

  const activeHazardsCount = hazards.length;
  const hazardCorridors =
    hazards.length > 0
      ? hazards
          .map((h) => h.affected_corridor || h.name?.split('(')[0]?.trim())
          .filter(Boolean)
          .slice(0, 2)
          .join(' & ') || 'MacArthur Hwy & CP Garcia'
      : 'MacArthur Hwy & CP Garcia';

  const activeOutbreaksCount = outbreaks.length;
  const outbreakSectors =
    outbreaks.length > 0
      ? outbreaks
          .map((o) => o.barangay || o.sector || o.name?.split('—')[0]?.trim())
          .filter(Boolean)
          .slice(0, 2)
          .join(' & ') || 'Bucana & Agdao District'
      : 'Bucana & Agdao District';

  const saturationColor =
    occupancyPct >= 90
      ? 'bg-rose-500'
      : occupancyPct >= 75
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const saturationBadge =
    occupancyPct >= 90
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : occupancyPct >= 75
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <section
      aria-label="Regional Telemetry Executive Summary"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* Card 1: Monitored Regional Facilities */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              Monitored Regional Facilities
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {totalFacilities}
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Online
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>
            <strong className="font-semibold text-slate-800">{rhuDisplay}</strong> Primary RHUs
          </span>
          <span className="text-slate-300">•</span>
          <span>
            <strong className="font-semibold text-slate-800">{tertiaryDisplay}</strong> Tertiary Hospitals
          </span>
        </div>
      </div>

      {/* Card 2: Active Climate / Flood Hazards */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              Active Climate / Flood Hazards
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {activeHazardsCount}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  activeHazardsCount > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {activeHazardsCount > 0 ? 'PAGASA Advisory' : 'Clear Corridors'}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <CloudRain className="w-4 h-4" />
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 truncate">
          <span className="text-slate-400 mr-1">Corridors:</span>
          <strong className="font-semibold text-slate-800">
            {activeHazardsCount > 0 ? hazardCorridors : 'All Primary Arterials Clear'}
          </strong>
        </div>
      </div>

      {/* Card 3: Surveillance Outbreak Clusters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              Surveillance Outbreak Clusters
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {activeOutbreaksCount}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  activeOutbreaksCount > 0
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {activeOutbreaksCount > 0 ? 'PIDSR Monitored' : 'Zero Clusters'}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-violet-50 border border-violet-200 text-violet-600 flex items-center justify-center shrink-0">
            <Biohazard className="w-4 h-4" />
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 truncate">
          <span className="text-slate-400 mr-1">Sectors:</span>
          <strong className="font-semibold text-slate-800">
            {activeOutbreaksCount > 0 ? outbreakSectors : 'No Active Bio-Surveillance Zones'}
          </strong>
        </div>
      </div>

      {/* Card 4: Average Regional Bed Saturation */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col justify-between gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              Average Regional Bed Saturation
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {occupancyPct.toFixed(1)}%
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${saturationBadge}`}
              >
                <HeartPulse className="w-3 h-3" />
                <span>{totalIcuAvailable} ICU Free</span>
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Bed className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-300 ${saturationColor}`}
              style={{ width: `${Math.min(100, Math.max(0, occupancyPct))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Available: <strong className="text-slate-700">{availableBeds}</strong> / {totalBeds} beds
            </span>
            <span>Tertiary Pool</span>
          </div>
        </div>
      </div>
    </section>
  );
}
