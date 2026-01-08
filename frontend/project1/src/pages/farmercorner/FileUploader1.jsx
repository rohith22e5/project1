import { useState } from "react";
import PYTHON_API_URL from "../../api/python.js";

const FileUploader1 = ({ onDetect }) => {
  const [formData, setFormData] = useState({
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    ph: "",
    rainfall: "",
    temperature: "",
    humidity: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${PYTHON_API_URL}/croppred/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Manual submission failed");

      const data = await response.json();
      console.log("✅ Manual crop recommendation:", data);

      onDetect(data); // 🔥 SINGLE SOURCE OF TRUTH
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Failed to get crop recommendation");
    }
  };

  return (
    <div className="manual-input">
      <h4 className="inputheading">Enter Soil Data Manually</h4>

      <form className="form" onSubmit={handleSubmit}>
        {[
          ["nitrogen", "Nitrogen (mg/kg)"],
          ["phosphorus", "Phosphorus (mg/kg)"],
          ["potassium", "Potassium (mg/kg)"],
          ["ph", "pH Level"],
          ["rainfall", "Rainfall (mm)"],
          ["temperature", "Temperature (°C)"],
          ["humidity", "Humidity"],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              type="number"
              name={name}
              value={formData[name]}
              onChange={handleChange}
              required
            />
          </label>
        ))}

        <button type="submit" className="recommend-btn">
          Recommend Crop
        </button>
      </form>
    </div>
  );
};

export default FileUploader1;
