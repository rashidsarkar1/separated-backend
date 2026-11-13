import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "../utils/AppError";

export interface AdminTokenPayload extends JwtPayload {
  username: string;
  role: "admin";
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authorization = req.header("authorization") || "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    return next(new AppError(401, "Authentication required"));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new AppError(503, "Authentication is not configured"));
  }

  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
    if (
      typeof payload === "string" ||
      typeof payload.username !== "string" ||
      payload.role !== "admin"
    ) {
      return next(new AppError(401, "Invalid authentication token"));
    }
    return next();
  } catch {
    return next(new AppError(401, "Session expired or token is invalid"));
  }
}
