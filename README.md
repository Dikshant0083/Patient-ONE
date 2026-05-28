# Vercel Deployment

This project can be deployed to Vercel as an Express serverless app.

## Required environment variables

- `MONGODB_URI`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `NODE_ENV=production`

## Google OAuth callback

Set your Google callback URL to:

- `https://YOUR-VERCEL-DOMAIN/auth/google/callback`

Example:

- `https://my-auth-app.vercel.app/auth/google/callback`

## Important Vercel note

- `socket.io` real-time connections do not work reliably on Vercel serverless functions.
- Normal page routes, login, registration, MongoDB, EJS rendering, and Google auth can still work.
- If you need persistent chat websockets, deploy the app to Render, Railway, or a VPS instead.

## Deploy steps

1. Push this project to GitHub.
2. Import the repo into Vercel.
3. Add the environment variables in Vercel project settings.
4. Update the Google OAuth authorized redirect URI.
5. Redeploy.

## Firebase authentication setup

This project uses Firebase Authentication only for Google sign-in.

- email/password login stays in MongoDB
- email/password registration stays in MongoDB
- Google sign-in uses Firebase Authentication
- app-specific user data stays in MongoDB

### Enable providers in Firebase

In the Firebase console:

1. Open `Authentication`.
2. Enable `Google`.
3. Add your deployment domain to the authorized domains list.

### Required Firebase web env vars

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID` (recommended)

### Required Firebase Admin env vars

Use either:

- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

or all of these:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

`FIREBASE_PRIVATE_KEY` should preserve line breaks as `\n` in environment variables.
