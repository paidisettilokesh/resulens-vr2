import mongoose from 'mongoose';

const aiCacheSchema = new mongoose.Schema({
    promptHash: {
        type: String,
        required: true,
        unique: true
    },
    response: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // Auto-deletes document when current time matches/passes expiresAt
    }
}, {
    timestamps: true
});

const AICache = mongoose.model('AICache', aiCacheSchema);

export default AICache;
