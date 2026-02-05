import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { registerSchema, loginSchema } from '../validation/authValidation.js';
import logger from '../config/logger.js';

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const registerUser = asyncHandler(async (req, res) => {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.errors.map(e => ({
            field: e.path[0],
            message: e.message
        }));

        return res.status(400).json({
            success: false,
            errors
        });
    }

    const { email, password } = result.data;
    const username = email.split('@')[0]; // Or generate a unique one

    if (await User.findOne({ email })) {
        res.status(400);
        throw new Error('User with this email already exists');
    }

    // Optional: Check for username uniqueness if you use it
    if (await User.findOne({ username })) {
        // Handle username collision, e.g., by appending a random number
        // For now, we'll proceed but this is a consideration.
    }

    const user = await User.create({ username, email, password, isEmailVerified: true });

    if (user) {
        const token = generateToken(user._id);
            
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token
        });

    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
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
    loginUser, 
    logoutUser, 
    getUserProfile,
    updateUserProfile,
    updateUserPassword
}; 