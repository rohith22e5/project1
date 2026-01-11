import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.utils import to_categorical
from pathlib import Path
import joblib


class CropRecommendationLSTM:
    def __init__(self, data_path: str):
        # ---------- PATHS ----------
        self.BASE_DIR = Path(__file__).resolve().parent
        self.MODELS_DIR = self.BASE_DIR / "saved_models"
        self.MODELS_DIR.mkdir(exist_ok=True)

        # ---------- LOAD DATA ----------
        self.df = pd.read_csv(data_path)

        self.X = self.df.drop("label", axis=1)
        self.y = self.df["label"]

        # ---------- ENCODER ----------
        self.label_encoder = LabelEncoder()
        self.y_encoded = self.label_encoder.fit_transform(self.y)

        # ---------- SCALER ----------
        self.scaler = StandardScaler()
        self.X_scaled = self.scaler.fit_transform(self.X)

        self.model = None

    # ---------- LSTM DATA ----------
    def prepare_lstm_data(self, time_steps=3):
        X_seq, y_seq = [], []

        for i in range(len(self.X_scaled) - time_steps):
            X_seq.append(self.X_scaled[i:i + time_steps])
            y_seq.append(self.y_encoded[i + time_steps])

        return np.array(X_seq), to_categorical(
            y_seq, num_classes=len(np.unique(self.y_encoded))
        )

    # ---------- MODEL ----------
    def create_lstm_model(self, input_shape, num_classes):
        model = Sequential([
            LSTM(64, activation="relu", return_sequences=True, input_shape=input_shape),
            Dropout(0.3),
            LSTM(32, activation="relu"),
            Dropout(0.2),
            Dense(64, activation="relu"),
            Dropout(0.2),
            Dense(num_classes, activation="softmax")
        ])

        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss="categorical_crossentropy",
            metrics=["accuracy"]
        )

        return model

    # ---------- TRAIN & SAVE ----------
    def train_model(self, epochs=50, batch_size=32):
        X_lstm, y_lstm = self.prepare_lstm_data()

        X_train, X_test, y_train, y_test = train_test_split(
            X_lstm, y_lstm, test_size=0.2, random_state=42
        )

        self.model = self.create_lstm_model(
            input_shape=(X_train.shape[1], X_train.shape[2]),
            num_classes=y_lstm.shape[1]
        )

        self.model.fit(
            X_train,
            y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            callbacks=[
                tf.keras.callbacks.EarlyStopping(
                    patience=10, restore_best_weights=True
                )
            ]
        )

        self.save_all()
        return self.model

    # ---------- SAVE EVERYTHING ----------
    def save_all(self):
        self.model.save(self.MODELS_DIR / "crop_recommendation_model.h5")
        joblib.dump(self.scaler, self.MODELS_DIR / "scaler.pkl")
        joblib.dump(self.label_encoder, self.MODELS_DIR / "label_encoder.pkl")

    # ---------- LOAD EVERYTHING (USED IN PRODUCTION) ----------
    def load_model(self, model_path: str):
        model_path = Path(model_path)
        scaler_path = model_path.parent / "scaler.pkl"
        encoder_path = model_path.parent / "label_encoder.pkl"

        if not model_path.exists():
            raise FileNotFoundError(f"Model missing: {model_path}")
        if not scaler_path.exists():
            raise FileNotFoundError(f"Scaler missing: {scaler_path}")
        if not encoder_path.exists():
            raise FileNotFoundError(f"Encoder missing: {encoder_path}")

        self.model = load_model(model_path)
        self.scaler = joblib.load(scaler_path)
        self.label_encoder = joblib.load(encoder_path)

        return self.model

    # ---------- PREDICT ----------
    def predict_crop(self, new_data: np.ndarray):
        if self.model is None:
            raise RuntimeError("Model not loaded")

        new_data_scaled = self.scaler.transform(new_data)
        new_data_scaled = new_data_scaled.reshape(
            1, new_data_scaled.shape[0], new_data_scaled.shape[1]
        )

        pred = self.model.predict(new_data_scaled)
        idx = np.argmax(pred)

        return self.label_encoder.inverse_transform([idx])[0]
