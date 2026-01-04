import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import logger from '../config/logger.js';

const protect = asyncHandler(async (req, res, next) => {
    logger.debug("Auth middleware called");
    
    // Get token from request
    let token = req.cookies?.jwt;
    

    if (!token && req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        
    }

    if (!token) {
        
        res.status(401);
        throw new Error('Not authorized, please log in');
    }

    try {
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
            
            
            res.status(401);
            throw new Error('Session expired, please log in again');
        }
        
        
        
        // Find user by ID
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            
            res.status(401);
            throw new Error('User not found, please log in again');
        }
        
        
        req.user = user;
        next();
    } catch (error) {
        
        
        // Return specific error message based on the JWT error
        if (error.name === 'TokenExpiredError') {
            res.status(401);
            throw new Error('Session expired, please log in again');
        } else if (error.name === 'JsonWebTokenError') {
            res.status(401);
            throw new Error('Invalid token, please log in again');
        } else {
            res.status(401);
            throw new Error('Not authorized, please log in again');
        }
    }
});

export { protect }; 