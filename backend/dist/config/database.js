"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoose = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
exports.mongoose = mongoose_1.default;
const env_1 = require("./env");
let isConnected = false;
async function connectDatabase() {
    if (isConnected)
        return;
    try {
        await mongoose_1.default.connect(env_1.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        isConnected = true;
        console.log('✅ MongoDB connected');
        mongoose_1.default.connection.on('disconnected', () => {
            isConnected = false;
            console.warn('⚠️  MongoDB disconnected');
        });
        mongoose_1.default.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err);
        });
    }
    catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
    }
}
async function disconnectDatabase() {
    if (!isConnected)
        return;
    await mongoose_1.default.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
}
//# sourceMappingURL=database.js.map