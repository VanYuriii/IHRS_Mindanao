import React, { useState, useEffect, useId } from 'react';
import {
  CheckCircle2,
  X,
  Building2,
  ArrowRight,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Stethoscope,
  Activity,
  ClipboardCheck,
} from 'lucide-react';

function generateReferralCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF-DVO-2026-${suffix}`;
}

function getRssBadge(score) {
  if (score >= 75) {
    return {
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Icon: ShieldCheck,
      label: 'Optimal Safety',
    };
  }
  if (score >= 50) {
    return {
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      Icon: AlertTriangle,
      label: 'Moderate Caution',
    };
  }
  return {
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
    Icon: ShieldAlert,
    label: 'High Risk Route',
  };
}

function getSeverityBadge(severity = 'CRITICAL') {
  const upper = String(severity).toUpperCase();
  if (upper === 'LOW') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (upper === 'MODERATE') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

export default function DispatchModal({
  isOpen,
  recommendation,
  referralContext = {},
  onClose,
  onConfirm,
}) {
  const titleId = useId();
  const [referralId, setReferralId] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState('');

  useEffect(() => {
    if (isOpen && recommendation) {
      setReferralId(generateReferralCode());
      setIsConfirmed(false);
      setConfirmedAt('');
    }
  }, [isOpen, recommendation]);

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
    transit_distance_km,
    estimated_transit_minutes,
    route_safety_score,
  } = recommendation;

  const rssScore = Math.round(Number(route_safety_score) || 0);
  const rssBadge = getRssBadge(rssScore);
  const RssIcon = rssBadge.Icon;

  const originName =
    referralContext?.origin_facility ||
    referralContext?.originFacilityName ||
    'Toril District Health Center (RHU)';
  const severity = referralContext?.patient_severity || 'CRITICAL';
  const specialty = referralContext?.required_specialty || 'Intensive Care (ICU)';
  const notes = referralContext?.notes || '';

  const handleConfirm = () => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setIsConfirmed(true);
    setConfirmedAt(timestamp);
    if (onConfirm) {
      onConfirm({
        referral_id: referralId,
        receiving_facility: facility.name,
        origin_facility: originName,
        route_safety_score: rssScore,
        estimated_transit_minutes,
        transit_distance_km,
        patient_severity: severity,
        required_specialty: specialty,
        notes,
        confirmed_at: timestamp,
      });
    }
  };

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
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                isConfirmed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}
            >
              {isConfirmed ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <ClipboardCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 id={titleId} className="text-base font-bold text-slate-900">
                {isConfirmed
                  ? 'Patient Referral Dispatch Logged'
                  : 'Confirm Clinical Patient Dispatch'}
              </h2>
              <p className="text-xs text-slate-500">
                Mindanao Inter-Hospital Referral System (IHRS)
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

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Confirmed Banner */}
          {isConfirmed && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 space-y-0.5">
                <div className="font-semibold">
                  Transfer Log Confirmed & Transmitted ({confirmedAt})
                </div>
                <div>
                  Receiving emergency & admitting unit at <strong>{facility.name}</strong> has been
                  notified of incoming ambulance transit.
                </div>
              </div>
            </div>
          )}

          {/* Auto-generated Referral ID Card */}
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Official Referral Tracking ID
              </span>
              <span className="font-mono text-sm font-bold text-slate-900 tracking-wide">
                {referralId}
              </span>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isConfirmed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isConfirmed ? 'Dispatched' : 'Pending Confirmation'}
            </span>
          </div>

          {/* Origin -> Receiving Facility Transfer Route */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Origin Primary Care Facility
                </span>
                <span className="text-sm font-semibold text-slate-800 block truncate">
                  {originName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-3 text-slate-400">
              <ArrowRight className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-500">
                Direct Ambulance Corridor ({transit_distance_km} km)
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 block">
                  Receiving Hospital ({facility.tier || 'Tertiary'} Tier)
                </span>
                <span className="text-sm font-bold text-slate-900 block">{facility.name}</span>
              </div>
            </div>
          </div>

          {/* Route Safety & Transit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                Assigned Route Safety Score
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${rssBadge.classes}`}
              >
                <RssIcon className="w-3.5 h-3.5" />
                <span>{rssScore}/100</span>
                <span className="opacity-85">({rssBadge.label})</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                Estimated Transit Time
              </span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{estimated_transit_minutes} mins</span>
                <span className="text-xs font-normal text-slate-500">
                  ({transit_distance_km} km)
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Triage Details */}
          <div className="rounded-lg border border-slate-200 p-3.5 space-y-2.5 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span>Severity:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getSeverityBadge(
                    severity
                  )}`}
                >
                  {severity}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                <span>Specialty:</span>
                <strong className="font-semibold text-slate-900">{specialty}</strong>
              </div>
            </div>

            {notes && (
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-1 font-semibold text-slate-700 mb-0.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clinical Summary Notes:</span>
                </div>
                <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  {notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Close
          </button>

          {!isConfirmed && (
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Transfer Log</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
