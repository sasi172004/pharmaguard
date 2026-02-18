# 🚀 PharmaGuard Deployment Guide

This guide covers the final steps to get your application live on the web.

## 📦 Phase 2: Push to GitHub
**Prerequisite:** Create a new empty repository at [github.com/new](https://github.com/new) named `pharmaguard`.

Run these commands in your terminal (VS Code):
```bash
# 1. Initialize Git
git init

# 2. Stage all files
git add .

# 3. Commit your work
git commit -m "Initial production release"

# 4. Rename branch to main
git branch -M main

# 5. Link to your GitHub repo (Replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/pharmaguard.git

# 6. Push code
git push -u origin main
```

---

## ☁️ Phase 3: Deploy Backend (Render)
1. Go to [dashboard.render.com](https://dashboard.render.com/)
2. Click **New +** -> **Web Service**
3. Connect your `pharmaguard` repo
4. **Important Settings:**
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run start`
5. **Environment Variables (Scroll down):**
   - `DATABASE_URL`: *(Paste your Neon DB connection string)*
   - `JWT_SECRET`: `supersecret123`
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: `https://pharmaguard.vercel.app` (Add this *after* you know your frontend URL, or use `*` initially)
6. Click **Deploy Web Service**

---

## ⚡ Phase 4: Deploy Frontend (Vercel)
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `pharmaguard` repo
3. **Environment Variables:**
   - `VITE_API_URL`: *(Paste your Render Backend URL, e.g., https://pharmaguard-api.onrender.com)*
4. Click **Deploy**

---

## 🧪 Phase 5: Production Testing Checklist
Once your Vercel URL is live (e.g., `https://pharmaguard.vercel.app`), open it and test:

| Feature | Action | Expected Result |
|---------|--------|-----------------|
| **Login** | Log in with `admin@pharmaguard.io` / `admin123` | Redirects to Dashboard, no errors |
| **Data Upload** | Go to Instrument Data -> Upload a dummy `.txt` file | File uploads, SHA-256 hash appears |
| **Audit Trail** | Go to Audit Trail | You see a "User logged in" event |
| **Compliance** | Go to Reports -> click "Generate" on a template | Report generated and added to history |

**Troubleshooting:**
- **Login fails?** Check Render > Logs. If "CORS error" in browser console, make sure your Render Backend is running and `CORS_ORIGIN` is set correctly.
- **Upload fails?** Check if you added the `DATABASE_URL` correctly in Render.

---

## 🌐 Phase 6: Custom Domain (Optional)
To look professional (Investor Ready):

1. **Buy a Domain:** Namecheap, GoDaddy, or via Vercel.
   - Suggestion: `pharmaguard.io` or `pharmaguard.tech`
2. **Connect to Vercel:**
   - Go to Vercel Project -> Settings -> Domains.
   - Add your domain (e.g., `www.pharmaguard.io`).
   - Follow the DNS instructions (add A record or CNAME).
3. **Update Backend:**
   - In Render, update `CORS_ORIGIN` to `https://www.pharmaguard.io`.
