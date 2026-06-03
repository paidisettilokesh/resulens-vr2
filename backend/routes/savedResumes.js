import express from "express";
import Resume from "../models/Resume.js";
import mongoose from "mongoose";

const router = express.Router();

// Get all saved resumes for a user
router.get("/", async (req, res) => {
    try {
        const userId = req.userId;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        if (!isValidObjectId) {
            return res.json([]);
        }
        const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });
        res.json(resumes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Save a new resume
router.post("/", async (req, res) => {
    try {
        const userId = req.userId;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        if (!isValidObjectId) {
            return res.status(400).json({ error: "Invalid user session for database operations" });
        }
        const { title, content, type } = req.body;

        if (!content) return res.status(400).json({ error: "Content is required" });

        const newResume = new Resume({
            userId,
            title: title || 'Untitled Resume',
            content,
            type: type || 'builder'
        });

        await newResume.save();

        res.json({
            success: true,
            id: newResume._id,
            message: "Resume saved successfully!"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save resume" });
    }
});

// Delete a saved resume
router.delete("/:id", async (req, res) => {
    try {
        const userId = req.userId;
        const id = req.params.id;
        
        const isValidUser = mongoose.Types.ObjectId.isValid(userId);
        const isValidId = mongoose.Types.ObjectId.isValid(id);
        
        if (!isValidUser || !isValidId) {
            return res.status(400).json({ error: "Invalid user session or resume ID format" });
        }
        
        const result = await Resume.deleteOne({ _id: id, userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Resume not found or unauthorized" });
        }

        res.json({ success: true, message: "Resume deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete" });
    }
});

export default router;
