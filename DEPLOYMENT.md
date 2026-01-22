# Deployment Guide

DataFusion World is a static web application that can be deployed to any static hosting provider. No server configuration or database setup required!

## Quick Deploy Options

### Option 1: Vercel (Recommended)

Vercel offers zero-config deployment with automatic builds from Git.

**One-Click Deploy:**
1. Push your code to GitHub/GitLab/Bitbucket
2. Visit [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your repository
4. Vercel auto-detects Vite configuration
5. Click "Deploy"

**CLI Deploy:**
```bash
# Install Vercel CLI
npm i -g vercel

# Build and deploy
make deploy-vercel
# or manually:
cd frontend && pnpm build && vercel --prod
```

**Configuration:**
- Build Command: `cd frontend && pnpm build`
- Output Directory: `frontend/dist`
- Install Command: `cd frontend && pnpm install`

### Option 2: Netlify

Netlify provides similar zero-config deployment.

**One-Click Deploy:**
1. Push your code to GitHub/GitLab/Bitbucket
2. Visit [netlify.com](https://netlify.com) and sign in
3. Click "New site from Git"
4. Select your repository
5. Configure build settings:
   - Build command: `cd frontend && pnpm build`
   - Publish directory: `frontend/dist`
6. Click "Deploy site"

**CLI Deploy:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
make deploy-netlify
# or manually:
cd frontend && pnpm build && netlify deploy --prod --dir=dist
```

**netlify.toml configuration:**
```toml
[build]
  base = "frontend"
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 3: GitHub Pages

Free hosting directly from your GitHub repository.

**Setup:**
1. Enable GitHub Pages in your repository settings
2. Select "GitHub Actions" as the source

**Deploy:**
```bash
# Install gh-pages
npm i -g gh-pages

# Build and deploy
make deploy-ghpages
# or manually:
cd frontend && pnpm build && npx gh-pages -d dist
```

**GitHub Actions Workflow** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          cache-dependency-path: frontend/pnpm-lock.yaml
      - run: cd frontend && pnpm install
      - run: cd frontend && pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Option 4: Cloudflare Pages

Excellent performance with global CDN.

**Deploy:**
1. Visit [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your Git repository
3. Configure build settings:
   - Build command: `cd frontend && pnpm build`
   - Build output directory: `frontend/dist`
   - Root directory: `/`
4. Click "Save and Deploy"

**Configuration:**
- Framework preset: Vite
- Build command: `cd frontend && pnpm build`
- Output directory: `frontend/dist`

### Option 5: Custom Server

If you want to host on your own server:

```bash
# Build the app
cd frontend && pnpm build

# Copy the dist/ folder to your web server
# For example, with nginx:
sudo cp -r dist/* /var/www/html/

# Or with a simple HTTP server:
cd dist && python -m http.server 8080
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Build Configuration

### Production Build

```bash
make build
# or
cd frontend && pnpm build
```

This creates optimized production files in `frontend/dist/`:
- Minified JavaScript bundles
- Optimized CSS
- Compressed assets
- Source maps (optional)

### Preview Production Build Locally

```bash
make preview
# or
cd frontend && pnpm preview
```

This starts a local server serving the production build (default: http://localhost:4173).

### Build Optimization

The Vite build automatically:
- Tree-shakes unused code
- Minifies JavaScript and CSS
- Optimizes images
- Generates content hashes for cache busting
- Code-splits for better performance

### Environment Variables

To configure the build, create `frontend/.env.production`:

```env
# Optional: Analytics, error tracking, etc.
VITE_ANALYTICS_ID=your-analytics-id
VITE_APP_VERSION=1.0.0
```

Access in your code:
```typescript
const analyticsId = import.meta.env.VITE_ANALYTICS_ID;
```

---

## Performance Optimization

### Recommended Settings

All major hosting providers support these optimizations:

1. **Compression**: Enable gzip/brotli compression for all text assets
2. **Caching**: Set long cache headers for static assets (JS, CSS, images)
3. **CDN**: Use a CDN for global distribution (Vercel/Netlify/Cloudflare include this)
4. **HTTP/2**: Enable HTTP/2 for multiplexing (automatic on modern hosts)

### Asset Size

Expected production build size:
- JavaScript bundles: ~500-800 KB (minified + gzipped)
- CSS: ~50-100 KB (minified + gzipped)
- Assets (images, fonts): Depends on your game assets
- Total initial load: <1 MB (fast on most connections)

### Performance Targets

The game should achieve:
- First Contentful Paint (FCP): <1.5s
- Time to Interactive (TTI): <3s
- Lighthouse Performance Score: >90

Test with:
```bash
cd frontend && pnpm build && pnpm preview
# Then run Lighthouse in Chrome DevTools
```

---

## Domain Configuration

### Custom Domain on Vercel

1. Go to your project settings → Domains
2. Add your custom domain
3. Update your DNS:
   - **A Record**: Point to Vercel's IP
   - **CNAME**: Point to `cname.vercel-dns.com`
4. Vercel auto-provisions SSL certificates

### Custom Domain on Netlify

1. Go to Site settings → Domain management
2. Add custom domain
3. Update DNS:
   - **CNAME**: Point to `your-site.netlify.app`
4. Netlify auto-provisions SSL certificates

### Custom Domain on Cloudflare Pages

1. Go to project settings → Custom domains
2. Add your domain
3. Cloudflare automatically configures DNS if your domain is on Cloudflare
4. SSL is automatic

---

## Monitoring & Analytics

Since this is a static site, use client-side analytics:

### Google Analytics 4

```typescript
// frontend/src/analytics.ts
import { loadGA4 } from './utils/ga4';

// In main.ts
if (import.meta.env.PROD) {
  loadGA4('G-XXXXXXXXXX');
}
```

### Vercel Analytics

Built-in for Vercel deployments:
```bash
npm i @vercel/analytics
```

```typescript
// frontend/src/main.ts
import { inject } from '@vercel/analytics';
inject();
```

### Error Tracking

Use Sentry for error monitoring:
```bash
npm i @sentry/browser
```

```typescript
// frontend/src/main.ts
import * as Sentry from '@sentry/browser';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'your-sentry-dsn',
    environment: 'production',
  });
}
```

---

## Troubleshooting

### Build Fails

**Problem**: `pnpm build` fails with TypeScript errors

**Solution**:
```bash
cd frontend
pnpm install
pnpm run lint --fix
pnpm build
```

### 404 on Refresh

**Problem**: Navigating to a route directly returns 404

**Solution**: Configure your host to redirect all requests to `index.html` (see hosting configs above)

### Large Bundle Size

**Problem**: JavaScript bundle is too large

**Solution**:
- Check bundle analyzer: `npm i -D rollup-plugin-visualizer`
- Lazy load heavy Phaser scenes
- Tree-shake unused dependencies

### IndexedDB Issues

**Problem**: Game state doesn't persist

**Solution**:
- Check browser console for IndexedDB errors
- Ensure site is served over HTTPS (required for some browsers)
- Test in incognito mode to rule out extension conflicts

---

## Continuous Deployment

### Automatic Deploys on Git Push

All recommended platforms support automatic deployment:

1. **Vercel/Netlify/Cloudflare**: Automatically deploy on push to main branch
2. **GitHub Pages**: Use GitHub Actions workflow (see above)

### Preview Deployments

Get preview URLs for pull requests:

- **Vercel**: Automatic preview for all PRs
- **Netlify**: Deploy Previews enabled by default
- **Cloudflare Pages**: Preview deployments for all branches

### Environment-Specific Builds

Use different builds for staging/production:

```bash
# Staging
cd frontend && pnpm build --mode staging

