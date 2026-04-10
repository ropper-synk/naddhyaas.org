# Fix "Route not found" for /api/examination and other API calls

Your **Next.js** app runs on port 3000. When the frontend calls `fetch('/api/examination')`, the request goes to **Next.js** (same origin), not to this Express backend (port 3001). Next.js has no route for `/api/examination`, so it returns **404**.

**Fix: Proxy all `/api/*` requests from Next.js to the backend.**

## Option 1: Rewrites in next.config.js (recommended)

In your **Next.js project root**, open or create `next.config.js` (or `next.config.mjs`) and add a `rewrites` function so `/api/*` is forwarded to the backend:

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

If your backend runs on a different port, change `3001` to that port. Restart the Next.js dev server after editing.

## Option 2: Use full backend URL in the frontend

Instead of `fetch('/api/examination')`, call the backend directly:

```js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
fetch(`${API_URL}/api/examination`)
```

Add to `.env.local` in the Next.js project:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Then use `API_URL + '/api/...'` for all API requests (register, admin, examination, etc.).

---

After applying Option 1 or 2, **ensure the backend is running** (`npm run dev` in `Nad_Dhyas_Backend`). Then try the Examination page again.
