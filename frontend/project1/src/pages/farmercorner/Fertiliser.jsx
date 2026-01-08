import "./common.css"
import FileUploader from "./FileUploader"
import FertilizerResults from "./FertiliserResults"
import FertilizerRec from "./FertiliserRecommendations"
import IExa from "/images.jpg"
import { useState, useEffect } from "react";

export default function Fertiliser({ login }) {
  const fallbackData = {
    name: "urea",
    npkRatio: "80-60-30",
    soilHealth: "70",
    npk: {
      n: "20",
      p: "30",
      k: "40"
    }
  };

  const fallbackReco = {
    fertilizer: {
      name: "Urea",
      image: IExa,
    },
    dosage: "Apply 50kg per hectare before irrigation.",
    bestPractices: "Mix with soil properly and avoid direct contact with plant roots.",
    warnings: "Excessive use may lead to soil acidification.",
    trendsData: [
      { date: "Jan", value: 30 },
      { date: "Feb", value: 45 },
      { date: "Mar", value: 50 },
      { date: "Apr", value: 50 },
      { date: "May", value: 50 },
    ],
    nutrientImbalance: [
      { nutrient: "Nitrogen", value: 80 },
      { nutrient: "Phosphorus", value: 40 },
      { nutrient: "Potassium", value: 60 },
    ],
    seasonalRequirements: [
      { season: "Spring", requirement: 50 },
      { season: "Summer", requirement: 80 },
      { season: "Autumn", requirement: 40 },
      { season: "Winter", requirement: 30 },
    ],
    nutrientDistribution: [
      { name: "Nitrogen", value: 50 },
      { name: "Phosphorus", value: 30 },
      { name: "Potassium", value: 20 },
    ],
  };

  const [analysisData, setAnalysisData] = useState(null);
  const [recommendationData, setRecommendationData] = useState(null);
  
  function soilHealthScore(n, p, k) {
    // Ideal range
    const optimalMin = 40;
    const optimalMax = 70;
  
    // Scoring function
    const score = (value) => {
      if (value >= optimalMin && value <= optimalMax) return 1.0;
      if ((value >= 30 && value < optimalMin) || (value > optimalMax && value <= 80)) return 0.7;
      if ((value >= 20 && value < 30) || (value > 80 && value <= 90)) return 0.4;
      return 0.1;
    };
  
    // Individual scores
    const nScore = score(n);
    const pScore = score(p);
    const kScore = score(k);
  
    const avgNpkScore = (nScore + pScore + kScore) / 3;
  
    // Standard deviation for balance
    const mean = (n + p + k) / 3;
    const variance = ((n - mean) ** 2 + (p - mean) ** 2 + (k - mean) ** 2) / 3;
    const stdDev = Math.sqrt(variance);
  
    const balancePenalty = Math.max(0, 1 - stdDev / 50);
  
    // Final health score
    const healthScore = 100 * (0.7 * avgNpkScore + 0.3 * balancePenalty);
    return parseFloat(healthScore.toFixed(2));
  }
  

  const finalAnalysis = analysisData && analysisData.nitrogen !== undefined
  ? {
      ...analysisData,
      soilHealth: soilHealthScore(
        parseFloat(analysisData.nitrogen || 0),
         parseFloat(analysisData.phosphorus || 0),
         parseFloat(analysisData.potassium || 0) 
      ),
      npk: {
        n: analysisData.nitrogen,
        p: analysisData.phosphorus,
        k: analysisData.potassium,
      }
    }
  : fallbackData;

  const isValid = analysisData?.recommended_fertilizer &&
                    analysisData?.nitrogen !== undefined &&
                    analysisData?.phosphorus !== undefined &&
                    analysisData?.potassium !== undefined;
  
    
    const finalReco = isValid
  ? {
      fertilizer: {
        name: analysisData.recommended_fertilizer,
        image: IExa, // static image
      },

      // 🔒 static frontend content
      dosage: "Apply 50kg per hectare before irrigation.",
      bestPractices: "Mix with soil properly and avoid direct contact with plant roots.",
      warnings: "Excessive use may lead to soil acidification.",

      // 📊 static visual data
      trendsData: fallbackReco.trendsData,
      seasonalRequirements: fallbackReco.seasonalRequirements,
      nutrientDistribution: fallbackReco.nutrientDistribution,

      // 📉 dynamic but frontend-derived
      nutrientImbalance: [
        { nutrient: "Nitrogen", value: Number(analysisData.nitrogen) },
        { nutrient: "Phosphorus", value: Number(analysisData.phosphorus) },
        { nutrient: "Potassium", value: Number(analysisData.potassium) },
      ],
    }
  : fallbackReco;


  if (!login) {
    return <h1>404 Not Found!!</h1>;
  }

  return (
    <>
      <div className="section-container">
        <div className="section1">
        <FileUploader onDetect={(data) => setAnalysisData({ ...data })} />
        </div>
        <div className="section2">
          <FertilizerResults soilHealth={finalAnalysis.soilHealth} npk={finalAnalysis.npk} />
        </div>
        <div className="section3">
          <FertilizerRec recommendations={finalReco} />
        </div>
      </div>
      <br />
      <br />
      <br />
    </>
  );
}
