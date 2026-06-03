import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: mongoose.Schema.Types.Mixed, // Stores the full structured resume JSON
        required: true
    },
    rawText: String,
    type: {
        type: String,
        enum: ['builder', 'uploaded'],
        default: 'builder'
    }
}, {
    timestamps: true
});

// Index for optimizing queries fetching user resumes by type
resumeSchema.index({ userId: 1, type: 1 });

const Resume = mongoose.model('Resume', resumeSchema);

export default Resume;
