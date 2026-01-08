import { useState, useRef } from "react";
import { FiUploadCloud, FiCamera } from "react-icons/fi";
import PYTHON_API_URL from "../../api/python.js";

const ImageUploader = ({ onImageUpload }) => {
  const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL;
  const [image, setImage] = useState(null);
  const [cropType, setCropType] = useState("");
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [fadeOutVideo, setFadeOutVideo] = useState(false);
  const [fadeOutImage, setFadeOutImage] = useState(false);

  const handleImageUpload = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        onImageUpload(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    handleImageUpload(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    handleImageUpload(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const openFilePicker = () => {
    fileInputRef.current.click();
  };

  const handleCameraCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/png");
      setImage(imageData);
      onImageUpload(imageData);

      // Fade out video before closing
      setFadeOutVideo(true);
      setTimeout(() => {
        setCameraOpen(false); // Close camera after transition
        setFadeOutVideo(false);
      }, 500);

      // Stop the video stream
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      }
    }
  };

  const startCamera = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  

      {/* Styles */}
      <style>
  {`
    .fade-out {
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
    }
  `}
</style>

    </>
  );
};

export default ImageUploader;
