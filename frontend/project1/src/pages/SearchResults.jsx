import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import axios from "../api/axios";
import "./Shop.css"; // Assuming you want similar styling

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get("query")?.toLowerCase() || "";

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await axios.get('/shop/products');
                setProducts(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching products:', err);
                setError('Failed to load products. Please try again later.');
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Filter the products according to search query
    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(query)
    );

    if (loading) {
        return <div className="loading">Loading search results...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="search-results-container">
            <h2>Search Results for "{query}"</h2>
            {filteredProducts.length > 0 ? (
                <div className="product-grid">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </div>
            ) : (
                <p>No products found.</p>
            )}
        </div>
    );
}
