# Deployment Troubleshooting Guide for Hostinger

## Common Issues After Deployment

### 1. **Environment Variables Not Set**

**Problem:** Features that require backend API calls are not working.

**Solution:**
1. In Hostinger cPanel, go to **File Manager**
2. Navigate to your project root directory
3. Create or edit `.env.local` file
4. Add the following:

```env
BACKEND_URL=https://your-backend-domain.com
# OR if backend is on same server but different port:
BACKEND_URL=http://localhost:3001
```

**Important:** Replace `your-backend-domain.com` with your actual backend server URL.

### 2. **Next.js API Routes Not Working**

**Problem:** API routes return 404 or 500 errors.

**Solution:**
- Hostinger shared hosting may not support Next.js API routes properly
- You may need to:
  1. Use **VPS hosting** instead of shared hosting
  2. Or deploy backend separately and update `BACKEND_URL`
  3. Or use a Node.js hosting service like Vercel, Railway, or Render

### 3. **Static Assets (Images) Not Loading**

**Problem:** Logo.png and other images not showing.

**Solution:**
1. Ensure images are in the `public` folder
2. Check file paths - use `/Logo.png` not `./Logo.png`
3. Clear browser cache
4. Check file permissions (should be 644)

### 4. **Client-Side Features Not Visible**

**Problem:** Charts, modals, or interactive features not showing.

**Possible Causes:**
- JavaScript not loading
- Build errors
- Missing dependencies

**Solution:**
1. Check browser console for errors (F12)
2. Rebuild the project:
   ```bash
   npm run build
   ```
3. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

### 5. **Build Configuration Issues**

**Problem:** Build fails or features missing after build.

**Solution:**
Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // For better deployment compatibility
  images: {
    unoptimized: true, // If image optimization fails
  },
  // If using API routes, ensure they're included
  experimental: {
    serverActions: true,
  }
}

module.exports = nextConfig
```

## Step-by-Step Deployment Checklist

### Before Deployment:
- [ ] Set `BACKEND_URL` environment variable
- [ ] Test build locally: `npm run build`
- [ ] Test production build: `npm start`
- [ ] Check all API routes work
- [ ] Verify all images load correctly
- [ ] Test login/logout functionality
- [ ] Check dashboard features

### After Deployment:
- [ ] Check browser console for errors
- [ ] Verify environment variables are set
- [ ] Test API endpoints
- [ ] Check static assets loading
- [ ] Verify database connection (if applicable)
- [ ] Test authentication flows

## Quick Fixes

### Fix 1: Update next.config.js for Hostinger
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Disable server-side features that might not work on shared hosting
  experimental: {
    serverActions: false,
  },
  // Ensure API routes work
  async rewrites() {
    return []
  }
}

module.exports = nextConfig
```

### Fix 2: Add Error Boundary
Create `app/error.tsx`:
```tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### Fix 3: Check API Route Errors
Add better error handling in API routes to see what's failing.

## Hostinger-Specific Issues

### Issue: Node.js Version
- Hostinger may have an older Node.js version
- Check Node.js version: `node -v`
- Should be Node.js 18+ for Next.js 13+

### Issue: Build Process
- Hostinger might not run `npm run build` automatically
- You may need to build locally and upload the `.next` folder
- Or use Hostinger's Node.js app feature

### Issue: Port Configuration
- Shared hosting may not allow custom ports
- Use port 80 (HTTP) or 443 (HTTPS)
- Configure in Hostinger's Node.js app settings

## Recommended Deployment Options

### Option 1: Vercel (Recommended for Next.js)
- Free tier available
- Automatic deployments
- Built-in environment variables
- Better Next.js support

### Option 2: Railway/Render
- Good for full-stack apps
- Easy environment variable setup
- Supports both frontend and backend

### Option 3: VPS Hosting
- More control
- Can run both frontend and backend
- Requires server management knowledge

## Debugging Steps

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for red errors
   - Check Network tab for failed requests

2. **Check Server Logs:**
   - In Hostinger, check error logs
   - Look for Node.js errors
   - Check build logs

3. **Test API Endpoints:**
   - Try accessing API routes directly
   - Check if backend is accessible
   - Verify CORS settings

4. **Verify Environment Variables:**
   - Check if `.env.local` exists
   - Verify variables are loaded
   - Test with console.log in API routes

## Contact Information

If issues persist:
1. Check Hostinger documentation for Node.js apps
2. Contact Hostinger support
3. Consider migrating to Vercel for better Next.js support
