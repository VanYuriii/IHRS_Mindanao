from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import facilities, referrals

app = FastAPI(
    title="Intelligent Healthcare Referral System (IHRS) - Phase 1 API",
    description=(
        "Spatial risk-assessment and emergency patient referral engine for the "
        "Davao Region / Mindanao case study."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(referrals.router)
app.include_router(facilities.router)


@app.get("/", tags=["Health"])
def root():
    """Root health check endpoint."""
    return {
        "status": "online",
        "service": "Intelligent Healthcare Referral System (IHRS)",
        "region": "Davao Region / Mindanao, Philippines",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """Service health check endpoint."""
    return {"status": "healthy"}
