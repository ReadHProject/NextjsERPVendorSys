# Multi-Vendor ERP + E-Commerce + POS + Inventory + Warehouse

A modern multi-app architecture with decoupled frontend and backend, designed for web and future React Native apps.

## Architecture

```
multi-vendor-erp/
├── backend/           # Express.js REST API (port 5000)
├── admin/             # Next.js admin dashboard (port 3001)
├── storefront/        # Next.js customer storefront (port 3000)
├── docker/            # Nginx reverse proxy config
├── docker-compose.yml # All services + PostgreSQL + Redis + Nginx
├── .github/           # CI/CD workflows
├── .kiro/             # Project specs and design docs
├── public/uploads/    # Shared upload directory
└── package.json       # Root scripts (concurrently)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express.js + Prisma ORM |
| Frontend | Next.js 15 (App Router) + Tailwind CSS |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Validation | Zod |
| Auth | JWT (access + refresh tokens) |
| Deployment | Docker + Nginx reverse proxy |

## Quick Start

### 1. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install package dependencies
cd backend && npm install && cd ..
cd admin && npm install && cd ..
cd storefront && npm install && cd ..
```

### 3. Setup database

```bash
cd backend
cp .env.example .env
npx prisma db push
npx prisma db seed
cd ..
```

### 4. Run all apps

```bash
npm run dev
```

This starts:
- **Backend** at http://localhost:5000
- **Admin** at http://localhost:3001
- **Storefront** at http://localhost:3000

### 5. Docker deployment (production)

```bash
docker compose up -d
```

Access via http://localhost (Nginx reverse proxy)

## Demo Logins

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@demo.local | Admin@123 |
| Warehouse Manager | wh@demo.local | Admin@123 |
| Salesman | salesman@demo.local | Admin@123 |
| Wholesaler | wholesaler@demo.local | Admin@123 |
| Dealer | dealer@demo.local | Admin@123 |
| Retailer | retailer@demo.local | Admin@123 |
| Customer | customer@demo.local | Customer@123 |
| Supplier | supplier@demo.local | Admin@123 |

## Routes

### Storefront (port 3000)
- `/store` - Home page with sliders, tickers, featured products
- `/store/products` - Product list with category/brand filters
- `/store/products/:id` - Product detail with pricing
- `/store/cart` - Shopping cart
- `/store/checkout` - Checkout with shipping + payment
- `/account` - Profile, orders, wishlist, returns
- `/login`, `/register` - Authentication

### Admin (port 3001)
- `/admin` - Dashboard with KPIs
- `/admin/products` - Product management
- `/admin/orders` - Order management
- `/admin/users` - User management
- `/admin/inventory` - Inventory tracking
- `/admin/warehouses` - Warehouse management
- `/admin/categories`, `/admin/brands` - Catalog management
- `/admin/suppliers` - Supplier management
- `/admin/vendors` - Vendor marketplace
- `/admin/purchase-orders` - Purchase order management
- `/admin/returns` - Return management
- `/admin/dispatches` - Dispatch tracking
- `/admin/payments` - Payment history
- `/admin/commissions` - Commission management
- `/admin/salespersons` - Sales team management
- `/admin/tickets` - Support tickets
- `/admin/reports` - Analytics and reports
- `/admin/settings` - System configuration
- `/admin/audit-logs` - Audit log viewer
- `/admin/barcodes` - Barcode management
- `/admin/sliders`, `/admin/tickers` - Marketing content
- `/admin/roles`, `/admin/permissions` - RBAC management
- `/admin/notifications` - Notification management
- `/admin/activity` - Activity tracking

### Backend API (port 5000)
All endpoints under `/api/v1/`:
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `GET /auth/me` - Current user
- `GET /products` - List products
- `POST /products` - Create product
- `GET /orders` - List orders
- `POST /orders` - Create order
- ... and 46 more route modules

## Package Structure

### `backend/`
Express.js REST API:
- `src/modules/` - 46 route modules (auth, products, orders, inventory, etc.)
- `src/middleware/` - Auth, RBAC, rate limiter, error handler
- `src/config/` - Environment, database, Redis
- `src/services/` - Email, activity logging
- `prisma/` - Database schema and seed data

### `admin/`
Next.js admin dashboard:
- `app/(dashboard)/admin/` - 37+ admin pages
- `components/` - UI components + admin-specific components
- `lib/` - API client, utilities
- `store/` - Redux state management
- `hooks/` - Custom React hooks

### `storefront/`
Next.js customer storefront:
- `app/store/` - Store pages (home, products, cart, checkout)
- `app/account/` - Customer account pages
- `components/` - Store-specific components
- `lib/` - API client, utilities

## Future React Native Integration

The backend APIs are designed to serve both web and mobile apps:
- Same REST endpoints at `/api/v1/*`
- JWT auth works identically (store tokens in SecureStore)
- Consistent `{ data, error }` response format
- Zod validation schemas can be shared with React Native

## Development

```bash
# Run all apps
npm run dev

# Run specific app
npm run dev:backend
npm run dev:admin
npm run dev:storefront

# Build
npm run build
npm run build:admin
npm run build:storefront

# Database commands
npm run db:push
npm run db:migrate
npm run db:seed
npm run db:generate

# Lint
npm run lint
```
