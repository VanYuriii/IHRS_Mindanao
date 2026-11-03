import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Biohazard,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Header from './components/Header';
import AlertBanner from './components/AlertBanner';
import ReferralForm from './components/ReferralForm';
import HospitalCard from './components/HospitalCard';
import DispatchModal from './components/DispatchModal';
import {
  fetchFacilities,
  fetchRisks,
  getRecommendations,
  checkBackendHealth,
} from './services/api';

export default function App() {
  const [facilities, setFacilities] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [isBackendConnected, setIsBackendConnected] = useState(undefined);

  const [referralResponse, setReferralResponse] = useState(null);
  const [lastReferralContext, setLastReferralContext] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);

  const [activeModalRecommendation, setActiveModalRecommendation] = useState(null);
  const [dispatchLog, setDispatchLog] = useState([]);

  const initializeDashboardData = useCallback(async () => {
    try {
      const [healthy, facilitiesData, risksData] = await Promise.all([
        checkBackendHealth(),
        fetchFacilities().catch(() => null),
        fetchRisks().catch(() => null),
      ]);

      setIsBackendConnected(Boolean(healthy || facilitiesData));

      if (Array.isArray(facilitiesData)) {
        setFacilities(facilitiesData);
      }
      if (risksData) {
        setHazards(Array.isArray(risksData.hazards) ? risksData.hazards : []);
        setOutbreaks(Array.isArray(risksData.outbreaks) ? risksData.outbreaks : []);
      }
    } catch (error) {
      console.error('[App Init] Failed to initialize dashboard state:', error);
      setIsBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    initializeDashboardData();
  }, [initializeDashboardData]);

  const handleEvaluateReferral = async (formPayload) => {
    setIsEvaluating(true);
    setEvaluationError(null);
    setLastReferralContext(formPayload);

    try {
      const result = await getRecommendations({
        origin_facility_id: formPayload.origin_facility_id,
        patient_severity: formPayload.patient_severity,
        required_specialty: formPayload.required_specialty,
      });
      setReferralResponse(result);
      setIsBackendConnected(true);
    } catch (error) {
      setEvaluationError(
        error.message ||
          'Unable to connect to the FastAPI risk engine at http://localhost:8000.'
      );
      checkBackendHealth().then(setIsBackendConnected);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleOpenDispatchModal = (recommendation) => {
    setActiveModalRecommendation(recommendation);
  };

  const handleCloseDispatchModal = () => {
    setActiveModalRecommendation(null);
  };

  const handleConfirmTransferLog = (transferTicket) => {
    setDispatchLog((prev) => [transferTicket, ...prev]);
  };

  const recommendations = referralResponse?.recommendations || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Clinical Navigation Bar */}
      <Header isConnected={isBackendConnected} />

      {/* Top Collapsible Alert Ribbons */}
      <AlertBanner hazards={hazards} outbreaks={outbreaks} />

      {/* Main Two-Column Responsive Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Referral Dispatch Form & Active Regional Threat Feed */}
          <div className="lg:col-span-5 space-y-6">
            <ReferralForm
              facilities={facilities}
              onSubmit={handleEvaluateReferral}
              isLoading={isEvaluating}
            />

            {/* Active Regional Threat Feed Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-600" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Active Regional Threat Feed
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={initializeDashboardData}
                  title="Refresh telemetry from backend"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync</span>
                </button>
              </div>

              <div className="p-4 space-y-3">
                {hazards.length === 0 && outbreaks.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 text-center">
                    No active meteorological or epidemiological threats reported in Davao Region.
                  </p>
                ) : (
                  <>
                    {hazards.map((hazard) => (
                      <div
                        key={hazard.id}
                        className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            {hazard.type}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                            +{hazard.delay_penalty_minutes} min delay
                          </span>
                        </div>
                        <p className="text-amber-800 font-medium">{hazard.corridor_name}</p>
                        <p className="text-[11px] text-amber-700">
                          Corridor Severity: <strong>{hazard.severity}</strong> • Coords:{' '}
                          {hazard.coordinates?.lat}, {hazard.coordinates?.lng}
                        </p>
                      </div>
                    ))}

                    {outbreaks.map((cluster) => (
                      <div
                        key={cluster.id}
                        className="p-3 rounded-lg border border-violet-200 bg-violet-50/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-violet-900 flex items-center gap-1.5">
                            <Biohazard className="w-3.5 h-3.5 text-violet-700 shrink-0" />
                            {cluster.disease_type}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-100 text-violet-800 border border-violet-200">
                            {cluster.threat_level} Threat
                          </span>
                        </div>
                        <p className="text-violet-800 font-medium">{cluster.location_name}</p>
                        <p className="text-[11px] text-violet-700">
                          Exposure Radius: <strong>{cluster.risk_radius_km} km</strong> • Coords:{' '}
                          {cluster.coordinates?.lat}, {cluster.coordinates?.lng}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Confirmed Transfer Log History */}
            {dispatchLog.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Confirmed Transfer Log ({dispatchLog.length})
                    </h2>
                  </div>
                </div>
                <div className="p-4 space-y-2.5">
                  {dispatchLog.map((entry) => (
                    <div
                      key={entry.referral_id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">
                          {entry.referral_id}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          Logged at {entry.confirmed_at}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-800">
                        {entry.origin_facility} → {entry.receiving_facility}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Severity: {entry.patient_severity}</span>
                        <span>•</span>
                        <span>RSS: {entry.route_safety_score}/100</span>
                        <span>•</span>
                        <span>ETA: {entry.estimated_transit_minutes} mins</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Recommended Receiving Facilities Ranked by Route Safety Score */}
          <div className="lg:col-span-7 space-y-4">
            {/* Section Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recommended Tertiary Receiving Facilities
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked descending by multi-factor Route Safety Score (RSS 0–100)
                </p>
              </div>

              {referralResponse && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    Origin: {referralResponse.origin_facility?.name}
                  </span>
                  {lastReferralContext?.patient_severity && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      Acuity: {lastReferralContext.patient_severity}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Error Banner if API call failed */}
            {evaluationError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-rose-900">
                    Referral Route Evaluation Failed
                  </div>
                  <p>{evaluationError}</p>
                </div>
              </div>
            )}

            {/* Recommendations List or Empty State */}
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <HospitalCard
                    key={rec.facility?.id || index}
                    recommendation={rec}
                    rank={index + 1}
                    onDispatch={handleOpenDispatchModal}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    No Active Referral Evaluation
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select an originating Primary Care Facility (RHU), patient triage severity, and
                    required clinical specialty on the left, then click{' '}
                    <strong className="text-slate-700 font-semibold">
                      &ldquo;Evaluate Route &amp; Calculate Safety&rdquo;
                    </strong>{' '}
                    to rank receiving tertiary hospitals across Davao Region.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    RSS &ge; 75: Optimal Safety
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    RSS 50–74: Moderate Caution
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    RSS &lt; 50: Critical / High Risk
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Patient Dispatch Confirmation Modal */}
      <DispatchModal
        isOpen={Boolean(activeModalRecommendation)}
        recommendation={activeModalRecommendation}
        referralContext={lastReferralContext}
        onClose={handleCloseDispatchModal}
        onConfirm={handleConfirmTransferLog}
      />
    </div>
  );
}
