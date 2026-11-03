# Backend API

Express + TypeScript API with feature-based routes and Mongoose models. Local development stores receipt images and metadata under `data/dealer-receipts`; Vercel stores them in MongoDB.

## Run

1. Install Node.js 20+ and MongoDB (local or hosted).
2. Copy `.env.example` to `.env`, set `MONGODB_URI`, a private `JWT_SECRET`, administrator credentials, `PORT`, and the frontend origin in `CLIENT_URL`.
3. Run `npm install`, then `npm run dev` (or `npm start`).
4. Check `http://localhost:3000/api/health`.

`CLIENT_URL` accepts a comma-separated list of frontend origins. API base path: `/api/v1`.

## Structure

- `server.ts`: Express app, database connection, middleware, receipt image serving, health route, and API mounting
- `src/routes`: central feature route registration
- `src/modules/*/*.routes.ts`: feature-specific API routes
- `src/modules/*/*.model.ts`: Mongoose schemas/models
- `src/services`: AI integration (in this project, AI backend client)
- `src/middleware`, `src/shared`, `src/utils`: shared middleware/helpers
- `data`: receipt metadata and image files

The original API implementation uses feature route files for request handling and includes Mongoose models. Existing in-memory fallback behavior remains when MongoDB cannot connect.

## Deploy to Vercel

1. Configure `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `CLIENT_URL` in the Vercel project environment. Add `GEMINI_API_KEY` if AI routes are needed. Do not commit `.env` or paste secrets into source files.
2. Authenticate with the Vercel CLI (`npx vercel login`), link this directory (`npx vercel link`), then deploy with `npx vercel --prod`.
3. Receipt images are stored in MongoDB on Vercel. Because of Vercel's request-size limit, Vercel receipt uploads are limited to 3 MB per image; local development keeps the 15 MB limit.
