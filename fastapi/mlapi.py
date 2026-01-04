from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import base64
import os
import time
import sys
import joblib
from test import get_crop_remedy
from fert import get_fertiliser_query
from fastapi import UploadFile, File
import pandas as pd
import numpy as np
import io
import pdfplumber
# Include parent dir for model import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from diseasedetection.main import results,load_models
from fertilizer.predictor import predict_fertilizer  # Your disease detection function

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi.staticfiles import StaticFiles

# Mount the 'static' folder so it's accessible via the browser
app.mount("/static", StaticFiles(directory="static"), name="static")

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Dummy recommendation data
recommendations = {
    "apple_soba": {
        "remedy": "Use certified virus-free planting material. Monitor trees and remove infected ones.",
        "dosage": "No chemical treatment. Focus on prevention and sanitation."
    },
    "musk": {
        "remedy": "Neem oil spray is effective for musk pests.",
        "dosage": "Mix 5ml neem oil with 1L water. Spray weekly."
    }
}

# Request schema
class AnalysisRequest(BaseModel):
    imageData: str  # base64 encoded image
    detectedAt: str

def load_cached_models():
    if not hasattr(app.state, "model1") or not hasattr(app.state, "model2"):
        print("📦 Loading models into cache...")
        model1, model2 = load_models(
            "../diseasedetection/weights/stage_one.h5",
            "../diseasedetection/weights/models.pkl"
        )
        app.state.model1 = model1
        app.state.model2 = model2
    else:
        print("✅ Models loaded from cache.")

    return app.state.model1, app.state.model2

def soil_health_score(n, p, k):
    # Ideal range (can be adjusted based on soil/crop type)
    optimal_min = 40
    optimal_max = 70

    # Nutrient quality scoring
    def score(value):
        if optimal_min <= value <= optimal_max:
            return 1.0
        elif 30 <= value < optimal_min or optimal_max < value <= 80:
            return 0.7
        elif 20 <= value < 30 or 80 < value <= 90:
            return 0.4
        else:
            return 0.1

    # Individual nutrient scores
    n_score = score(n)
    p_score = score(p)
    k_score = score(k)

    avg_npk_score = (n_score + p_score + k_score) / 3

    # Balance penalty based on standard deviation
    std_dev = np.std([n, p, k])
    balance_penalty = max(0, 1 - (std_dev / 50))  # Normalize std dev

    # Final health score
    health_score = 100 * (0.7 * avg_npk_score + 0.3 * balance_penalty)
    return round(health_score, 2)

@app.post("/api/analysis")
async def analyze(request: AnalysisRequest):
    try:
        # Extract and decode base64 image
        model1,model2  = load_cached_models()  

        base64_data = request.imageData.split(",")[-1]
        image_bytes = base64.b64decode(base64_data)

        # Save image
        filename = f"img_{int(time.time())}.png"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)

        # Perform analysis
       
        prediction = results(filepath,model1,model2)
        parts = prediction.strip().split(" ")
        crop = parts[0]
        disease = " ".join(parts[1:])
        return {
            "severity": 60,
            "confidence": 70,
            "pesticide": disease.lower().replace(" ", "_"),
            "img": f"/{filepath}",
            "crop": crop,
            "disease": disease
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})



@app.get("/api/recommendation/{crop}/{disease}")
async def get_recommendation(crop: str, disease: str):
    key = f"{crop}_{disease}".lower().replace(" ", "_")
    response =  get_crop_remedy(key)
    return response



def load_fertilizer_model():
    if not hasattr(app.state, "fert_model"):
        print("📦 Loading fertilizer model into cache...")
        app.state.fert_model = joblib.load("../fertilizer/fertilizer_predictor.pkl")
        app.state.label_encoders = joblib.load("../fertilizer/label_encoders.pkl")
    return app.state.fert_model, app.state.label_encoders

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
async def get_fertilizer_manual(data: FertilizerInput):
    try:
        model, encoders = load_fertilizer_model()
        fertilizer = predict_fertilizer("Kolhapur", data.soil_color, data.nitrogen, data.phosphorus, data.potassium, data.ph, data.rainfall, data.temperature, data.crop ,model,encoders)
        return {"recommended_fertilizer": f"{fertilizer}","nitrogen":data.nitrogen,"phosphorus": data.phosphorus,"potassium": data.potassium}

    except Exception as e:
        print(str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})




