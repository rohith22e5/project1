import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

// Layout & Context
import  Layout from './pages/Layout.jsx' // Double-check this path
import { ShopProvider } from './context/ShopContext';
 
// Auth & Core Pages
import Home from './pages/Home.jsx';
import Login from './pages/login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Notfound from './pages/Notfound.jsx';
import Box2 from './pages/Box2.jsx';

// Social Pages
import SocialLayout from "./pages/Social.jsx";
import FarmScene from './pages/Social/Feed.jsx';
import Shared from './pages/Social/Shared.jsx';
import SocialProfile from './pages/Social/Profile.jsx';
import NewSocialPost from './pages/Social/NewPost.jsx';
import PostView from './pages/Social/PostView.jsx';

// Farmer Corner
import FCLayout from './pages/FCLayout.jsx';
import FCIndex from './pages/farmercorner/FCIndex.jsx';
//import Pest from './pages/farmercorner/Pest.jsx';
import Fertiliser from './pages/farmercorner/Fertiliser.jsx';
import Tutorials from './pages/farmercorner/Tutorials.jsx';
import CropRecommendation from './pages/farmercorner/CropRecommendation.jsx';

// Ecommerce
import EcommerceLayout from './pages/EcommerceLayout.jsx';
import Shop from './pages/Shop.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import SearchResults from './pages/SearchResults.jsx';
import OrderHistory from './pages/OrderHistory';
import CreateProduct from './pages/CreateProduct.jsx';

// Assets
import "./pages/styles.css";
import defaultAvatar from "./frontimages/onlyplant.jpg";

// Clear cart badge on startup
if (typeof window !== 'undefined' && window.localStorage) {
  const localCartString = window.localStorage.getItem('localCart');
  if (!localCartString || localCartString === '[]') {
    console.log('App: Empty cart on startup, ensuring cart data is clean');
    window.localStorage.setItem('localCart', '[]');
    setTimeout(() => {
      window.dispatchEvent(new Event('cartUpdated'));
    }, 200);
  }
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Check if user is logged in on app start
  useEffect(() => {
    const checkLoginStatus = () => {
      setIsCheckingAuth(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Clear any stale data if no token exists
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        setIsLoggedIn(false);
        setUser(null);
        setIsCheckingAuth(false);
        return;
      }
      
      // Token exists, check if it's valid by parsing it
      try {
        // Basic token validation by checking structure
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format');
        }
        
        // Decode the payload (middle part)
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
          console.log('Token expired, logging out');
          handleLogout();
          setIsCheckingAuth(false);
          return;
        }
        
        // Token appears valid
        setIsLoggedIn(true);
        
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
          } catch (error) {
            console.error('Error parsing user data:', error);
            // Fall back to basic user
            setUser({
              _id: payload.id || '',
              name: "",
              email: "",
              mobile: "",
              role: "Farmer",
              avatar: "/1.png"
            });
          }
        } else {
          // Basic user info if no user data in localStorage
          setUser({
            _id: payload.id || '',
            name: "",
            email: "",
            mobile: "",
            role: "Farmer",
            avatar: "/1.png"
          });
        }
      } catch (error) {
        console.error('Error validating token:', error);
        handleLogout();
      }
      
      setIsCheckingAuth(false);
    };
    
    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      setIsLoggedIn(false);
      setUser(null);
      
      // Redirect to home page if not already there
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    };
    
    // Add event listener for session expiration
    window.addEventListener('session-expired', handleLogout);
    
    // Check login status
    checkLoginStatus();
    
    // Cleanup
    return () => {
      window.removeEventListener('session-expired', handleLogout);
    };
  }, []);
  
  // Global function to handle unauthorized responses
  const handleUnauthorized = () => {
    // First trigger the session-expired event
    const event = new Event('session-expired');
    window.dispatchEvent(event);
    
    // Then redirect to the home page
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };
  
  // Attach to window for global access
  useEffect(() => {
    window.handleUnauthorized = handleUnauthorized;
    return () => {
      delete window.handleUnauthorized;
    };
  }, []);
  
  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '20px' }}>Checking authentication...</div>
        <div 
          style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} 
        />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <BrowserRouter>
      <ShopProvider>
      <Routes>
        <Route path="/" element={<Layout login={isLoggedIn} user={user} setLogin={setIsLoggedIn} setUser={setUser} />}>
          <Route index element={<Home login={isLoggedIn} />}/>
          
          <Route path="box" element={<Box2/>}/>
          <Route path="*" element={<Notfound/>}/>

          <Route path="/social" element={<SocialLayout login={isLoggedIn} />}>
            <Route index element={<FarmScene login={isLoggedIn}/>}/>
            <Route path="shared" element={<Shared login={isLoggedIn} />}/>
            <Route path="profile" element={<Navigate to="/social/profile/me" replace />} />
            <Route path="profile/:username" element={<SocialProfile />} />
            <Route path='new-post' element={<NewSocialPost/>}/>
          </Route>

          <Route path="/post/:postId" element={<PostView />} />

          <Route 
            path="profile" 
            element={
              isLoggedIn ? (
                <Profile 
                  login={isLoggedIn} 
                  setLogin={setIsLoggedIn} 
                  user={user} 
                  setUser={setUser}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
    <Route path="shop" element={<EcommerceLayout login={isLoggedIn} user={user} />}>
      <Route index element={<Shop login={isLoggedIn} />} />
      <Route path="product/:productId" element={<ProductDetail />} />
      <Route path="cart" element={<Cart />} />
      <Route path="search" element={<SearchResults />} />
      <Route path="order-history" element={<OrderHistory />} />
      <Route path="create" element={<CreateProduct />} />
    </Route>

          {/* <Route path="shop" element={<EcommerceLayout login={isLoggedIn} />}>
            <Route index element={<Shop login={isLoggedIn} />} />
            <Route path=":productId" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
          </Route> */}

          <Route path="/farmercorner" element={<FCLayout login={isLoggedIn}/>}>
            <Route index element={<FCIndex login={isLoggedIn}/>}/>
            
            <Route path="fertilizer-recommendation" element={<Fertiliser login={isLoggedIn}/>}/>
            <Route path="organic-farming-tutorials" element={<Tutorials login={isLoggedIn}/>}/>
            <Route path="crop-recommendation" element={<CropRecommendation login={isLoggedIn} />}/>

          </Route>
        </Route>

        <Route 
          path="login" 
          element={
            isLoggedIn ? 
            <Navigate to="/" replace /> : 
            <Login login={isLoggedIn} setLogin={setIsLoggedIn} setUser={setUser} />
          }
        />
        
        <Route 
          path="register" 
          element={
            isLoggedIn ? 
            <Navigate to="/" replace /> : 
            <Register login={isLoggedIn} setLogin={setIsLoggedIn} setUser={setUser} />
          }
        />
      </Routes>
      </ShopProvider>
    </BrowserRouter>
  )
}

export default App
