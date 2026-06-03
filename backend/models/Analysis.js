import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobRole: String,
    candidateName: String,
    atsScore: Number,
    jobMatchScore: Number,
    roleSuitability: String,
    summary: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for optimizing queries fetching user analysis records sorted by date
analysisSchema.index({ userId: 1, timestamp: -1 });

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;
