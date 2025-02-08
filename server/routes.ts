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
  fs.mkdirSync("uploads", { recursive: true, mode: 0o777 });
}

export function registerRoutes(app: Express): Server {
  app.get("/api/pushups", async (req, res) => {
    try {
      console.log("Fetching pushups from database...");
      const entries = await db.select().from(pushups);
      console.log("Database entries:", entries);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching pushups:", error);
      res.status(500).json({ message: "Failed to fetch pushup entries" });
    }
  });

  app.post("/api/pushups", async (req, res) => {
    try {
      const { count, date } = req.body;
      console.log("Received pushup data:", { count, date });

      if (!count || isNaN(count)) {
        return res.status(400).json({ message: "Invalid count value" });
      }

      console.log("Attempting database insert...");

      // Verify pushups table exists
      const tables = await db.query.pushups.findMany();
      console.log("Current pushups table state:", tables);

      const values = {
        count: Number(count),
        date: date ? new Date(date) : new Date(),
      };
      console.log("Inserting values:", values);
      try {
        const entry = await db
          .insert(pushups)
          .values(values)
          .returning();
        console.log("Successfully inserted entry:", entry[0]);
        return res.status(200).json(entry[0]);
      } catch (err) {
        console.error("Database insertion error:", err);
        return res.status(500).json({ error: "Failed to insert pushup entry" });
      }
      res.json(entry[0]);
    } catch (error) {
      console.error("Error adding pushup:", error);
      res.status(500).json({ message: "Failed to add pushup entry" });
    }
  });

  // Form check endpoint
  app.post("/api/form-check", upload.single("video"), async (req, res) => {
    try {
      console.log("Processing video upload request");

      if (!req.file) {
        console.error("No video file uploaded");
        return res.status(400).json({ success: false, error: "No video file uploaded" });
      }

      console.log("Video file received:", req.file.path);

      if (!process.env.GEMINI_API_KEY) {
        console.error("Gemini API key missing");
        return res.status(500).json({ success: false, error: "AI service not configured" });
      }

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      // Compress video using ffmpeg
      console.log("Starting video compression");
      const compressedPath = `${req.file.path}_compressed.mp4`;
      await new Promise(async (resolve, reject) => {
        const { spawn } = await import('child_process');
        const ffmpeg = spawn('ffmpeg', [
          '-i', req.file.path,
          '-vf', 'scale=480:-2',
          '-c:v', 'libx264',
          '-crf', '28',
          '-preset', 'veryfast',
          '-movflags', '+faststart',
          '-pix_fmt', 'yuv420p',
          '-t', '30',
          '-y',
          compressedPath
        ]);

        let errorOutput = '';
        ffmpeg.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            console.error('FFmpeg error output:', errorOutput);
            reject(new Error(`Failed to compress video: ${errorOutput}`));
          }
        });
      });

      // Read the compressed video
      const videoData = await fs.promises.readFile(compressedPath);
      const base64Video = videoData.toString('base64');

      // Clean up compressed video
      fs.unlinkSync(compressedPath);

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


      //Improved error handling: Check for successful analysis and response
      if (!response) {
        console.error('No response received from Gemini API.');
        throw new Error('Failed to analyze video: No response from Gemini.');
      }


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