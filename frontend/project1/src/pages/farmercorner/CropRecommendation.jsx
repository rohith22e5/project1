import "./common.css";
import FileUploader1 from "./FileUploader1";
import CroprecResults from "./CroprecResults";
import CropRec from "./Crop";
import { useState } from "react";

export default function CropRecommendation({ login }) {
  const fallbackAnalysis = {
    recommended_crop: "",
    soilHealth: "0",
    moistureLevel: "0",
    phLevel: "0",
    temperature: "0",
  };

  const fallbackReco = {
    bestCrops: "",
    trendsData: [
      { date: "Jan", value: 30 },
      { date: "Feb", value: 45 },
      { date: "Mar", value: 50 },
      { date: "Apr", value: 50 },
      { date: "May", value: 50 },
    ],
  };

  const [analysisData, setAnalysisData] = useState(null);

  const finalAnalysis = analysisData || fallbackAnalysis;

  const finalReco = analysisData
    ? {
        bestCrops: analysisData.recommended_crop,
        trendsData: fallbackReco.trendsData,
      }
    : fallbackReco;

  if (!login) return <h1>404 Not Found</h1>;

  return (
    <div className="section-container">
      <div className="section1">
        <FileUploader1 onDetect={setAnalysisData} />
      </div>

      <div className="section2">
        <CroprecResults {...finalAnalysis} />
      </div>

      <div className="section3">
        <CropRec data={finalReco} />
      </div>
    </div>
  );
}
