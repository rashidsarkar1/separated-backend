import type { Request, Response } from "express";
import app, { ensureDatabaseConnection } from "../server";

export default async function handler(req: Request, res: Response) {
  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.error("[Database] Vercel request could not connect to MongoDB:", error);
    res.status(503).json({ status: "ERROR", message: "Database is unavailable" });
    return;
  }

  app(req, res);
}
