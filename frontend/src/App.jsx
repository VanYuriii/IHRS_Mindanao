import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Biohazard,
  Building2,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import Header from './components/Header';
import AlertBanner from './components/AlertBanner';
import MetricsBar from './components/MetricsBar';
import ScenarioBar from './components/ScenarioBar';
import ReferralForm from './components/ReferralForm';
import RegionalMap from './components/RegionalMap';
import HospitalCard from './components/HospitalCard';
import ScoreBreakdownModal from './components/ScoreBreakdownModal';
import DispatchModal from './components/DispatchModal';
import {
  fetchFacilities,
  fetchRisks,
  getRecommendations,
  checkBackendHealth,
} from './services/api';

const INITIAL_DEFENSE_PRESET = {
  id: 'flood_cutoff',
  scenario_mode: 'flood_cutoff',
  origin_facility_id: 'rhu-toril',
  patient_severity: 'CRITICAL',
  required_specialty: 'Trauma / Emergency',
  notes:
    'Critical vehicular trauma patient from Toril District RHU. MacArthur Highway / Matina Crossing flooded (+30m delay); requires upland bypass routing.',
  origin_facility: 'Toril District Health Center',
};

export default function App() {
  const [facilities, setFacilities] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [isBackendConnected, setIsBackendConnected] = useState(undefined);

  const [activeScenarioId, setActiveScenarioId] = useState('flood_cutoff');
  const [activePreset, setActivePreset] = useState(INITIAL_DEFENSE_PRESET);

  const [referralResponse, setReferralResponse] = useState(null);
  const [lastReferralContext, setLastReferralContext] = useState(INITIAL_DEFENSE_PRESET);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);

  const [selectedMapHospitalId, setSelectedMapHospitalId] = useState(null);
  const [inspectScoreRecommendation, setInspectScoreRecommendation] = useState(null);
  const [activeModalRecommendation, setActiveModalRecommendation] = useState(null);
  const [dispatchLog, setDispatchLog] = useState([]);

  const runReferralEvaluation = useCallback(async (payload, scenarioId = null) => {
    setIsEvaluating(true);
    setEvaluationError(null);
    setLastReferralContext(payload);
    if (scenarioId !== undefined) {
      setActiveScenarioId(scenarioId);
    }

    try {
      const result = await getRecommendations({
        origin_facility_id: payload.origin_facility_id,
        patient_severity: payload.patient_severity,
        required_specialty: payload.required_specialty,
        scenario_mode: payload.scenario_mode || null,
      });
      setReferralResponse(result);
      setIsBackendConnected(true);
      if (result?.recommendations?.length > 0) {
        setSelectedMapHospitalId(result.recommendations[0].facility?.id || null);
      }
    } catch (error) {
      setEvaluationError(
        error.message ||
          'Unable to connect to the FastAPI risk engine at http://localhost:8000.'
      );
      checkBackendHealth().then(setIsBackendConnected);
    } finally {
      setIsEvaluating(false);
    }
  }, []);

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
    runReferralEvaluation(INITIAL_DEFENSE_PRESET, INITIAL_DEFENSE_PRESET.id);
  }, [initializeDashboardData, runReferralEvaluation]);

  const handleSelectScenario = (presetPayload) => {
    const originObj = facilities.find((f) => f.id === presetPayload.origin_facility_id);
    const enrichedPayload = {
      ...presetPayload,
      origin_facility: originObj ? originObj.name : presetPayload.origin_facility_id,
    };
    setActivePreset(enrichedPayload);
    runReferralEvaluation(enrichedPayload, presetPayload.id);
  };

  const handleManualFormSubmit = (formPayload) => {
    // Manual form submit runs live spatial evaluation without preset override unless matching
    runReferralEvaluation({ ...formPayload, scenario_mode: null }, null);
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
  const originFacilityObj =
    referralResponse?.origin_facility ||
    facilities.find((f) => f.id === lastReferralContext?.origin_facility_id) ||
    null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Clinical Navigation Bar */}
      <Header isConnected={isBackendConnected} />

      {/* Top Collapsible Alert Ribbons */}
      <AlertBanner hazards={hazards} outbreaks={outbreaks} />

      {/* Main Executive Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Executive Metric Strip (4 Summary Cards) */}
        <MetricsBar facilities={facilities} hazards={hazards} outbreaks={outbreaks} />

        {/* 1-Click Defense Scenario Presets */}
        <ScenarioBar
          activeScenarioId={activeScenarioId}
          onSelectScenario={handleSelectScenario}
          isLoading={isEvaluating}
        />

        {/* Two-Column Responsive Clinical Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Referral Triage Form, Threat Feed & Transfer Log */}
          <div className="lg:col-span-5 space-y-6">
            <ReferralForm
              facilities={facilities}
              onSubmit={handleManualFormSubmit}
              isLoading={isEvaluating}
              activePreset={activePreset}
            />

            {/* Active Regional Threat Feed Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-600" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Active Regional Threat Feed ({hazards.length + outbreaks.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={initializeDashboardData}
                  title="Refresh telemetry from backend"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
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
                        {hazard.description && (
                          <p className="text-[11px] text-amber-700/90">{hazard.description}</p>
                        )}
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
                  {dispatchLog.map((entry, idx) => (
                    <div
                      key={`${entry.referral_id}-${idx}`}
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
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
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

          {/* Right Column (7 cols): Interactive GIS Map + Ranked Hospital Cards */}
          <div className="lg:col-span-7 space-y-5">
            {/* Interactive Davao Region GIS Map View */}
            <RegionalMap
              facilities={facilities}
              recommendations={recommendations}
              originFacility={originFacilityObj}
              hazards={hazards}
              outbreaks={outbreaks}
              selectedHospitalId={selectedMapHospitalId}
              onSelectHospital={(hospId) => setSelectedMapHospitalId(hospId)}
            />

            {/* Section Header for Ranked Tertiary Hospitals */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recommended Tertiary Receiving Facilities ({recommendations.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked descending by multi-factor Route Safety Score (RSS 0–100) • Click{' '}
                  <strong>Inspect Route Score</strong> for mathematical factor deductions
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
                    isSelectedOnMap={selectedMapHospitalId === rec.facility?.id}
                    onSelectOnMap={(itemOrId) =>
                      setSelectedMapHospitalId(itemOrId?.facility?.id || itemOrId?.id || itemOrId)
                    }
                    onInspectScore={(recItem) => setInspectScoreRecommendation(recItem)}
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
                    Select one of the <strong>1-Click Defense Scenario Presets</strong> above or
                    submit a clinical referral query on the left to rank receiving tertiary
                    hospitals across the Davao Region.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Algorithmic Factor Breakdown Modal / Drawer */}
      <ScoreBreakdownModal
        isOpen={Boolean(inspectScoreRecommendation)}
        recommendation={inspectScoreRecommendation}
        originFacilityName={referralResponse?.origin_facility?.name || lastReferralContext?.origin_facility}
        patientSeverity={lastReferralContext?.patient_severity}
        onClose={() => setInspectScoreRecommendation(null)}
        onDispatch={(recItem) => {
          setInspectScoreRecommendation(null);
          handleOpenDispatchModal(recItem);
        }}
      />

      {/* Official Regional Patient Transfer Authorization Slip Modal */}
      <DispatchModal
        isOpen={Boolean(activeModalRecommendation)}
        recommendation={activeModalRecommendation}
        referralContext={{
          ...lastReferralContext,
          origin_facility:
            referralResponse?.origin_facility?.name || lastReferralContext?.origin_facility,
        }}
        onClose={handleCloseDispatchModal}
        onConfirm={handleConfirmTransferLog}
      />
    </div>
  );
}
