# Deploying Monorepo to Hostinger Cloud Node.js Hosting

This repository is structured as a unified NPM Workspaces monorepo. On Hostinger Cloud / Shared Web Application Hosting, it runs as a single Node.js Web Application process managed by `server.js`.

---

## Hostinger Requirements & Specifications

- **Node.js Version**: 20.x or 18.x
- **Application Startup File**: `server.js`
- **Recommended Memory**: Plan with **$\ge$ 1GB RAM** (~400MB runtime footprint for 2 Next.js servers + 1 Express backend).
- **Database**: External PostgreSQL instance (**Supabase**, **Neon**, or **Aiven**). Hostinger Shared Hosting MySQL cannot be used for Prisma PostgreSQL schema.

---

## 1. Environment Variables Setup (Hostinger hPanel)

Configure the following Environment Variables in Hostinger hPanel Node.js Application panel:

| Variable Name | Value / Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Must be `production` | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@ep-xyz.neon.tech/erp?sslmode=require` |
| `JWT_ACCESS_SECRET` | Secret key for JWT access tokens | `your-secure-access-jwt-secret` |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | `your-secure-refresh-jwt-secret` |
| `NEXT_PUBLIC_API_URL` | Full URL to the API endpoint | `https://yourdomain.com/api/v1` |
| `CORS_ORIGIN` | Allowed domain origin | `https://yourdomain.com` |
| `STORAGE_DRIVER` | Recommended: `s3` for persistent storage | `s3` (or `local`) |
| `AWS_ACCESS_KEY_ID` | (If `STORAGE_DRIVER=s3`) AWS Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | (If `STORAGE_DRIVER=s3`) AWS Secret | `secret...` |
| `AWS_REGION` | (If `STORAGE_DRIVER=s3`) S3 Region | `us-east-1` |
| `AWS_S3_BUCKET` | (If `STORAGE_DRIVER=s3`) S3 Bucket Name | `my-erp-uploads` |

---

## 2. Hostinger Build & Database Migration Commands

In Hostinger hPanel Node.js app setup:

1. **Build Command**:
   ```bash
   npm install && NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1 npm run build && npm run db:push
   ```
2. **Startup Command**:
   ```bash
   node server.js
   ```

---

## 3. Local Development vs Production Execution

- **Local Development**:
  ```bash
  npm run dev
  ```
  *(Spins up multi-process dev servers concurrently: backend: 5000, admin: 3001, storefront: 3000)*

- **Production Testing**:
  ```bash
  npm run build
  npm start
  ```
  *(Launches master gateway server on `http://localhost:3000`)*

---

## 4. Single-Domain Route Layout

Once deployed, your domain routes will automatically map as follows:

- `https://yourdomain.com/` $\rightarrow$ Storefront Homepage
- `https://yourdomain.com/store/*` $\rightarrow$ Storefront E-Commerce Pages
- `https://yourdomain.com/account/*` $\rightarrow$ Customer Account Portal
- `https://yourdomain.com/login` $\rightarrow$ Customer Login
- `https://yourdomain.com/admin/login` $\rightarrow$ Admin & Staff Login Portal
- `https://yourdomain.com/admin/*` $\rightarrow$ Admin ERP Dashboard
- `https://yourdomain.com/api/v1/*` $\rightarrow$ Backend Express API
- `https://yourdomain.com/uploads/*` $\rightarrow$ Uploaded Assets / Media

---

## 5. Troubleshooting: `Error: Cannot find module '.../server.js'`

If LiteSpeed (`lsnode.js`) produces:
`Error: Cannot find module '/home/u558169033/domains/velvetvenues.co.in/.builds/current/nodejs/server.js'`

Follow these steps to resolve:

1. **Verify `server.js` was pushed & deployed**:
   - Ensure `server.js` exists in the repository root and is committed to Git.
   - If deploying via File Manager / ZIP upload, verify `server.js` is present directly inside the app root folder.

2. **Check Hostinger hPanel Settings**:
   - Go to **hPanel** $\rightarrow$ **Websites** $\rightarrow$ **Node.js**.
   - **Application Root**: Check that this points to your Node application root (e.g. `public_html` or `.builds/current/nodejs`).
   - **Application Startup File**: Must be set to `server.js`.
   - **Node.js Version**: Select `20.x` or `18.x`.

3. **Re-trigger Build / Redeploy**:
   - In Hostinger Git / Deployment section, click **Deploy / Build**.
   - If the build failed previously during `npm install` or `npm run build`, Hostinger might not have generated `.builds/current/nodejs` properly.
   - Ensure the build command is:
     `npm install && NEXT_PUBLIC_API_URL=https://velvetvenues.co.in/api/v1 npm run build`

