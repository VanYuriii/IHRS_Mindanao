const API_BASE_URL = 'http://localhost:8000';

/**
 * Fetch all medical facilities in Mindanao.
 * @returns {Promise<Array<{id: string, name: string, tier: string, total_beds: number, available_beds: number, icu_available: number, coordinates: {lat: number, lng: number}}>>}
 */
export async function fetchFacilities() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/facilities`);
    if (!response.ok) {
      throw new Error(`Failed to fetch facilities: HTTP ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[API Error] Unable to fetch facilities from backend:', error);
    throw error;
  }
}

/**
 * Fetch current road hazards and active infectious disease outbreaks.
 * @returns {Promise<{hazards: Array, outbreaks: Array}>}
 */
export async function fetchRisks() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/risks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch risks: HTTP ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[API Error] Unable to fetch risk intelligence data from backend:', error);
    throw error;
  }
}

/**
 * Request AI-ranked hospital referral recommendations.
 * @param {{origin_facility_id: string, patient_severity: string, required_specialty: string}} payload
 * @returns {Promise<{origin_facility: Object, timestamp: string, recommendations: Array}>}
 */
export async function getRecommendations(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/referrals/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin_facility_id: payload.origin_facility_id,
        patient_severity: payload.patient_severity,
        required_specialty: payload.required_specialty,
      }),
    });
    if (!response.ok) {
      const errorDetail = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch referral recommendations: HTTP ${response.status} ${response.statusText}${errorDetail ? ` - ${errorDetail}` : ''}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error('[API Error] Unable to get referral recommendations:', error);
    throw error;
  }
}

/**
 * Check if the backend service is reachable and healthy.
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data?.status === 'healthy' || response.ok;
  } catch (error) {
    console.warn('[API Health] Backend unreachable:', error);
    return false;
  }
}
