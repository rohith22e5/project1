import { useState, useRef } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { MdOutlineFilePresent } from "react-icons/md";
import PYTHON_API_URL from "../../api/python.js";

const FileUploader = ({ onDetect }) => {
  const [inputfile, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [isManualInput, setIsManualInput] = useState(true);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    soil_color: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    ph: "",
    rainfall: "",
    temperature: "",
    crop: "",
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
      const response = await fetch(`${PYTHON_API_URL}/fertiliser/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      console.log("✅ Final Fertilizer Data:", data);
      onDetect(data); // 🔥 SINGLE SOURCE OF TRUTH
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="manual-input">
      <h4 className="inputheading">Enter Soil Data Manually</h4>

      <form className="form" onSubmit={handleSubmit}>
        {Object.keys(formData).map((key) => (
          <label key={key}>
            {key}
            <input
              name={key}
              value={formData[key]}
              onChange={handleChange}
              required
            />
          </label>
        ))}
        <button type="submit" className="recommend-btn">
          Recommend Fertilizer
        </button>
      </form>
    </div>
  );
};

export default FileUploader;
