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

from dotenv import load_dotenv

import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# ===================== ENV + LOGGING =====================
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

# ===================== BASE DIR (CRITICAL FOR PROD) =====================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ===================== APP =====================
app = FastAPI(title="Agro AI Backend", version="1.0")

# ===================== CORS =====================
origins = [
    os.getenv("FASTAPI_FRONTEND_URL", "http://localhost:5173"),
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
        redis_conn = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        await FastAPILimiter.init(redis_conn)
        logger.info("🚦 Redis connected — rate limiting enabled")
    except Exception as e:
        logger.warning(f"⚠️ Redis unavailable — continuing without rate limiting: {e}")

# ===================== UTILS =====================
def soil_health_score(n, p, k):
    optimal_min, optimal_max = 40, 70

    def score(v):
        if optimal_min <= v <= optimal_max:
            return 1.0
        elif 30 <= v < optimal_min or optimal_max < v <= 80:
            return 0.7
        elif 20 <= v < 30 or 80 < v <= 90:
            return 0.4
        return 0.1

    avg = (score(n) + score(p) + score(k)) / 3
    balance = max(0, 1 - (np.std([n, p, k]) / 50))
    return round(100 * (0.7 * avg + 0.3 * balance), 2)

# ===================== FERTILIZER =====================
from ml.fertilizer.predictor import predict_fertilizer
from ml.fastapi.fert import get_fertiliser_query

def load_fertilizer_model():
    if not hasattr(app.state, "fert_model"):
        logger.info("📦 Loading fertilizer model...")
        app.state.fert_model = joblib.load(
            os.path.join(BASE_DIR, "fertilizer", "fertilizer_predictor.pkl")
        )
        app.state.encoders = joblib.load(
            os.path.join(BASE_DIR, "fertilizer", "label_encoders.pkl")
        )
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

@app.post("/api/fertiliser/manual", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def fertilizer_manual(data: FertilizerInput):
    model, encoders = load_fertilizer_model()
    fert = predict_fertilizer(
        "Kolhapur",
        data.soil_color,
        data.nitrogen,
        data.phosphorus,
        data.potassium,
        data.ph,
        data.rainfall,
        data.temperature,
        data.crop,
        model,
        encoders,
    )
    return {
        "recommended_fertilizer": fert,
        "npk": {"n": data.nitrogen, "p": data.phosphorus, "k": data.potassium},
    }

@app.post("/api/fertiliser/upload", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def fertilizer_upload(file: UploadFile = File(...)):
    contents = await file.read()

    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        rows = []
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                headers = table[0]
                for row in table[1:]:
                    rows.append(dict(zip(headers, row)))

    if not rows:
        return JSONResponse(400, {"error": "No table found in PDF"})

    df = pd.DataFrame(rows)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    model, encoders = load_fertilizer_model()
    results = []

    for _, r in df.iterrows():
        try:
            fert = predict_fertilizer(
                r["district"],
                r["soil_color"],
                float(r["nitrogen"]),
                float(r["phosphorus"]),
                float(r["potassium"]),
                float(r["ph"]),
                float(r["rainfall"]),
                float(r["temperature"]),
                r["crop"],
                model,
                encoders,
            )
            results.append({"row": r.to_dict(), "recommended_fertilizer": fert})
        except Exception as e:
            results.append({"row": r.to_dict(), "error": str(e)})

    return {"results": results}

class FertilizerRecoRequest(BaseModel):
    fertilizer: str
    nitrogen: float
    phosphorus: float
    potassium: float

@app.post("/api/fertiliser/recommendation", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def fertilizer_reco(data: FertilizerRecoRequest):
    response = get_fertiliser_query(
        data.fertilizer, data.nitrogen, data.phosphorus, data.potassium
    )
    response["npk_values"] = {"n": data.nitrogen, "p": data.phosphorus, "k": data.potassium}
    return response

# ===================== CROP =====================
from ml.crop.main import CropRecommendationLSTM
from ml.fastapi.CropRec import get_crop_recommendation_query

def load_crop_model():
    if not hasattr(app.state, "crop_model"):
        logger.info("🌱 Loading crop model...")
        model = CropRecommendationLSTM(
            os.path.join(BASE_DIR, "crop", "crop_data.csv")
        )
        model.load_model(
            os.path.join(
                BASE_DIR, "crop", "saved_models", "crop_recommendation_model.h5"
            )
        )
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

@app.post("/api/croppred/manual", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def crop_manual(data: CropInput):
    model = load_crop_model()
    arr = np.array(
        [[
            data.nitrogen,
            data.phosphorus,
            data.potassium,
            data.temperature,
            data.humidity,
            data.ph,
            data.rainfall,
        ]]
    )
    crop = model.predict_crop(arr)
    return {
        "recommended_crop": crop,
        "soilHealth": soil_health_score(
            data.nitrogen, data.phosphorus, data.potassium
        ),
        "moisture": data.humidity,
        "ph": data.ph,
        "temperature": data.temperature,
    }

class CropRecoRequest(BaseModel):
    recommended_crop: str
    moisture: float
    ph: float
    temperature: float

@app.post("/api/croppred/recommendation", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def crop_recommendation(data: CropRecoRequest):
    response = get_crop_recommendation_query(
        data.recommended_crop, data.moisture, data.ph, data.temperature
    )
    response["parameters_used"] = data.dict()
    return response