@app.post("/api/fertiliser/upload")
async def get_fertilizer_from_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        # Read PDF using pdfplumber
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            tables = []
            for page in pdf.pages:
                table = page.extract_table()
                if table:
                    tables.append(table)

        if not tables:
            return JSONResponse(status_code=400, content={"error": "No table found in PDF."})

        # Flatten all tables into one DataFrame
        all_data = []
        for table in tables:
            headers = table[0]
            for row in table[1:]:
                data = dict(zip(headers, row))
                all_data.append(data)

        df = pd.DataFrame(all_data)

        # Optional: Clean column names
        df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

        model, label_encoders = load_fertilizer_model()
        recommendations = []

        for _, row in df.iterrows():
            try:
                fertilizer = predict_fertilizer(
                    district=row["district"],
                    soil_color=row["soil_color"],
                    nitrogen=float(row["nitrogen"]),
                    phosphorus=float(row["phosphorus"]),
                    potassium=float(row["potassium"]),
                    pH=float(row["ph"]),
                    rainfall=float(row["rainfall"]),
                    temperature=float(row["temperature"]),
                    crop=row["crop"],
                    model=model,
                    label_encoders=label_encoders
                )

                recommendations.append({
                    "row": row.to_dict(),
                    "recommended_fertilizer": f"{fertilizer}"
                })
            except Exception as inner_e:
                recommendations.append({
                    "row": row.to_dict(),
                    "error": f"❌ Error: {str(inner_e)}"
                })
    except Exception as e:
        logger.error(f"Error during fertilizer upload processing: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to process uploaded fertilizer file",
                "details": str(e)
            }
        )

from fastapi import FastAPI, Request, UploadFile, File,Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import base64
import os
import time
import sys
import joblib
import logging
from dotenv import load_dotenv
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis
from test import get_crop_remedy
from fert import get_fertiliser_query
import pandas as pd
import numpy as np
import io
import pdfplumber
# Include parent dir for model import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from diseasedetection.main import results,load_models
from fertilizer.predictor import predict_fertilizer  # Your disease detection function

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn.error")

app = FastAPI()

# Rate Limiting
redis_url = os.getenv("REDIS_URL", "redis://localhost")
async def startup():
    redis_connection = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_connection)

app.add_event_handler("startup", startup)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self';"
    return response

# CORS Middleware
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
from fastapi.staticfiles import StaticFiles

# Mount the 'static' folder so it's accessible via the browser
app.mount("/static", StaticFiles(directory="static"), name="static")

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Dummy recommendation data
recommendations = {
    "apple_soba": {
        "remedy": "Use certified virus-free planting material. Monitor trees and remove infected ones.",
        "dosage": "No chemical treatment. Focus on prevention and sanitation."
    },
    "musk": {
        "remedy": "Neem oil spray is effective for musk pests.",
        "dosage": "Mix 5ml neem oil with 1L water. Spray weekly."
    }
}

# Request schema
class AnalysisRequest(BaseModel):
    imageData: str  # base64 encoded image
    detectedAt: str

def load_cached_models():
    if not hasattr(app.state, "model1") or not hasattr(app.state, "model2"):
        logger.info("📦 Loading models into cache...")
        model1, model2 = load_models(
            "../diseasedetection/weights/stage_one.h5",
            "../diseasedetection/weights/models.pkl"
        )
        app.state.model1 = model1
        app.state.model2 = model2
    else:
        logger.info("✅ Models loaded from cache.")

    return app.state.model1, app.state.model2

