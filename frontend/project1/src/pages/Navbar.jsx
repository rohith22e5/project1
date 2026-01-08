import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useState, useEffect } from "react";
import axios from "../api/axios";

function Navbar({ login, user, setLogin, setUser, ToFooter, ToFeatures }) {
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => setShowLogoutPopup(true);

  const confirmLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.post("/auth/logout", {}, config);
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("user");
      setLogin(false);
      setUser(null);
      setShowLogoutPopup(false);
      navigate("/");
    }
  };

  const scrollTo = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Dynamic CSS for the expanding underline animation */}
      <style>
        {`
          .nav-item {
            position: relative;
            text-decoration: none;
            color: white;
            font-size: 18px;
            padding-bottom: 2px; /* Controlled bottom padding */
            background: transparent;
            border: none;
            cursor: pointer;
          }

          .nav-item::after {
            content: "";
            position: absolute;
            width: 0;
            height: 2px;
            bottom: 0;
            left: 50%;
            background-color: white;
            transition: all 0.3s ease-in-out;
            transform: translateX(-50%);
          }

          /* This class is applied by NavLink when active */
          .nav-item.active::after {
            width: 100%;
          }
          
          /* Optional: adds the effect on hover too */
          .nav-item:hover::after {
            width: 100%;
          }
        `}
      </style>

      <nav style={styles.navbar}>
        <div style={styles.leftGroup}>
          <a href="/" aria-label="Home" style={{ textDecoration: "none", color: "white" }}>
            <Logo style={styles.logo} />
          </a>
        </div>

        <div style={styles.rightGroup}>
          {login ? (
            <>
              <NavLink to="/social" className="nav-item">Social</NavLink>
              <NavLink to="/shop" className="nav-item">Shop</NavLink>
              <NavLink to="/farmercorner" className="nav-item">Farmer's Corner</NavLink>
              <NavLink to="/profile" className="nav-item">Profile</NavLink>
              <button style={styles.button} onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => scrollTo(ToFeatures)} className="nav-item">About</button>
              <button onClick={() => scrollTo(ToFooter)} className="nav-item">Contact</button>
              <Link style={styles.button} to="/login">Login</Link>
              <Link style={styles.button} to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>

      {showLogoutPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <p>Are you sure you want to logout?</p>
            <button style={styles.popupButton} onClick={confirmLogout}>Yes</button>
            <button style={styles.popupButton} onClick={() => setShowLogoutPopup(false)}>No</button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  navbar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    background: "rgba(0, 0, 0, 0.5)",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    zIndex: 20,
    boxSizing: "border-box",
  },
  leftGroup: { display: "flex", alignItems: "center" },
  rightGroup: { display: "flex", alignItems: "center", gap: "30px" },
  logo: { fontSize: "24px", fontWeight: "bold" },
  button: {
    background: "transparent",
    border: "1px solid white",
    borderRadius: "5px",
    color: "white",
    fontSize: "18px",
    padding: "5px 15px",
    textDecoration: "none",
    cursor: "pointer",
    marginLeft: "10px"
  },
  popupOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 },
  popup: { background: "white", padding: "20px", borderRadius: "10px", textAlign: "center", color: "black" },
  popupButton: { margin: "10px", padding: "8px 16px", border: "none", borderRadius: "5px", cursor: "pointer", background: "#007bff", color: "white" },
};

export default Navbar;