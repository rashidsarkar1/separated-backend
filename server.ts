import express, { type Application } from "express";
import path from "node:path";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import router from "./src/routes/index";
import type { DealerReceiptMongoDocument } from "./src/modules/dealer-receipts/dealer-receipt.routes";
import { globalErrorHandler } from "./src/middleware/globalErrorHandler";

dotenv.config();

const app: Application = express();
const port = Number(process.env.PORT) || 3000;
const runningOnVercel = process.env.VERCEL === "1";
let databaseConnection: Promise<void> | undefined;

function validateVercelEnvironment() {
  if (!runningOnVercel) return;
  const requiredVariables = [
    "MONGODB_URI",
    "JWT_SECRET",
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD",
    "CLIENT_URL",
  ];
  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required Vercel environment variables: ${missingVariables.join(", ")}`,
    );
  }
}

async function connectToDatabase() {
  validateVercelEnvironment();
  mongoose.set("bufferCommands", false);
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri?.trim() && !mongoUri.includes("your_mongodb_connection_string_here")) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
      console.log("✅ MongoDB Connected successfully");
    } catch (error: any) {
      if (runningOnVercel) throw error;
      const detail = error?.code === "ENOTFOUND" || error?.syscall === "querySrv"
        ? `Host DNS not found (${error?.hostname || "unresolvable domain"}). Check MONGODB_URI.`
        : error?.message || "Connection unreachable";
      console.warn(`⚠️ [Database] MongoDB is not reachable: ${detail}`);
      console.log("ℹ️ [Database] Continuing seamlessly in persistent in-memory database mode.");
    }
  } else {
    if (runningOnVercel) throw new Error("MONGODB_URI must be configured for Vercel.");
    console.log("ℹ️ [Database] Operating in persistent in-memory database mode.");
  }
}

export function ensureDatabaseConnection(): Promise<void> {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!databaseConnection) {
    databaseConnection = connectToDatabase().catch((error) => {
      databaseConnection = undefined;
      throw error;
    });
  }
  return databaseConnection;
}

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error(`Origin ${origin} is not allowed by CLIENT_URL`));
}, credentials: true }));
app.use(express.json({ limit: runningOnVercel ? "4.2mb" : "20mb" }));
app.use(cookieParser());
app.get("/uploads/dealer-receipts/:fileName", async (req, res, next) => {
  const fileName = path.basename(req.params.fileName);
  try {
    if (runningOnVercel) {
      const receipt = await mongoose.connection
        .collection<DealerReceiptMongoDocument>("dealerReceipts")
        .findOne({ imageFileName: fileName });
      if (receipt?.imageBuffer) {
        res.type(String(receipt.imageContentType || "application/octet-stream"));
        res.send(receipt.imageBuffer);
        return;
      }
      res.sendStatus(404);
      return;
    }

    res.sendFile(
      path.join(process.cwd(), "data", "dealer-receipts", "images", fileName),
      (error) => {
        if (error) next(error);
      },
    );
  } catch (error) {
    next(error);
  }
});
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === "POST" && req.path !== "/api/v1/dealer-receipts") console.log("Body:", req.body);
  next();
});
app.use("/api/v1", router);
app.get("/api/health", (_req, res) => res.json({ status: "UP", timestamp: new Date(), env: process.env.NODE_ENV, port }));
app.use(globalErrorHandler);

if (!runningOnVercel) {
  void ensureDatabaseConnection().then(() => {
    app.listen(port, "0.0.0.0", () => console.log(`🚀 API server running on http://localhost:${port}`));
  }).catch((error) => {
    console.error("⚠️ [Database] Unable to initialize the server:", error);
    process.exitCode = 1;
  });
}

export default app;
