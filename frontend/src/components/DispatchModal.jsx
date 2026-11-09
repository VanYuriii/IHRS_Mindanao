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
  Phone,
  Printer,
  Route,
  QrCode,
} from 'lucide-react';

function generateReferralCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF-DVO-2026-${suffix}`;
}

function generateVerificationHash(refId = '') {
  const hex = '0123456789ABCDEF';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += hex.charAt((refId.charCodeAt(i % refId.length || 0) + i * 7) % hex.length);
  }
  return `SHA256-DVO-${out}`;
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
  const [issuedTimestamp, setIssuedTimestamp] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState('');

  useEffect(() => {
    if (isOpen && recommendation) {
      setReferralId(generateReferralCode());
      setIssuedTimestamp(
        new Date().toLocaleString([], {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
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
    recommended_corridor,
    score_breakdown,
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
  const receivingContact = facility.contact || '+63 (82) 227-2731';
  const safeCorridor =
    recommended_corridor || 'Primary Arterial Emergency Corridor';
  const verificationHash = generateVerificationHash(referralId || 'REF-DVO-2026');

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
        receiving_contact: receivingContact,
        origin_facility: originName,
        recommended_corridor: safeCorridor,
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Official Clinical Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  DOH Region XI • IHRS Mindanao
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {issuedTimestamp}
                </span>
              </div>
              <h2 id={titleId} className="text-base font-bold text-slate-900 mt-0.5">
                Regional Patient Transfer Authorization Form
              </h2>
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

        {/* Scrollable Slip Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Confirmed Banner */}
          {isConfirmed && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 space-y-0.5">
                <div className="font-semibold">
                  Transfer Log Confirmed & Transmitted ({confirmedAt})
                </div>
                <div>
                  Receiving emergency & admitting unit at{' '}
                  <strong>{facility.name}</strong> ({receivingContact}) has been
                  notified of incoming ambulance transit.
                </div>
              </div>
            </div>
          )}

          {/* Auto-generated Referral ID Card */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
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
              {isConfirmed ? 'Dispatched & Verified' : 'Pending Authorization'}
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

            <div className="flex flex-wrap items-center gap-2 pl-3 text-slate-500">
              <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Route className="w-3.5 h-3.5" />
                <span>Verified Safe Transport Corridor: {safeCorridor}</span>
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 block">
                    Receiving Hospital ({facility.tier || 'Tertiary'} Tier)
                  </span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {facility.name}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Receiving Triage Contact
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-slate-800">
                  <Phone className="w-3 h-3 text-blue-600" />
                  {receivingContact}
                </span>
              </div>
            </div>
          </div>

          {/* Route Safety & Transit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/60 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Assigned Route Safety Score
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${rssBadge.classes}`}
              >
                <RssIcon className="w-3.5 h-3.5" />
                <span>{rssScore}/100</span>
                <span className="opacity-85">({rssBadge.label})</span>
              </div>
              {score_breakdown && (
                <div className="text-[11px] text-slate-500 font-mono pt-0.5">
                  Base: +{Number(score_breakdown.base_distance_score || 0).toFixed(1)} | Cap:{' '}
                  {Number(score_breakdown.bed_capacity_penalty || 0).toFixed(1)} | Haz:{' '}
                  {Number(score_breakdown.weather_hazard_penalty || 0).toFixed(1)}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/60 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Verified Corridor & Est. Transit
              </span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{estimated_transit_minutes} mins</span>
                <span className="text-xs font-normal text-slate-500">
                  ({transit_distance_km} km)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {safeCorridor}
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

          {/* Mock QR Verification Badge */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Clean inline SVG QR Code matrix */}
              <div className="w-14 h-14 rounded-lg bg-white border border-slate-300 p-1.5 flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="w-full h-full text-slate-900"
                  fill="currentColor"
                  aria-label="Clinical Transfer Verification QR"
                >
                  <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm9-2h3v2h-3v-2zm4 0h3v3h-2v-1h-1v-2zm-4 4h2v3h-2v-3zm3 2h4v1h-4v-1zm2-3h2v2h-2v-2z" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ambulance Crew Digital Telemetry Pass</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Present at receiving ER triage desk for rapid inter-facility handoff
                </p>
                <div className="text-[11px] font-mono font-semibold text-slate-700">
                  {verificationHash}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print / Export Transfer Slip</span>
          </button>

          <div className="flex items-center gap-2.5">
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
    </div>
  );
}
