# Quick Fixes for Hostinger Deployment Issues

## Most Common Issues & Quick Fixes

### ❌ Issue 1: Features Not Visible / API Calls Failing

**Symptom:** Login doesn't work, dashboard shows errors, data not loading

**Fix:**
1. Create `.env.local` in project root:
```env
BACKEND_URL=https://your-backend-server.com
```

2. If backend is on same server:
```env
BACKEND_URL=http://localhost:3001
```

3. Rebuild:
```bash
npm run build
```

---

### ❌ Issue 2: Logo/Images Not Showing

**Symptom:** Logo.png and other images appear broken

**Fix:**
1. Verify images are in `public/` folder
2. Check file paths use `/Logo.png` (with leading slash)
3. Clear browser cache (Ctrl+Shift+R)
4. Check file permissions (should be 644)

---

### ❌ Issue 3: Charts/Graphs Not Displaying

**Symptom:** Dashboard charts are blank or not showing

**Fix:**
1. Check if recharts is installed:
```bash
npm install recharts
```

2. Rebuild:
```bash
npm run build
```

3. Check browser console for errors

---

### ❌ Issue 4: Sidebar/Navigation Not Working

**Symptom:** Sidebar doesn't appear or navigation links broken

**Fix:**
1. Check browser console for JavaScript errors
2. Verify all CSS files are loading
3. Clear browser cache
4. Check if `SidebarContext.tsx` exists

---

### ❌ Issue 5: Build Errors

**Symptom:** Build fails or incomplete

**Fix:**
1. Check Node.js version (should be 18+):
```bash
node -v
```

2. Install dependencies:
```bash
npm install
```

3. Build again:
```bash
npm run build
```

4. Check for TypeScript errors:
```bash
npm run lint
```

---

## Environment Variables Checklist

Create `.env.local` with:

```env
# Backend API URL (REQUIRED)
BACKEND_URL=https://your-backend-domain.com

# Or for local backend:
# BACKEND_URL=http://localhost:3001
```

**Important:** 
- Replace `your-backend-domain.com` with actual backend URL
- No quotes around the URL
- No trailing slash

---

## Hostinger-Specific Setup

### If Using Hostinger Node.js App:

1. **Set Environment Variables:**
   - Go to Node.js App in cPanel
   - Add environment variable: `BACKEND_URL`
   - Value: Your backend server URL

2. **Build Command:**
   - Set build command: `npm run build`
   - Set start command: `npm start`

3. **Port Configuration:**
   - Use default port provided by Hostinger
   - Or configure in Node.js app settings

---

## Testing After Deployment

1. **Open Browser Console (F12)**
   - Check for red errors
   - Look for failed network requests

2. **Test API Endpoints:**
   - Try: `https://your-domain.com/api/admin/stats`
   - Should return JSON (not 404)

3. **Test Login:**
   - Try admin login
   - Check if redirects work

4. **Check Static Assets:**
   - Verify images load
   - Check CSS files load

---

## Emergency Fixes

### If Nothing Works:

1. **Rebuild Everything:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

2. **Check Backend:**
   - Verify backend server is running
   - Test backend URL directly in browser
   - Check CORS settings

3. **Check Hostinger Settings:**
   - Verify Node.js version (18+)
   - Check file permissions (644 for files, 755 for folders)
   - Verify domain points to correct directory

---

## Still Having Issues?

1. Run diagnostic script:
```bash
node check-deployment.js
```

2. Check detailed guide:
   - See `DEPLOYMENT_TROUBLESHOOTING.md`

3. Common Solutions:
   - Use Vercel instead (better Next.js support)
   - Upgrade to VPS hosting
   - Deploy backend separately

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test production build locally
npm start

# Check for errors
npm run lint

# Run diagnostic
node check-deployment.js
```
