
# Agro AI

## Description

Agro AI is a full-stack web application designed to assist farmers with intelligent agricultural solutions. It provides recommendations for crop selection and fertilizer usage based on soil and environmental data. The project integrates a machine learning backend with a modern web interface to deliver actionable insights.

## Features

- **Crop Recommendation:** Suggests the most suitable crops to grow based on soil composition (Nitrogen, Phosphorus, Potassium), temperature, humidity, pH, and rainfall.
- **Fertilizer Recommendation:** Recommends the appropriate fertilizer type based on soil properties and the intended crop.
- **Soil Health Score:** Calculates a soil health score based on N, P, and K values to help farmers understand their soil quality.
- **User Authentication:** Secure user registration and login system.
- **Interactive UI:** A user-friendly interface for inputting data and viewing recommendations.

## Technologies Used

### Frontend

- **React:** A JavaScript library for building user interfaces.
- **Vite:** A fast build tool for modern web development.
- **Axios:** A promise-based HTTP client for making API requests.
- **React-Bootstrap:** A front-end framework for React.
- **Leaflet:** An open-source JavaScript library for mobile-friendly interactive maps.
- **Chart.js:** A flexible JavaScript charting library.

### Backend

- **Node.js:** A JavaScript runtime environment.
- **Express.js:** A web application framework for Node.js.
- **MongoDB:** A NoSQL database for storing application data.
- **Mongoose:** An ODM library for MongoDB and Node.js.
- **JWT:** JSON Web Tokens for secure user authentication.
- **Bcrypt.js:** A library for hashing passwords.

### Machine Learning

- **Python:** A programming language for machine learning.
- **FastAPI:** A modern, fast (high-performance) web framework for building APIs with Python.
- **TensorFlow/Keras:** An open-source machine learning platform for building and training neural networks.
- **Scikit-learn:** A machine learning library for Python.
- **Pandas:** A data manipulation and analysis library.
- **Joblib:** A library for saving and loading Python objects.

## Project Structure

```
.
├── backend/         # Node.js backend
├── frontend/        # React frontend
├── ml/              # Python machine learning models
├── .gitignore
├── package-lock.json
├── requirements.txt
└── runtime.txt
```

## Installation

### Prerequisites

- Node.js and npm
- Python and pip
- MongoDB

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Backend Setup

```bash
cd backend
npm install
# Create a .env file and add your MongoDB connection string and other environment variables
# Example:
# MONGO_URI=your_mongodb_uri
# JWT_SECRET=your_jwt_secret
npm start
```

### 3. Frontend Setup

```bash
cd ../frontend/project1
npm install
npm run dev
```

### 4. Machine Learning API Setup

```bash
cd ../ml/porod
pip install -r requirements.txt
# Create a .env file if needed for environment variables
uvicorn mlapi:app --reload
```

## Usage

Once all the services are running, you can access the application in your browser at `http://localhost:5173` (or the port specified by Vite).

## API Endpoints

The machine learning API provides the following endpoints:

- `POST /api/croppred/manual`: Recommends a crop based on manual input of soil and environmental data.
- `POST /api/fertiliser/manual`: Recommends a fertilizer based on manual input of soil data and crop type.
- `GET /health`: Health check endpoint.

## Machine Learning Models

- **Crop Recommendation Model:** A Long Short-Term Memory (LSTM) neural network built with Keras/TensorFlow to recommend crops. The model is located in `ml/crop/saved_models/`.
- **Fertilizer Prediction Model:** A machine learning model (likely a classifier) trained with Scikit-learn to predict the best fertilizer. The model is located in `ml/fertilizer/`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