def soil_health_score(n, p, k):
    # Ideal range (can be adjusted based on soil/crop type)
    optimal_min = 40
    optimal_max = 70

    # Nutrient quality scoring
    def score(value):
        if optimal_min <= value <= optimal_max:
            return 1.0
        elif 30 <= value < optimal_min or optimal_max < value <= 80:
            return 0.7
        elif 20 <= value < 30 or 80 < value <= 90:
            return 0.4
        else:
            return 0.1

    # Individual nutrient scores
    n_score = score(n)
    p_score = score(p)
    k_score = score(k)

    avg_npk_score = (n_score + p_score + k_score) / 3

    # Balance penalty based on standard deviation
    std_dev = np.std([n, p, k])
    balance_penalty = max(0, 1 - (std_dev / 50))  # Normalize std dev

    # Final health score
    health_score = 100 * (0.7 * avg_npk_score + 0.3 * balance_penalty)
    return round(health_score, 2)

@app.post("/api/analysis", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def analyze(request: AnalysisRequest):
    try:
        # Extract and decode base64 image
        model1,model2  = load_cached_models()  

        base64_data = request.imageData.split(",")[-1]
        image_bytes = base64.b64decode(base64_data)

        # Save image
        filename = f"img_{int(time.time())}.png"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)

        # Perform analysis
       
        prediction = results(filepath,model1,model2)
        parts = prediction.strip().split(" ")
        crop = parts[0]
        disease = " ".join(parts[1:])
        return {
            "severity": 60,
            "confidence": 70,
            "pesticide": disease.lower().replace(" ", "_"),
            "img": f"/{filepath}",
            "crop": crop,
            "disease": disease
        }

    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})



