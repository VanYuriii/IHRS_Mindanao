# Intelligent Healthcare Referral System (IHRS) with External Risk Assessment
### Pilot Area: Davao Region / Mindanao, Philippines

Functional Proof-of-Concept (PoC) prototype for the academic research paper:
> **"Intelligent Healthcare Referral System (IHRS) with External Risk Assessment for Mindanao, Philippines"**

---

## Architecture Overview

The system addresses the critical problem of emergency patient transfers in resource-constrained, geographically challenging, and hazard-prone regions of Mindanao. In rural health units (RHUs), selecting a tertiary receiving hospital traditionally relies only on bed availability or static distance, frequently leading to ambulances being delayed by river flash floods, landslides on mountain bypasses, or severe hospital ICU deficits.

IHRS introduces an **automated Multi-Factor Route Safety Score (RSS)** algorithm evaluating:
1. **Dynamic Transit Time ($P_{transit}$)**: Real-time road corridor distance and speed calculations.
2. **Receiving Bed & ICU Capacity ($P_{capacity}$ / $P_{icu}$)**: Real-time bed occupancy with acute penalties for critical patients when 0 ICU beds are available.
3. **Hazard Corridor Interception ($P_{hazard}$)**: Geometric route-to-hazard proximity detecting flash floods, landslides, and road closures (e.g. MacArthur Highway, CP Garcia Diversion Road).
4. **Epidemiological Surveillance ($P_{outbreak}$)**: Proximity to active localized disease clusters (e.g., Dengue surge in Buhangin, Leptospirosis in Agdao).

### Composite Route Safety Score Formula
$$\text{RSS} = \max\left(5, \min\left(100, 100 - (P_{transit} + P_{capacity} + P_{hazard} + P_{icu})\right)\right)$$

---

## Project Structure

```
ihrs-mindanao/
├── backend/
│   ├── main.py                     # FastAPI application entry & CORS middleware
│   ├── requirements.txt            # Python dependencies
│   ├── models/
│   │   └── schemas.py              # Pydantic schemas (Hospital, Hazard, Referral, etc.)
│   ├── routers/
│   │   ├── referrals.py            # /api/referrals/recommend & /dispatch
│   │   ├── hospitals.py            # /api/hospitals & /reset
│   │   └── risks.py                # /api/risks (hazards & outbreaks)
│   ├── services/
│   │   ├── risk_engine.py          # Multi-factor Route Safety Score (RSS) engine
│   │   └── data_store.py           # In-memory mock database & simulation manager
│   └── mock_data/
│       ├── hospitals.json          # SPMC, Davao Doctors, MDMRC, Toril RHU, Bunawan RHU, Calinan RHU
│       ├── hazards.json            # MacArthur Highway flood, CP Garcia landslide, Buhangin ponding
│       └── outbreaks.json          # Buhangin Dengue cluster, Agdao Leptospirosis
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js              # Vite server & API reverse proxy configuration
    ├── tailwind.config.js          # Tailwind CSS theme configuration
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── components/
        │   ├── AlertBanner.jsx      # Live meteorological & outbreak risk surveillance
        │   ├── ReferralForm.jsx     # Origin clinic & clinical triage form
        │   ├── HospitalCard.jsx     # Ranked recommendations & bed/ICU status
        │   └── RouteSafetyCard.jsx  # Multi-factor penalty deduction breakdown
        └── pages/
            └── DispatchDashboard.jsx# Main interactive referral dispatch control room
```

---

## Quickstart & Execution

### 1. Backend Setup (FastAPI)
```bash
cd backend

# Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
- API Documentation (Swagger UI): `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 2. Frontend Setup (React + Vite + Tailwind)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- Web Application UI: `http://localhost:5173`

---

## Simulation Capabilities

1. **Dynamic Rerouting / Hazard Toggle**:
   - In the top Alert Banner, click **"Inspect Hazards & Outbreaks"**.
   - Toggle any active hazard (e.g. *MacArthur Highway Flood*).
   - The RSS algorithm instantly recalculates routes, updates delays, and adjusts hospital rankings.
2. **Critical Care ICU Safeguard**:
   - Change patient severity from **"Low"** to **"Critical"**.
   - Watch the algorithm automatically apply ICU penalties (-35 points) to any facility with 0 critical care beds, preventing dangerous patient diversions.
3. **Dispatch Locking & Capacity Tracking**:
   - Click **"Confirm Dispatch"** on any recommended facility.
   - A unique tracking code (e.g., `IHRS-DVO-XXXX`) is issued, and the destination hospital's available bed count is decremented in real-time.

