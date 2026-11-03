import { Request, Response, NextFunction } from 'express';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong!';

  console.error(`[Global Error Handler] Status: ${statusCode}, Message: ${message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    // optional: console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorMessages: err.errors || [],
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
