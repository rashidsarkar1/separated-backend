import { Router } from 'express';
import catchAsync from '../../shared/catchasync';
import sendResponse from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = Router();

router.post(
  '/login',
  catchAsync(async (req, res) => {
    const { username, password } = req.body;

    const rawAdminUsername = process.env.ADMIN_USERNAME || 'admin';
    const rawAdminPass = process.env.ADMIN_PASSWORD || 'admin123';

    const adminUsername = rawAdminUsername.trim();
    const adminPass = rawAdminPass.trim();

    const submittedUsername = (username || '').toString().trim();
    const submittedPassword = (password || '').toString().trim();

    console.log(`[Auth Debug] Comparing User: "${submittedUsername}" (len: ${submittedUsername.length}) vs "${adminUsername}" (len: ${adminUsername.length})`);
    console.log(`[Auth Debug] Comparing Pass: "${submittedPassword}" (len: ${submittedPassword.length}) vs "${adminPass}" (len: ${adminPass.length})`);

    if (!submittedUsername || !submittedPassword) {
      throw new AppError(400, 'Username and password are required');
    }

    if (submittedUsername !== adminUsername) {
      console.warn(`[Auth] Username mismatch`);
      throw new AppError(401, 'Unauthorized: Invalid username');
    }

    if (submittedPassword !== adminPass) {
      console.warn(`[Auth] Password mismatch`);
      // DEBUG ONLY: Remove this before production
      throw new AppError(401, `Unauthorized: Invalid password. Submitted: "${submittedPassword}" (${submittedPassword.length}), Expected: "${adminPass}" (${adminPass.length})`);
    }

    console.log(`[Auth] Success for user: ${submittedUsername}`);

    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Login successful',
      data: { token, user: { username, role: 'admin' } },
    });
  })
);

export const AuthRoutes = router;
