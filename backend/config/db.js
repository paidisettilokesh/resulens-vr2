import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const connectDB = async (retryCount = 0) => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI environment variable is missing");
        }
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        global.isMongoConnected = true;
        global.mongoError = null;

        // Handle unexpected disconnections
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Switching to fallback mode.');
            global.isMongoConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected.');
            global.isMongoConnected = true;
        });

    } catch (error) {
        global.isMongoConnected = false;
        global.mongoError = error.message;
        console.error(`❌ MongoDB Connection Error: ${error.message}`);

        if (retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
            console.log(`🔁 Retrying MongoDB connection in ${delay / 1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => connectDB(retryCount + 1), delay);
        } else {
            console.warn(`⚠️ All ${MAX_RETRIES} MongoDB connection attempts failed.`);
            console.warn('⚠️ Running in Fallback Mode — authentication will be DISABLED. Only guest access is available.');
        }
    }
};

export default connectDB;