@app.get("/api/recommendation/{crop}/{disease}", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def get_recommendation(crop: str, disease: str):
    key = f"{crop}_{disease}".lower().replace(" ", "_")
    response =  get_crop_remedy(key)
    return response



def load_fertilizer_model():
    if not hasattr(app.state, "fert_model"):
        logger.info("📦 Loading fertilizer model into cache...")
        app.state.fert_model = joblib.load("../fertilizer/fertilizer_predictor.pkl")
        app.state.label_encoders = joblib.load("../fertilizer/label_encoders.pkl")
    return app.state.fert_model, app.state.label_encoders

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
async def get_fertilizer_manual(data: FertilizerInput):
    try:
        model, encoders = load_fertilizer_model()
        fertilizer = predict_fertilizer("Kolhapur", data.soil_color, data.nitrogen, data.phosphorus, data.potassium, data.ph, data.rainfall, data.temperature, data.crop ,model,encoders)
        return {"recommended_fertilizer": f"{fertilizer}","nitrogen":data.nitrogen,"phosphorus": data.phosphorus,"potassium": data.potassium}

    except Exception as e:
        logger.error(f"Error during fertilizer prediction: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})




@app.post("/api/fertiliser/upload", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def get_fertilizer_from_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        # Read PDF using pdfplumber
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            tables = []
            for page in pdf.pages:
                table = page.extract_table()
                if table:
                    tables.append(table)

        if not tables:
            return JSONResponse(status_code=400, content={"error": "No table found in PDF."})

        # Flatten all tables into one DataFrame
        all_data = []
        for table in tables:
            headers = table[0]
            for row in table[1:]:
                data = dict(zip(headers, row))
                all_data.append(data)

        df = pd.DataFrame(all_data)

        # Optional: Clean column names
        df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

        model, label_encoders = load_fertilizer_model()
        recommendations = []

        for _, row in df.iterrows():
            try:
                fertilizer = predict_fertilizer(
                    district=row["district"],
                    soil_color=row["soil_color"],
                    nitrogen=float(row["nitrogen"]),
                    phosphorus=float(row["phosphorus"]),
                    potassium=float(row["potassium"]),
                    pH=float(row["ph"]),
                    rainfall=float(row["rainfall"]),
                    temperature=float(row["temperature"]),
                    crop=row["crop"],
                    model=model,
                    label_encoders=label_encoders
                )

                recommendations.append({
                    "row": row.to_dict(),
                    "recommended_fertilizer": f"{fertilizer}"
                })
            except Exception as inner_e:
                recommendations.append({
                    "row": row.to_dict(),
                    "error": f"❌ Error: {str(inner_e)}"
                })

        return {
            "recommended_fertilizer": recommendations["recommended_fertilizer"],
            "nitrogen": row["nitrogen"],
            "phosphorus": row["phosphorus"],
            "potassium": row["potassium"]
        }

    except Exception as e:
        logger.error(f"Error during fertilizer prediction from file: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


class FertilizerRecoRequest(BaseModel):
    fertilizer: str
    nitrogen: float
    phosphorus: float
    potassium: float

@app.post("/api/fertiliser/recommendation", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def fertiliser_recommendations(data: FertilizerRecoRequest):
    response = get_fertiliser_query(data.fertilizer,data.nitrogen,data.phosphorus,data.potassium)
    response["npk_values"] = {
        "n": data.nitrogen,
        "p": data.phosphorus,
        "k": data.potassium
    }
    logger.info(response)
    return response

from crop.main import CropRecommendationLSTM
def load_crop_model():
    if not hasattr(app.state, "crop_model"):
        logger.info("📦 Loading crop recommendation model into cache...")
        app.state.crop_model_instance = CropRecommendationLSTM("crop/crop_data.csv")
        app.state.crop_model_instance.load_model("crop/saved_models/crop_recommendation_model.h5")
    return app.state.crop_model_instance

# Manual Input for Crop Prediction
class CropInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

@app.post("/api/croppred/manual", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def get_crop_manual(data: CropInput):
    try:
        crop_model = load_crop_model()
        input_array = np.array([[data.nitrogen, data.phosphorus, data.potassium,
                                 data.temperature, data.humidity, data.ph, data.rainfall]])
        crop = crop_model.predict_crop(input_array)
        soilHealth  = soil_health_score(data.nitrogen,data.phosphorus,data.potassium)
        return {"recommended_crop": crop,"soilHealth":soilHealth,"moistureLevel":data.humidity,"phLevel":data.ph,"temperature":data.temperature}
    except Exception as e:
        logger.error(f"Error during crop prediction: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# CSV Upload for Batch Crop Prediction
@app.post("/api/croppred/upload", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def get_crop_from_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        # Read PDF using pdfplumber
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            tables = []
            for page in pdf.pages:
                table = page.extract_table()
                if table:
                    tables.append(table)

        if not tables:
            return JSONResponse(status_code=400, content={"error": "No table found in PDF."})

        # Combine tables into one DataFrame
        all_data = []
        for table in tables:
            headers = table[0]
            for row in table[1:]:
                data = dict(zip(headers, row))
                all_data.append(data)

        df = pd.DataFrame(all_data)

        # Optional: Clean and normalize column names
        df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

        crop_model = load_crop_model()
        predictions = []

        for _, row in df.iterrows():
            try:
                nitrogen = float(row["nitrogen"])
                phosphorus = float(row["phosphorus"])
                potassium = float(row["potassium"])
                temperature = float(row["temperature"])
                humidity = float(row["humidity"])
                ph = float(row["ph"])
                rainfall = float(row["rainfall"])

                input_array = np.array([[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]])
                crop = crop_model.predict_crop(input_array)
                soilHealth = soil_health_score(data.nitrogen,data.phosphorus,data.potassium)
                predictions.append({
                    "recommended_crop": crop,
                    "soilHealth": soilHealth,
                    "moistureLevel": humidity,
                    "phLevel": ph,
                    "temperature": temperature
                })
            except Exception as inner_e:
                predictions.append({
                    "row": row.to_dict(),
                    "error": f"❌ Error: {str(inner_e)}"
                })

        return {"predictions": predictions}

    except Exception as e:
        logger.error(f"Error during crop prediction from file: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

class CropRecoRequest(BaseModel):
    recommended_crop: str
    moisture: float
    ph: float
    temperature: float

from CropRec import get_crop_recommendation_query
@app.post("/api/croppred/recommendation", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def crop_remedy(data: CropRecoRequest):
    try:
        response = get_crop_recommendation_query(data.recommended_crop, data.moisture, data.ph, data.temperature)

        response["parameters_used"] = {
            "recommended_crop": data.recommended_crop,
            "moisture": data.moisture,
            "ph": data.ph,
            "temperature": data.temperature
        }

        return response
    except Exception as e:
        logger.error(f"Error during crop recommendation: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


class FertilizerRecoRequest(BaseModel):
    fertilizer: str
    nitrogen: float
    phosphorus: float
    potassium: float

@app.post("/api/fertiliser/recommendation")
async def fertiliser_recommendations(data: FertilizerRecoRequest):
    response = get_fertiliser_query(data.fertilizer,data.nitrogen,data.phosphorus,data.potassium)
    response["npk_values"] = {
        "n": data.nitrogen,
        "p": data.phosphorus,
        "k": data.potassium
    }
    print(response)
    return response

from crop.main import CropRecommendationLSTM
def load_crop_model():
    if not hasattr(app.state, "crop_model"):
        print("📦 Loading crop recommendation model into cache...")
        app.state.crop_model_instance = CropRecommendationLSTM("crop/crop_data.csv")
        app.state.crop_model_instance.load_model("crop/saved_models/crop_recommendation_model.h5")
    return app.state.crop_model_instance

# Manual Input for Crop Prediction
class CropInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

@app.post("/api/croppred/manual")
async def get_crop_manual(data: CropInput):
    try:
        crop_model = load_crop_model()
        input_array = np.array([[data.nitrogen, data.phosphorus, data.potassium,
                                 data.temperature, data.humidity, data.ph, data.rainfall]])
        crop = crop_model.predict_crop(input_array)
        soilHealth  = soil_health_score(data.nitrogen,data.phosphorus,data.potassium)
        return {"recommended_crop": crop,"soilHealth":soilHealth,"moistureLevel":data.humidity,"phLevel":data.ph,"temperature":data.temperature}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# CSV Upload for Batch Crop Prediction
@app.post("/api/croppred/upload")
async def get_crop_from_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        # Read PDF using pdfplumber
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            tables = []
            for page in pdf.pages:
                table = page.extract_table()
                if table:
                    tables.append(table)

        if not tables:
            return JSONResponse(status_code=400, content={"error": "No table found in PDF."})

        # Combine tables into one DataFrame
        all_data = []
        for table in tables:
            headers = table[0]
            for row in table[1:]:
                data = dict(zip(headers, row))
                all_data.append(data)

        df = pd.DataFrame(all_data)

        # Optional: Clean and normalize column names
        df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

        crop_model = load_crop_model()
        predictions = []

        for _, row in df.iterrows():
            try:
                nitrogen = float(row["nitrogen"])
                phosphorus = float(row["phosphorus"])
                potassium = float(row["potassium"])
                temperature = float(row["temperature"])
                humidity = float(row["humidity"])
                ph = float(row["ph"])
                rainfall = float(row["rainfall"])

                input_array = np.array([[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]])
                crop = crop_model.predict_crop(input_array)
                soilHealth = soil_health_score(data.nitrogen,data.phosphorus,data.potassium)
                predictions.append({
                    "recommended_crop": crop,
                    "soilHealth": soilHealth,
                    "moistureLevel": humidity,
                    "phLevel": ph,
                    "temperature": temperature
                })
            except Exception as inner_e:
                predictions.append({
                    "row": row.to_dict(),
                    "error": f"❌ Error: {str(inner_e)}"
                })

        return {"predictions": predictions}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

class CropRecoRequest(BaseModel):
    recommended_crop: str
    moisture: float
    ph: float
    temperature: float

from CropRec import get_crop_recommendation_query
@app.post("/api/croppred/recommendation")
async def crop_remedy(data: CropRecoRequest):
    try:
        response = get_crop_recommendation_query(data.recommended_crop, data.moisture, data.ph, data.temperature)

        response["parameters_used"] = {
            "recommended_crop": data.recommended_crop,
            "moisture": data.moisture,
            "ph": data.ph,
            "temperature": data.temperature
        }

        return response
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

