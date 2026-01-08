import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { registerSchema, loginSchema } from '../validation/authValidation.js';
import { OAuth2Client } from 'google-auth-library';
import logger from '../config/logger.js';
import sendEmail from '../utils/sendEmail.js';

// Google OAuth client setup
const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// --- NEW --- Function to send OTP
const sendVerificationEmail = async (user) => {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationToken = otp;
    user.emailVerificationTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false }); // Skip validation to save token

    // Send email
    await sendEmail({
        email: user.email,
        subject: 'Verify Your Email Address',
        message: `Welcome! Your One-Time Password (OTP) for email verification is: ${otp}\nThis code will expire in 10 minutes.`
    });
};


// Generates a Google OAuth URL for frontend to redirect to
const getGoogleAuthURL = asyncHandler(async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URL) {
        logger.error('Missing Google OAuth credentials in environment variables');
        res.status(500);
        throw new Error('Server configuration error: Google OAuth is not properly configured');
    }

    const scopes = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
    ];

    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const urlParams = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URL,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes.join(' '),
        state: JSON.stringify({
            redirectUrl: req.query.redirectUrl || process.env.FRONTEND_URL,
        }),
    });

    const authUrl = `${baseUrl}?${urlParams.toString()}`;
    res.json({ authUrl });
});

// Google OAuth callback handler
const googleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
        res.status(400);
        throw new Error('Authorization code is required');
    }
    
    try {
        const tokenUrl = 'https://oauth2.googleapis.com/token';
        const tokenParams = new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URL,
            grant_type: 'authorization_code'
        });
        
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams.toString()
        });
        
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({}));
            throw new Error(`Token exchange failed: ${errorData.error || tokenResponse.statusText}`);
        }
        
        const tokens = await tokenResponse.json();
        
        if (!tokens.id_token) {
            throw new Error('Invalid token response from Google');
        }
        
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });
        
        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user information from Google');
        }
        
        const { email, name, picture, sub } = await userInfoResponse.json();
        
        if (!email) {
            throw new Error('Failed to extract user information');
        }
        
        let user = await User.findOne({ email });
        
        if (!user) {
            const password = Math.random().toString(36).slice(-8);
            let username = name || email.split('@')[0];
            // Ensure username is unique
            if (await User.findOne({ username })) {
                username = `${username}${Math.floor(Math.random() * 1000)}`;
            }

            user = await User.create({
                username,
                email,
                password,
                googleId: sub,
                avatar: picture || '',
                isGoogleUser: true,
                isEmailVerified: true // Google users are verified by default
            });
        } else {
            user.googleId = sub;
            user.isGoogleUser = true;
            user.isEmailVerified = true; // Mark as verified
            if (picture && !user.avatar) user.avatar = picture;
            await user.save();
        }
        
        const token = generateToken(user._id);
        
        let redirectUrl = process.env.FRONTEND_URL;
        try {
            if (state) redirectUrl = JSON.parse(state).redirectUrl || redirectUrl;
        } catch (err) {
            logger.error('Error parsing state:', err);
        }
        
        res.redirect(`${redirectUrl}/oauth/callback?token=${token}&userId=${user._id}`);
        
    } catch (error) {
        logger.error(`Google OAuth Callback Error: ${error.stack}`);
        const redirectUrl = process.env.FRONTEND_URL;
        const errorMessage = encodeURIComponent(error.message || 'Authentication failed');
        res.redirect(`${redirectUrl}/oauth/callback?error=${errorMessage}`);
    }
});

