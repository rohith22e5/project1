import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axios'; // Assuming your axios instance is here
import './VerifyEmail.css'; // We'll create this CSS file next

const VerifyEmail = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // The user's email should be passed from the registration page via location state
    const email = location.state?.email;

    useEffect(() => {
        // If the user lands on this page without an email in the state (e.g., direct navigation),
        // we can't proceed, so we redirect them to the registration page.
        if (!email) {
            navigate('/register');
        }
    }, [email, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        if (!/^\d{6}$/.test(otp)) {
            setError('OTP must be a 6-digit number.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post('/auth/verify-email', { email, otp });
            
            // This part depends on your app's state management (Context, Redux, etc.)
            // For now, we'll assume a simple localStorage implementation.
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));

            setMessage('Verification successful! Redirecting to the login page...');
            
            // Redirect to login page to complete the flow
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred during verification.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            await axios.post('/auth/resend-verification', { email });
            setMessage('A new OTP has been sent to your email address.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    // Don't render the form if we're about to redirect
    if (!email) {
        return null;
    }

    return (
        <div className="verify-email-container">
            <div className="verify-email-box">
                <h2>Verify Your Email</h2>
                <p>An OTP has been sent to <strong>{email}</strong>. Please enter it below to activate your account.</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="otp">One-Time Password (OTP)</label>
                        <input
                            type="text"
                            id="otp"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength="6"
                            required
                            className="otp-input"
                            autoComplete="one-time-code"
                        />
                    </div>
                    
                    {error && <p className="error-message">{error}</p>}
                    {message && <p className="success-message">{message}</p>}

                    <button type="submit" disabled={isLoading} className="verify-button">
                        {isLoading ? 'Verifying...' : 'Verify Account'}
                    </button>
                </form>

                <div className="resend-container">
                    <p>Didn't receive the code?</p>
                    <button onClick={handleResendOtp} disabled={isLoading} className="resend-button">
                        {isLoading ? 'Sending...' : 'Resend OTP'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
