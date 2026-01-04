import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { pushups, walks } from "@db/schema";
import { eq, and } from "drizzle-orm";
import multer from "multer";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { setupAuth } from "./auth";

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
  setupAuth(app);

  app.get("/api/pushups", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = req.user!.id;
      const entries = await db.select().from(pushups).where(eq(pushups.userId, userId));
      res.json(entries);
    } catch (error) {
      console.error("Error fetching pushups:", error);
      res.status(500).json({ message: "Failed to fetch pushup entries" });
    }
  });

  app.post("/api/pushups", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { count, date } = req.body;
      const userId = req.user!.id;

      if (!count || isNaN(count)) {
        return res.status(400).json({ message: "Invalid count value" });
      }

      const values = {
        userId,
        count: Number(count),
        date: date ? new Date(date) : new Date(),
      };

      const entry = await db.insert(pushups).values(values).returning();
      return res.status(200).json(entry[0]);
    } catch (error) {
      console.error("Error adding pushup:", error);
      res.status(500).json({ message: "Failed to add pushup entry" });
    }
  });

  app.post("/api/form-check", upload.single("video"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No video file uploaded" });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const isDeployment = process.env.REPLIT_DEPLOYMENT === "1";
        console.log("Environment Variables Check:", {
          hasGeminiKey: !!process.env.GEMINI_API_KEY,
          keyLength: apiKey?.length || 0,
          isDeployment,
          environment: process.env.NODE_ENV,
          replit_slug: process.env.REPL_SLUG || 'not set',
          replit_owner: process.env.REPL_OWNER || 'not set',
          deployment_id: process.env.DEPLOYMENT_ID || 'not set'
        });
        
        if (!apiKey) {
          const error = isDeployment 
            ? "Gemini API key not configured in deployment environment" 
            : "Gemini API key not configured";
          console.error(error, {deployment: isDeployment});
          return res.status(500).json({ 
            message: `${error} - please check environment variables`,
            isDeployment
          });
        }
        if (!apiKey) {
          console.error("Missing GEMINI_API_KEY environment variable");
          return res
            .status(500)
            .json({ message: "Gemini API key not configured - please check environment variables" });
        }

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      // Compress video using ffmpeg
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
          '-t', '60',
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
        Watch the COMPLETE video before providing analysis. Focus on specific technique details:

        1. Initial Setup & Transitions:
           - Note precise starting position
           - Document ANY form changes or transitions
           - Timing of transitions

        2. Technical Analysis for EACH Phase:
           - Elbow positioning (angle relative to body)
           - Body alignment (head, shoulders, hips, feet)
           - Movement speed and control
           - Depth of movement
           - Core engagement

        3. Improvements:
           - Prioritize key form corrections
           - Suggest specific adjustments for each issue
           - Focus on technique over quantity

        4. Safety:
           - Note joint positions and stress points
           - Identify any compensation patterns

        Watch minimum 15-20 seconds. Be specific about observed form rather than assumptions.
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        message: `Failed to process form check: ${errorMessage}`,
        error: errorMessage,
      });
    }
  } catch (error) {
    console.error("Error in form check route:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during form check",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
  });

  app.delete("/api/pushups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await db.delete(pushups).where(and(eq(pushups.id, parseInt(id)), eq(pushups.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pushup:", error);
      res.status(500).json({ message: "Failed to delete pushup entry" });
    }
  });

  app.get("/api/walks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = req.user!.id;
      const entries = await db.select().from(walks).where(eq(walks.userId, userId));
      res.json(entries);
    } catch (error) {
      console.error("Error fetching walks:", error);
      res.status(500).json({ message: "Failed to fetch walk entries" });
    }
  });

  app.post("/api/walks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { miles, date } = req.body;
      const userId = req.user!.id;

      if (!miles || isNaN(miles)) {
        return res.status(400).json({ message: "Invalid miles value" });
      }

      const values = {
        userId,
        miles: Number(miles),
        date: date ? new Date(date) : new Date(),
      };

      const entry = await db.insert(walks).values(values).returning();
      return res.status(200).json(entry[0]);
    } catch (error) {
      console.error("Error adding walk:", error);
      res.status(500).json({ message: "Failed to add walk entry" });
    }
  });

  app.delete("/api/walks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await db.delete(walks).where(and(eq(walks.id, parseInt(id)), eq(walks.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting walk:", error);
      res.status(500).json({ message: "Failed to delete walk entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}