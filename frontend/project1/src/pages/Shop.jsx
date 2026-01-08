import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Shop.css';
import ProductCard from './ProductCard';
import axios from '../api/axios';

export default function Shop({ login }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState({
    Vegetables: [],
    Fruits: [],
    Dairy: [],
    Grains: [],
    Other: []
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/shop/products');
        
        const categorizedProducts = {
          Vegetables: [],
          Fruits: [],
          Dairy: [],
          Grains: [],
          Other: []
        };
        
        response.data.forEach(product => {
          // Normalize: "vegetables" -> "Vegetables"
          const rawCat = product.category || "Other";
          const normalizedCategory = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).toLowerCase();

          if (categorizedProducts.hasOwnProperty(normalizedCategory)) {
            categorizedProducts[normalizedCategory].push(product);
          } else {
            categorizedProducts.Other.push(product);
          }
        });
        
        setProducts(categorizedProducts);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
        setLoading(false);
      }
    };

    if (login) fetchProducts();
  }, [login]);

  if (!login) return <p>404 Not Found</p>;
  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="shop-container">
      <h1 className="main-title">Farm Products</h1>

      {['Vegetables', 'Fruits', 'Dairy', 'Grains', 'Other'].map((cat) => (
        <div key={cat}>
          <h3 className="category-title">{cat === 'Dairy' ? 'Dairy Products' : cat}</h3>
          <div className="product-grid">
            {products[cat].length > 0 ? (
              products[cat].map((product) => (
                <ProductCard key={product._id} product={product} />
              ))
            ) : (
              <p>No {cat.toLowerCase()} products available</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}