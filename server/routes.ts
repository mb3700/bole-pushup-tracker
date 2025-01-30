import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { pushups } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configure multer for video uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["video/mp4", "video/quicktime"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP4 and MOV videos are allowed."));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

export function registerRoutes(app: Express): Server {
  app.get("/api/pushups", async (req, res) => {
    try {
      const entries = await db.select().from(pushups);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching pushups:", error);
      res.status(500).json({ message: "Failed to fetch pushup entries" });
    }
  });

  app.post("/api/pushups", async (req, res) => {
    try {
      const { count, date } = req.body;
      if (!count || isNaN(count)) {
        return res.status(400).json({ message: "Invalid count value" });
      }

      const entry = await db
        .insert(pushups)
        .values({
          count: Number(count),
          date: date ? new Date(date) : new Date(),
        })
        .returning();

      res.json(entry[0]);
    } catch (error) {
      console.error("Error adding pushup:", error);
      res.status(500).json({ message: "Failed to add pushup entry" });
    }
  });

  // Form check endpoint
  app.post("/api/form-check", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res
          .status(500)
          .json({ message: "Gemini API key not configured" });
      }

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

      // Read the video file
      const videoData = await fs.promises.readFile(req.file.path);
      const base64Video = videoData.toString('base64');

      // Generate prompt for video analysis
      const prompt = `
        Analyze this pushup video and provide feedback on:
        1. Form and technique
        2. Areas for improvement
        3. Safety concerns (if any)
        Be specific but concise in your feedback.
      `;

      // Analyze the video
      const result = await model.generateContent({
        contents: [{
          parts: [{
            text: prompt
          }, {
            inlineData: {
              mimeType: req.file.mimetype,
              data: base64Video
            }
          }]
        }]
      });
      const response = await result.response.text();

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        analysis: response,
      });
    } catch (error) {
      console.error("Error processing form check:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process form check",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.delete("/api/pushups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(pushups).where(eq(pushups.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pushup:", error);
      res.status(500).json({ message: "Failed to delete pushup entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
