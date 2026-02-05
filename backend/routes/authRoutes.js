import express from 'express';
import { 
    registerUser,
    loginUser, 
    logoutUser, 
    getUserProfile,
    updateUserProfile,
    updateUserPassword
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile/update', protect, updateUserProfile);
router.put('/profile/password', protect, updateUserPassword);

export default router; 