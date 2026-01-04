import mongoose from 'mongoose';
import logger from './logger.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        logger.error(`Database Connection Error: ${error.message}`, error);
        process.exit(1);
    }
};

export default connectDB; 