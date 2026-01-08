import { useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import "./CreateProduct.css";

export default function CreateProduct() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("Vegetables"); // Default to valid key
    const [inventory, setInventory] = useState(0);
    const [unit, setUnit] = useState("kg");
    
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!name.trim() || !price || !category) {
            setError("Please fill in all required fields.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            let imageUrl = "/placeholder-product.jpg";
            if (image) {
                const formData = new FormData();
                formData.append("file", image);
                formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_PRESET_NAME);

                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUD_NAME}/image/upload`,
                    { method: "POST", body: formData }
                );

                const data = await response.json();
                if (data.secure_url) imageUrl = data.secure_url;
            }

            const token = localStorage.getItem("token");
            const productData = {
                name,
                description,
                price: parseFloat(price),
                category, // Sends "Vegetables", "Fruits", etc.
                inventory: Number(inventory),
                unit,
                image: imageUrl,
            };

            await axios.post("/products", productData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            navigate("/shop");
        } catch (err) {
            console.error("Error creating product:", err);
            setError(err.response?.data?.message || "Failed to create product.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-product-container">
            <h2 className="create-product-title">Add New Farm Product</h2>
            {error && <div className="create-product-error">{error}</div>}
            
            <form onSubmit={handleSubmit} className="product-form">
                <div className="form-group">
                    <label>Product Name *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Price *</label>
                        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Unit *</label>
                        <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} required />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Stock Quantity *</label>
                        <input type="number" value={inventory} onChange={(e) => setInventory(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Category *</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                            <option value="Vegetables">Vegetables</option>
                            <option value="Fruits">Fruits</option>
                            <option value="Dairy">Dairy</option>
                            <option value="Grains">Grains</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" />
                </div>

                <div className="form-group">
                    <label>Product Image</label>
                    <input type="file" accept="image/*" onChange={handleImageChange} />
                    {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview-box" />}
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Creating..." : "List Product"}
                </button>
            </form>
        </div>
    );
}