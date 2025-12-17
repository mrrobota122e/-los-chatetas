# Deployment Guide

## Prerequisites
- Node.js 18+
- npm or yarn
- Git

## Build Production

```bash
cd client
npm install
npm run build
```

The `dist` folder contains the production build.

## Deploy to Vercel

### Option 1: CLI
```bash
npm i -g vercel
vercel --prod
```

### Option 2: GitHub Integration
1. Push to GitHub
2. Import project on vercel.com
3. Auto-deploys on pushnpm

### Environment Variables
Create `.env.production`:
```
VITE_API_URL=https://your-api.com
VITE_SOCKET_URL=https://your-socket.com
```

## Deploy to Netlify

### Option 1: CLI
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Option 2: Drag & Drop
1. Build locally: `npm run build`
2. Drag `dist` folder to netlify.com/drop

### Netlify Config
Create `netlify.toml`:
```toml
[build]
  publish = "client/dist"
  command = "cd client && npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Deploy Backend (Railway)

1. Create `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd server && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "healthcheckPath": "/health"
  }
}
```

2. Connect GitHub repo
3. Deploy automatically

## Environment Setup

### Development
```bash
# Client
cd client
npm run dev

# Server (separate terminal)
cd server
npm run dev
```

### Production
```bash
# Build both
npm run build

# Start
npm start
```

## Performance Optimization

### Lighthouse Targets
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

### Optimizations Applied
- Code splitting (React, Motion, Three.js)
- Terser minification
- Tree shaking
- Image optimization (WebP)
- PWA caching
- Lazy loading routes

## Monitoring

### Error Tracking (Sentry)
```bash
npm install @sentry/react
```

Add to `main.tsx`:
```tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_DSN",
  environment: import.meta.env.MODE
});
```

### Analytics (Google Analytics)
Add to `index.html`:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

## SSL/HTTPS

Free SSL included with:
- Vercel
- Netlify
- Railway

## Custom Domain

1. Buy domain (Namecheap, GoDaddy)
2. Add CNAME record: `www` → `yourapp.vercel.app`
3. Add A record: `@` → Vercel IP
4. Wait for DNS propagation (24-48h)

## Scaling

### Database
- MongoDB Atlas (free tier: 512MB)
- Supabase (PostgreSQL)

### CDN
- Cloudflare (free tier)
- BunnyCDN

### Load Balancing
- Use Railway/Render for auto-scaling
- Redis for session management

## Backup Strategy

1. **Code**: GitHub (private repo)
2. **Database**: Daily backups
3. **Assets**: S3/Cloud Storage

## Post-Deployment Checklist

- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] Environment variables set
- [ ] Error tracking operational
- [ ] Analytics tracking
- [ ] Lighthouse score 90+
- [ ] PWA installable
- [ ] Social meta tags correct
- [ ] Sitemap.xml generated
- [ ] Robots.txt configured

---

**Questions?** Contact: support@aaronstudios.com