# Production
cd frontend && pnpm build --mode production
```

With corresponding `.env.staging` and `.env.production` files.

---

## Rollback & Versioning

### Vercel Rollback

```bash
vercel rollback
# or through the dashboard: Deployments → Previous deployment → Promote to Production
```

### Netlify Rollback

```bash
netlify rollback
# or through the dashboard: Deploys → Click previous deploy → Publish deploy
```

### GitHub Pages Rollback

Revert the commit and push:
```bash
git revert HEAD
git push origin main
```

---

## Cost Comparison

| Platform | Free Tier | Bandwidth | Build Minutes | Custom Domain | SSL |
|----------|-----------|-----------|---------------|---------------|-----|
| **Vercel** | Yes | 100 GB/month | 6,000 min/month | ✅ | ✅ Auto |
| **Netlify** | Yes | 100 GB/month | 300 min/month | ✅ | ✅ Auto |
| **GitHub Pages** | Yes | 100 GB/month | Unlimited | ✅ | ✅ Auto |
| **Cloudflare Pages** | Yes | Unlimited | 500 builds/month | ✅ | ✅ Auto |

All platforms are **free for hobby projects** and scale automatically.

---

## Recommended: Vercel

For this project, we recommend **Vercel** because:
- Zero configuration for Vite projects
- Automatic preview deployments
- Excellent performance (global edge network)
- Built-in analytics
- Great developer experience

Deploy now:
```bash
make deploy-vercel
```

Happy deploying! 🚀
