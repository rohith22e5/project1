import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import helmet from 'helmet';
import winston from 'winston';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// 1. LOGGER CONFIGURATION
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// 2. CORS CONFIGURATION (MUST BE FIRST)
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://project1-brown-iota-76.vercel.app/' // Hardcoded as fallback
];

// Add environment variable URL if it exists
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            logger.error(`CORS Blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// 3. EXPLICIT PREFLIGHT HANDLING
app.options('*', cors());

// 4. SECURITY MIDDLEWARE
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Set to false if you're serving frontend from same server
}));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// 5. BODY PARSING & COOKIES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 6. RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, 
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to specific paths
app.use('/api/auth', limiter);
app.use('/api/admin', limiter);

// 7. REQUEST LOGGING
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// 8. STATIC FILES & DIRECTORY SETUP
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 9. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);

// 10. HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running', env: process.env.NODE_ENV });
});

// 11. FRONTEND SERVING (If applicable)
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.resolve(__dirname, '..', 'frontend', 'project1', 'dist');
    if (fs.existsSync(frontendPath)) {
        app.use(express.static(frontendPath));
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(frontendPath, 'index.html'));
        });
    }
}

// 12. ERROR HANDLING
app.use(errorHandler);

// 13. SERVER START
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => { // Using 0.0.0.0 for Cloud Deployment
        logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  }).catch(err => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });
}

export default app;