import React, { useState, useEffect, useId } from 'react';
import {
  Building2,
  AlertCircle,
  Stethoscope,
  FileText,
  Navigation,
  Loader2,
  Activity,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { fetchFacilities } from '../services/api';

const SEVERITY_OPTIONS = [
  {
    value: 'LOW',
    label: 'Standard Referral',
    sublabel: 'Non-urgent consultation',
    icon: ShieldCheck,
    activeStyles: 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500',
    badgeStyles: 'bg-emerald-100 text-emerald-700',
  },
  {
    value: 'MODERATE',
    label: 'Urgent Transfer',
    sublabel: 'Priority clinical admission',
    icon: AlertTriangle,
    activeStyles: 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500',
    badgeStyles: 'bg-amber-100 text-amber-700',
  },
  {
    value: 'CRITICAL',
    label: 'Immediate Emergency',
    sublabel: 'Life-critical stabilization',
    icon: AlertCircle,
    activeStyles: 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500',
    badgeStyles: 'bg-rose-100 text-rose-700',
  },
];

const SPECIALTY_OPTIONS = [
  'General Medicine',
  'Trauma / Emergency',
  'Pediatrics',
  'Infectious Disease',
  'Intensive Care (ICU)',
  'Cardiology & Surgery',
];

const FALLBACK_PRIMARY_FACILITIES = [
  {
    id: 'rhu-toril',
    name: 'Toril District Health Center',
    tier: 'Primary',
  },
  {
    id: 'rhu-bunawan',
    name: 'Bunawan District Health Center',
    tier: 'Primary',
  },
  {
    id: 'rhu-calinan',
    name: 'Calinan District Health Center',
    tier: 'Primary',
  },
  {
    id: 'rhu-mintal',
    name: 'Mintal Comprehensive Clinic',
    tier: 'Primary',
  },
];

export default function ReferralForm({
  facilities = [],
  onSubmit,
  isLoading = false,
  activePreset = null,
}) {
  const formId = useId();
  const [localFacilities, setLocalFacilities] = useState(facilities);
  const [originFacilityId, setOriginFacilityId] = useState('rhu-toril');
  const [patientSeverity, setPatientSeverity] = useState('CRITICAL');
  const [requiredSpecialty, setRequiredSpecialty] = useState('Trauma / Emergency');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (activePreset) {
      if (activePreset.origin_facility_id) {
        setOriginFacilityId(activePreset.origin_facility_id);
      }
      if (activePreset.patient_severity) {
        setPatientSeverity(activePreset.patient_severity);
      }
      if (activePreset.required_specialty) {
        setRequiredSpecialty(activePreset.required_specialty);
      }
      if (activePreset.notes !== undefined) {
        setNotes(activePreset.notes);
      }
    }
  }, [activePreset]);

  useEffect(() => {
    if (facilities && facilities.length > 0) {
      setLocalFacilities(facilities);
    } else {
      let isMounted = true;
      fetchFacilities()
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setLocalFacilities(data);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLocalFacilities(FALLBACK_PRIMARY_FACILITIES);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [facilities]);

  const primaryFacilities = React.useMemo(() => {
    const filtered = (localFacilities || []).filter((f) => f.tier === 'Primary');
    return filtered.length > 0 ? filtered : FALLBACK_PRIMARY_FACILITIES;
  }, [localFacilities]);

  useEffect(() => {
    if (
      primaryFacilities.length > 0 &&
      !primaryFacilities.some((f) => f.id === originFacilityId)
    ) {
      setOriginFacilityId(primaryFacilities[0].id);
    }
  }, [primaryFacilities, originFacilityId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!onSubmit || isLoading) return;

    const selectedOrigin = primaryFacilities.find((f) => f.id === originFacilityId);
    onSubmit({
      origin_facility_id: originFacilityId,
      patient_severity: patientSeverity,
      required_specialty: requiredSpecialty,
      notes: notes.trim(),
      origin_facility: selectedOrigin ? selectedOrigin.name : originFacilityId,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Clinical Referral & Triage</h2>
            <p className="text-xs text-slate-500">Origin RHU dispatch & route safety evaluation</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          DOH Referral Protocol
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Origin Facility Selector */}
        <div>
          <label
            htmlFor={`${formId}-origin`}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            Origin Primary Care Facility (RHU)
          </label>
          <select
            id={`${formId}-origin`}
            value={originFacilityId}
            onChange={(e) => setOriginFacilityId(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-400"
          >
            {primaryFacilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name} ({facility.tier})
              </option>
            ))}
          </select>
        </div>

        {/* Patient Severity Toggle */}
        <fieldset>
          <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            Patient Triage Severity
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup">
            {SEVERITY_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = patientSeverity === option.value;
              return (
                <label
                  key={option.value}
                  className={`relative flex flex-col justify-between p-3 rounded-lg border cursor-pointer transition select-none ${
                    isSelected
                      ? option.activeStyles
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <input
                    type="radio"
                    name="patient_severity"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setPatientSeverity(option.value)}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                        isSelected ? option.badgeStyles : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {option.value}
                    </span>
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? 'opacity-100' : 'text-slate-400 opacity-70'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-snug">{option.label}</div>
                    <div className="text-[11px] opacity-75 mt-0.5 leading-tight">
                      {option.sublabel}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Required Specialty Selector */}
        <div>
          <label
            htmlFor={`${formId}-specialty`}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2"
          >
            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
            Required Clinical Specialty
          </label>
          <select
            id={`${formId}-specialty`}
            value={requiredSpecialty}
            onChange={(e) => setRequiredSpecialty(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-400"
          >
            {SPECIALTY_OPTIONS.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </div>

        {/* Patient Summary Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor={`${formId}-notes`}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Patient Clinical Summary Notes
            </label>
            <span className="text-[11px] text-slate-400">Optional</span>
          </div>
          <textarea
            id={`${formId}-notes`}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
            placeholder="Enter vital signs, presenting symptoms, or transit support needs (e.g., O2 support, ventilator required)..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Evaluating Route & Calculating Safety...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              <span>Evaluate Route & Calculate Safety</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
