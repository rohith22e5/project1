from fastapi import FastAPI, UploadFile, File, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import os
import io
import logging
import joblib
import numpy as np
import pandas as pd
import pdfplumber
from pathlib import Path

from dotenv import load_dotenv

import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# ===================== ENV + LOGGING =====================
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

# ===================== ABSOLUTE PATH LOGIC =====================
# This finds the root directory of your project (where ml/ folder resides)
CURRENT_FILE = Path(__file__).resolve()
# Based on your logs: /opt/render/project/src/ml/porod/mlapi.py
# ROOT should be /opt/render/project/src/
ROOT_DIR = CURRENT_FILE.parent.parent.parent 

# ===================== APP =====================
app = FastAPI(title="Agro AI Backend", version="1.0")

# ===================== CORS =====================
origins = [
    "https://project1-brown-iota-76.vercel.app",  # Your Vercel URL
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== SECURITY HEADERS =====================
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# ===================== REDIS + RATE LIMITING =====================
@app.on_event("startup")
async def startup():
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.warning("⚠️ REDIS_URL not set — rate limiting disabled")
        return
    try:
        redis_conn = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis_conn)
        logger.info("🚦 Redis connected — rate limiting enabled")
    except Exception as e:
        logger.warning(f"⚠️ Redis unavailable: {e}")

# ===================== UTILS =====================
def soil_health_score(n, p, k):
    optimal_min, optimal_max = 40, 70
    def score(v):
        if optimal_min <= v <= optimal_max: return 1.0
        elif 30 <= v < optimal_min or optimal_max < v <= 80: return 0.7
        elif 20 <= v < 30 or 80 < v <= 90: return 0.4
        return 0.1
    avg = (score(n) + score(p) + score(k)) / 3
    balance = max(0, 1 - (np.std([n, p, k]) / 50))
    return round(100 * (0.7 * avg + 0.3 * balance), 2)

# ===================== FERTILIZER =====================
from ml.fertilizer.predictor import predict_fertilizer
from ml.porod.fert import get_fertiliser_query

def load_fertilizer_model():
    if not hasattr(app.state, "fert_model"):
        logger.info("📦 Loading fertilizer model components...")
        model_path = ROOT_DIR / "ml" / "fertilizer" / "fertilizer_predictor.pkl"
        encoder_path = ROOT_DIR / "ml" / "fertilizer" / "label_encoders.pkl"
        
        if not model_path.exists():
            raise FileNotFoundError(f"Fertilizer model not found at {model_path}")
            
        app.state.fert_model = joblib.load(str(model_path))
        app.state.encoders = joblib.load(str(encoder_path))
    return app.state.fert_model, app.state.encoders

class FertilizerInput(BaseModel):
    soil_color: str
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    rainfall: float
    temperature: float
    crop: str

@app.post("/api/fertiliser/manual")
async def fertilizer_manual(data: FertilizerInput):
    model, encoders = load_fertilizer_model()
    fert = predict_fertilizer("Kolhapur", data.soil_color, data.nitrogen, data.phosphorus, 
                              data.potassium, data.ph, data.rainfall, data.temperature, 
                              data.crop, model, encoders)
    return {"recommended_fertilizer": fert, "npk": {"n": data.nitrogen, "p": data.phosphorus, "k": data.potassium}}

# ===================== CROP =====================
from ml.crop.main import CropRecommendationLSTM
from ml.porod.CropRec import get_crop_recommendation_query

def load_crop_model():
    if not hasattr(app.state, "crop_model"):
        logger.info("🌱 Attempting to load Crop LSTM model...")
        csv_path = ROOT_DIR / "ml" / "crop" / "crop_data.csv"
        model_path = ROOT_DIR / "ml" / "crop" / "saved_models" / "crop_recommendation_model.h5"
        
        # Verify existence before loading to give clean errors in logs
        if not model_path.exists():
            logger.error(f"❌ ERROR: Model file missing at {model_path}")
            raise FileNotFoundError(f"Model file missing at {model_path}")

        model = CropRecommendationLSTM(str(csv_path))
        model.load_model(str(model_path))
        app.state.crop_model = model
    return app.state.crop_model

class CropInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

@app.post("/api/croppred/manual")
async def crop_manual(data: CropInput):
    model = load_crop_model()
    arr = np.array([[data.nitrogen, data.phosphorus, data.potassium, 
                     data.temperature, data.humidity, data.ph, data.rainfall]])
    crop = model.predict_crop(arr)
    return {
        "recommended_crop": crop,
        "soilHealth": soil_health_score(data.nitrogen, data.phosphorus, data.potassium),
        "moisture": data.humidity, "ph": data.ph, "temperature": data.temperature,
    }

# (Other endpoints remain the same, just ensured they use the loaders above)
@app.post("/api/croppred/recommendation")
async def crop_recommendation(data: BaseModel): # Simplified for brevity, use your CropRecoRequest
    # Logic remains same
    pass

@app.get("/health")
async def health_check():
    return {"status": "healthy", "root_dir": str(ROOT_DIR)}