// --- MODIFIED ---
const registerUser = asyncHandler(async (req, res) => {
    const validatedData = registerSchema.parse(req.body);
    const { username, email, password, mobile } = validatedData;

    if (await User.findOne({ email })) {
        res.status(400);
        throw new Error('User with this email already exists');
    }

    if (await User.findOne({ username })) {
        res.status(400);
        throw new Error('Username is already taken');
    }

    const user = await User.create({ username, email, password, mobile });

    if (user) {
        try {
            await sendVerificationEmail(user);
            res.status(201).json({
                message: `A verification email has been sent to ${user.email}. Please check your inbox and enter the OTP.`,
                userId: user._id
            });
        } catch (error) {
            // If email sending fails, roll back user creation for cleaner state
            await User.deleteOne({ _id: user._id });
            res.status(500);
            throw new Error('Failed to send verification email. Please try registering again.');
        }
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// --- NEW ---
const verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        res.status(400);
        throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationTokenExpires');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user.isEmailVerified) {
        res.status(400);
        throw new Error('Email is already verified');
    }

    const isTokenValid = user.emailVerificationToken === otp;
    const isTokenExpired = user.emailVerificationTokenExpires < new Date();

    if (!isTokenValid || isTokenExpired) {
        res.status(400);
        throw new Error('Invalid or expired OTP. Please request a new one.');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    const token = generateToken(user._id);
            
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
        message: 'Email verified successfully. You are now logged in.',
        _id: user._id,
        username: user.username,
        email: user.email,
        token
    });
});

// --- NEW ---
const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        res.status(400);
        throw new Error('Email is required');
    }

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user.isEmailVerified) {
        res.status(400);
        throw new Error('This email is already verified.');
    }

    try {
        await sendVerificationEmail(user);
        res.status(200).json({ message: `A new verification email has been sent to ${email}.` });
    } catch (error) {
        res.status(500);
        throw new Error('Failed to resend verification email. Please try again later.');
    }
});


// --- MODIFIED ---
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        if (!user.isEmailVerified) {
            res.status(401);
            throw new Error('Please verify your email before logging in. You can request a new verification code.');
        }

        const token = generateToken(user._id);
        
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// Google OAuth login handler (client-side flow)
const googleLogin = asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
        res.status(400);
        throw new Error('Google ID token is required');
    }
    
    try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });
        } catch (error) {
            res.status(401);
            throw new Error('Invalid Google token');
        }

        const { email, name, picture, sub } = ticket.getPayload();
        
        let user = await User.findOne({ email });
        
        if (!user) {
            const password = Math.random().toString(36).slice(-8);
            let username = name || email.split('@')[0];
            if (await User.findOne({ username })) {
                username = `${username}${Math.floor(Math.random() * 1000)}`;
            }
            
            user = await User.create({
                username,
                email,
                password,
                googleId: sub,
                avatar: picture || '',
                isGoogleUser: true,
                isEmailVerified: true // Google users are verified by default
            });
        } else {
            user.googleId = sub;
            user.isGoogleUser = true;
            user.isEmailVerified = true; // Mark as verified
            if (picture && !user.avatar) user.avatar = picture;
            await user.save();
        }
        
        const token = generateToken(user._id);
        
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });
        
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token
        });
    } catch (error) {
        logger.error(`Google OAuth Error: ${error.stack}`);
        res.status(401);
        throw new Error('Google authentication failed');
    }
});

const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            name: user.name,
            mobile: user.mobile,
            address: user.address,
            state: user.state,
            country: user.country,
            avatar: user.avatar,
            role: user.role,
            isGoogleUser: user.isGoogleUser,
            isEmailVerified: user.isEmailVerified
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (req.body.username && req.body.username !== user.username) {
        const usernameExists = await User.findOne({ username: req.body.username });
        if (usernameExists) {
            res.status(400);
            throw new Error('Username is already taken');
        }
    }

    user.username = req.body.username || user.username;
    user.name = req.body.name || user.name;
    user.mobile = req.body.mobile || user.mobile;
    user.address = req.body.address || user.address;
    user.state = req.body.state || user.state;
    user.country = req.body.country || user.country;
    user.avatar = req.body.avatar || user.avatar;
    
    const updatedUser = await user.save();

    res.json({
        success: true,
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        mobile: updatedUser.mobile,
        address: updatedUser.address,
        state: updatedUser.state,
        country: updatedUser.country,
        avatar: updatedUser.avatar,
    });
});

const updateUserPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error('Current and new password are required');
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    if (!await user.matchPassword(currentPassword)) {
        res.status(401);
        throw new Error('Current password is incorrect');
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
});

export { 
    registerUser,
    verifyEmail,
    resendVerificationEmail,
    loginUser, 
    googleLogin, 
    googleCallback, 
    getGoogleAuthURL, 
    logoutUser, 
    getUserProfile,
    updateUserProfile,
    updateUserPassword
}; 