# Google Sign-In Setup Guide for ResuLens

This guide explains how to configure Google Sign-In for local development and production.

---

## How the Integration Works

ResuLens uses **Google Identity Services (GIS)** — Google's current recommended sign-in approach.

```
User clicks "Continue with Google"
        ↓
Google popup (handled entirely by Google)
        ↓
Google issues a signed JWT credential (ID token)
        ↓
ResuLens frontend sends credential to POST /api/auth/google
        ↓
Backend verifies token with verifyIdToken() — no secret needed
        ↓
Backend finds or creates ResuLens account
        ↓
Backend issues ResuLens JWT session token
        ↓
User lands on Dashboard
```

**Security note:** Only the public `GOOGLE_CLIENT_ID` is required.
`GOOGLE_CLIENT_SECRET` is **not needed or used** in this flow.

---

## Step 1 — Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown → **New Project**
3. Name it (e.g. `ResuLens`) → **Create**
4. Make sure the new project is selected

---

## Step 2 — Enable the Required API

1. In the left sidebar → **APIs & Services** → **Library**
2. Search for **"Google Identity"** or **"People API"**
3. Click **Google People API** → **Enable**

   _(Only needed if you plan to request profile scopes beyond the default ID token.)_

---

## Step 3 — Configure the OAuth Consent Screen

1. **APIs & Services** → **OAuth consent screen**
2. Select **External** → **Create**
3. Fill in:
   - **App name:** `ResuLens`
   - **User support email:** your email
   - **Developer contact:** your email
4. Click **Save and Continue** through the remaining steps (Scopes, Test users)
5. On the **Scopes** step — no extra scopes needed. The default OpenID + email + profile is sufficient.
6. On **Test users** — add your own Google account email(s) while the app is in "Testing" mode.
7. Click **Back to Dashboard**

---

## Step 4 — Create OAuth 2.0 Credentials

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
2. **Application type:** `Web application`
3. **Name:** `ResuLens Web Client` (or any name)

### Authorised JavaScript origins (where Google allows the sign-in popup to load from):

**For local development:**
```
http://localhost:5173
http://127.0.0.1:5173
```

**For production** (add your real domain):
```
https://yourdomain.com
https://www.yourdomain.com
```

### Authorised redirect URIs

This integration uses the **implicit / credential callback** flow (GIS one-tap).
No redirect URIs are required for the ID token flow used here.

4. Click **Create**
5. Copy the **Client ID** — it looks like:
   ```
   123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   ```

---

## Step 5 — Configure Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

### Backend (`backend/.env`)

```env
GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

> Both values must be **identical** and match the Client ID from Google Cloud Console.

> `GOOGLE_CLIENT_SECRET` is intentionally **not configured** — it is not needed for this flow.

---

## Step 6 — Restart the Development Server

After updating `.env` files, Vite must be restarted to pick up the new variables:

```bash
# In the frontend directory:
npm run dev

# In the backend directory:
npm run dev
```

The "Continue with Google" button will now appear in the auth modal.

---

## Production Deployment

When deploying to production:

1. Add the production domain to **Authorised JavaScript origins** in Google Cloud Console.
2. Set `VITE_GOOGLE_CLIENT_ID` in your hosting platform's environment variables (e.g. Vercel, Netlify).
3. Set `GOOGLE_CLIENT_ID` in your backend hosting platform's environment variables (e.g. Render, Railway).
4. **Publish** your OAuth consent screen (move from Testing → Production) when you are ready for public users.

### Vercel (frontend)
In your Vercel project → **Settings** → **Environment Variables**:
```
VITE_GOOGLE_CLIENT_ID = <your client id>
```

### Netlify (frontend)
In your Netlify site → **Site configuration** → **Environment variables**:
```
VITE_GOOGLE_CLIENT_ID = <your client id>
```

### Render (backend)
In your Render service → **Environment**:
```
GOOGLE_CLIENT_ID = <your client id>
```

---

## Security Checklist

- [ ] `GOOGLE_CLIENT_ID` is public — safe to expose in frontend code
- [ ] `GOOGLE_CLIENT_SECRET` is **not used** and **not stored** — correct by design
- [ ] `.env` files are in `.gitignore` — never committed to git
- [ ] Token verification happens on the **server** (`verifyIdToken`)
- [ ] Tokens are not persisted — only the resulting ResuLens JWT is stored
- [ ] `googleId` (Google's stable `sub` claim) is used as identity anchor, not email alone
- [ ] Account status (suspended/inactive) is checked before issuing JWT
- [ ] Rate limiting is applied to `/api/auth/google`

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Google button not visible | `VITE_GOOGLE_CLIENT_ID` is unset or placeholder | Set the real Client ID in `frontend/.env` and restart Vite |
| "Google authentication is not configured on this server" | `GOOGLE_CLIENT_ID` missing from backend `.env` | Add it to `backend/.env` and restart the backend |
| "idpiframe_initialization_failed" | Domain not in Authorised JavaScript origins | Add `http://localhost:5173` to Google Cloud Console origins |
| "Token audience mismatch" | Frontend and backend Client IDs differ | Ensure both `.env` files have the same Client ID |
| Button disappears after theme change | Old bug (now fixed in Auth.jsx) | Already resolved — pull latest code |
| Button disappears after login↔signup switch | Old bug (now fixed in Auth.jsx) | Already resolved — pull latest code |
