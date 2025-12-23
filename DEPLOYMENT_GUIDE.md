# 🚀 Deployment Guide - Property Rental Platform

## Overview
This guide will help you deploy your property rental platform **100% FREE** with a custom URL.

---

## 📋 Prerequisites

1. **GitHub Account** (free)
2. **MongoDB Atlas Account** (free) - for database
3. **Render.com Account** (free) - for hosting

---

## Step 1: Setup MongoDB Atlas (Database)

### 1.1 Create Free MongoDB Cluster
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free account
3. Click "Build a Database" → Choose **FREE** tier (M0)
4. Select **AWS** provider and **us-east-1** region (or closest to your state)
5. Name your cluster (e.g., "PropertyRentalDB")
6. Click "Create"

### 1.2 Configure Database Access
1. In Atlas dashboard, go to **Database Access** (left sidebar)
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `propertyuser` (or your choice)
5. Password: Generate a strong password → **SAVE THIS!**
6. Database User Privileges: Select "Atlas admin"
7. Click "Add User"

### 1.3 Configure Network Access
1. Go to **Network Access** (left sidebar)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### 1.4 Get Connection String
1. Go to **Database** → Click "Connect"
2. Choose "Connect your application"
3. Copy the connection string (looks like: `mongodb+srv://propertyuser:<password>@...`)
4. Replace `<password>` with your actual password
5. **SAVE THIS CONNECTION STRING!**

---

## Step 2: Push Code to GitHub

### 2.1 Initialize Git Repository
```bash
cd /Users/cross/Desktop/property-rental-platform
git init
git add .
git commit -m "Initial commit - Property Rental Platform"
```

### 2.2 Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `property-rental-platform`
3. Set to **Public** (required for Render free tier)
4. Don't initialize with README
5. Click "Create repository"

### 2.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/property-rental-platform.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Render.com

### 3.1 Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub (easiest)
3. Authorize Render to access your repositories

### 3.2 Deploy Backend API

1. From Render Dashboard, click "New +" → "Web Service"
2. Connect your `property-rental-platform` repository
3. Configure:
   - **Name**: `property-rental-api` (or your choice)
   - **Region**: Oregon (or closest US region)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Instance Type**: `Free`

4. Click "Advanced" → Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `MONGO_URL` = `your_mongodb_connection_string_from_step_1.4`
   - `JWT_SECRET` = `generate_random_string_32_chars` (see below)
   - `JWT_REFRESH_SECRET` = `generate_another_random_string_32_chars`

5. Click "Create Web Service"
6. Wait 3-5 minutes for deployment
7. **SAVE YOUR API URL!** (e.g., `https://property-rental-api.onrender.com`)

### 3.3 Deploy Frontend

1. From Render Dashboard, click "New +" → "Static Site"
2. Connect your `property-rental-platform` repository
3. Configure:
   - **Name**: `property-rental-client` (or your choice)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/dist`

4. Add Environment Variable:
   - `VITE_API_URL` = `https://property-rental-api.onrender.com/api`
   - (Use YOUR actual API URL from step 3.2)

5. Click "Create Static Site"
6. Wait 3-5 minutes for deployment
7. **Your app is live!** (e.g., `https://property-rental-client.onrender.com`)

---

## Step 4: Configure Custom Domain (Optional)

### Option A: Use Render Subdomain (Free)
- Your app will be at: `https://your-app-name.onrender.com`
- You can customize the name when creating the service

### Option B: Use Your Own Domain (Free with domain purchase)
1. Buy a domain from Namecheap, GoDaddy, etc. (~$10-15/year)
2. In Render dashboard, go to your service → Settings → Custom Domain
3. Add your domain (e.g., `mypropertyapp.com`)
4. Update your domain's DNS settings with Render's provided records
5. Wait for DNS propagation (5-60 minutes)

### Option C: Use Free Subdomain Services
- Get free subdomains from:
  - Freenom (free .tk, .ml domains)
  - InfinityFree (free subdomain with hosting)
  - Cloudflare Pages (free subdomain)

---

## Step 5: Generate Secure JWT Secrets

Run these commands to generate secure random secrets:

```bash
# For JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# For JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use these values in your Render environment variables.

---

## 🎉 You're Done!

### Your Live URLs:
- **Frontend**: `https://your-client-name.onrender.com`
- **Backend API**: `https://your-api-name.onrender.com`

### Important Notes:

⚠️ **Free Tier Limitations:**
- Services "sleep" after 15 minutes of inactivity
- First request after sleep takes 30-50 seconds to wake up
- 750 hours/month of runtime (enough for demo)
- No credit card required

💡 **To Prevent Sleep:**
- Use a service like UptimeRobot (free) to ping your API every 10 minutes
- Or upgrade to paid tier ($7/month) for always-on service

🎨 **Custom Branding:**
- In Render dashboard, you can customize your service name
- Example: `awesome-rentals.onrender.com`

---

## Troubleshooting

### Issue: API not connecting
- Check environment variable `VITE_API_URL` in frontend
- Ensure MongoDB connection string is correct
- Check backend logs in Render dashboard

### Issue: Images not uploading
- Render free tier has limited disk space
- Consider using Cloudinary (free) for image hosting
- Or upgrade to paid tier

### Issue: Service keeps sleeping
- Use UptimeRobot to ping API every 10 minutes
- Or upgrade to paid tier ($7/month)

### Issue: Can't access from other devices
- Ensure you're using HTTPS URLs (not HTTP)
- Check CORS settings in server/index.js

---

## Alternative Deployment Options

### Railway.app
- Similar to Render
- Free tier: $5 credit/month
- URL: `your-app.up.railway.app`

### Vercel (Frontend Only)
- Best for React apps
- Unlimited bandwidth
- URL: `your-app.vercel.app`
- Pair with Render for backend

### Fly.io
- Free tier: 3 VMs
- More technical setup
- Good performance

---

## Need Help?

- Render Docs: https://render.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- This project's issues: https://github.com/YOUR_USERNAME/property-rental-platform/issues

---

## Scaling Later (When you get users)

When you're ready to scale:
1. Upgrade Render to paid tier ($7-25/month per service)
2. Use MongoDB Atlas paid tier for better performance
3. Add CDN for static assets (Cloudinary for images)
4. Add Redis caching layer
5. Consider AWS/Google Cloud for full control

For now, the free tier handles 100s of users just fine! 🚀
