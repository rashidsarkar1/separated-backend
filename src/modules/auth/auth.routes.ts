import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import catchAsync from "../../shared/catchasync";
import { AppError } from "../../utils/AppError";
import sendResponse from "../../utils/sendResponse";
import { requireAuth } from "../../middleware/requireAuth";
import { AdminAccount } from "./auth.model";

const router = Router();

router.post(
  "/login",
  catchAsync(async (req, res) => {
    const submittedUsername =
      typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const submittedPassword =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!submittedUsername || !submittedPassword) {
      throw new AppError(400, "Username and password are required");
    }
    if (mongoose.connection.readyState !== 1) {
      throw new AppError(503, "Authentication database is unavailable");
    }

    const account = await AdminAccount.findById("primary-admin")
      .select("+passwordHash")
      .lean();
    if (!account?.passwordHash) {
      throw new AppError(503, "Admin authentication account is unavailable");
    }
    const passwordMatches = await bcrypt.compare(
      submittedPassword,
      account.passwordHash,
    );
    if (submittedUsername !== account.username || !passwordMatches) {
      throw new AppError(401, "Invalid username or password");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError(503, "Authentication is not configured");
    }
    const token = jwt.sign(
      { username: account.username, role: "admin" },
      secret,
      { expiresIn: "1d", algorithm: "HS256" },
    );
    const expiresAt =
      (jwt.decode(token) as jwt.JwtPayload).exp! * 1000;

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: {
        token,
        expiresAt,
        user: { username: account.username, role: "admin" },
      },
    });
  }),
);

router.get(
  "/me",
  requireAuth,
  catchAsync(async (req, res) => {
    const authorization = req.header("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Session is valid",
      data: { username: payload.username, role: payload.role },
    });
  }),
);

export const AuthRoutes = router;
