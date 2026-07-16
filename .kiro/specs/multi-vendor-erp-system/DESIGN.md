# multi-vendor-erp

## Stack
- Next.js 14 App Router · React 18 · TypeScript
- Tailwind 3 · Radix-style primitives under components/ui/*
- Prisma + PostgreSQL · Recharts for analytics
- Auth: jose JWT · bcryptjs
- Roles: CUSTOMER · STAFF · ADMIN

## Palette (dark ERP)
- bg:        #0B0D12
- surface:   #11151C
- surface-2: #161B24
- border:    #1F2630
- text:      #E6EAF2
- muted:     #8A93A6
- accent:    #4F8AFF
- success:   #2BB673
- warn:      #F5A524
- danger:    #E5484D

## Type
- sans: "Inter", system-ui
- mono: "JetBrains Mono", ui-monospace
- scale: 12 / 14 / 16 / 20 / 24 / 32 / 44

## Spacing & radius
- 4 / 8 / 12 / 16 / 24 / 32 / 48
- radius: 6 / 10 / 14

## Existing primitives to reuse (do not reinvent)
- components/ui/button.tsx        → <Button variant="primary|secondary|ghost|danger">
- components/ui/card.tsx          → <Card><CardHeader/><CardContent/></Card>
- components/ui/badge.tsx         → <Badge variant="success|warn|danger|muted">
- components/ui/table.tsx         → <Table><TableHeader/><TableRow/></Table>
- components/ui/data-table.tsx    → use for any list/grid view
- components/ui/tabs.tsx          → <Tabs defaultValue=...>
- components/ui/page-header.tsx   → page title + actions slot
- components/admin/stat-card.tsx  → KPI tiles on dashboards

## Charts (Recharts)
- grid:    #1F2630
- axis:    #8A93A6
- series:  [accent, success, warn, danger]
- tooltips: surface-2 bg, 1px border, 8px radius

## Voice & rules
- ERP-grade, terse, status-led.
- "Created", "Updated", "Archived" — never "Deleted".
- Money: 2dp + currency code (e.g. ₹1,250.00).
- Dates: ISO in tables, relative in cards.
- No emoji in chrome. No gradients on data UI.

## Routes reference
- /admin/*      → STAFF/ADMIN only, sidebar layout
- /account/*    → CUSTOMER self-service
- /api/*        → Route Handlers (return JSON, never HTML)

## Component Library

### Navigation Components
- **Top Header**: Logo, user menu, notifications, role indicator
- **Sidebar Navigation**: Collapsible, role-based menu items, active states
- **Breadcrumbs**: Path navigation with links
- **Tab Navigation**: Horizontal tabs for content sections

### Data Components
- **KPI Cards**: Metric tiles with icons, values, trends
- **Data Tables**: Sortable, filterable, paginated with row actions
- **Status Badges**: Order status, payment status, user status
- **Charts**: Revenue charts, inventory levels, sales analytics

### Form Components
- **Input Fields**: Text, email, phone, GST number, search
- **Select Dropdowns**: Single/multi-select, role selection, categories
- **Date Pickers**: Range selection, single date
- **File Upload**: Product images, documents
- **Toggle Switches**: Status active/inactive

### Action Components
- **Primary Buttons**: Create, Save, Confirm actions
- **Secondary Buttons**: Cancel, Edit, View details
- **Icon Buttons**: Quick actions, table row actions
- **Floating Action Button**: Add new items

## Page Design Specifications

### 1. Authentication Flow

#### Login Page (`/login`)
**Layout**: Centered card on gradient background
**Components**:
- Company logo and tagline
- Email/password form with validation
- "Remember me" checkbox
- Demo account quick-fill buttons (Admin, Customer)
- Forgot password link
- Create account link
- Loading states and error handling

**Mobile**: Single column, touch-friendly inputs

#### Registration Page (`/register`)
**Layout**: Multi-step wizard interface
**Steps**:
1. **Basic Info**: Name, email, password with strength indicator
2. **Business Details**: GST number, business name, state, address
3. **Role Selection**: Dropdown with role descriptions
4. **Verification**: Email confirmation flow

**Components**:
- Progress indicator
- Form validation with inline errors
- Step navigation buttons
- Terms & conditions checkbox

#### Password Reset (`/forgot-password`, `/reset-password`)
- Clean single-form layouts
- Email input with domain suggestions
- Password strength indicator
- Success confirmation with next steps

### 2. Landing & Store Pages

#### Homepage (`/`)
**Layout**: Full-width sections with contained content
**Sections**:
1. **Hero**: Rotating banner with CTAs, company value proposition
2. **Categories**: Grid of category cards with images
3. **Featured Products**: Horizontal scrolling product cards
4. **Ticker**: Scrolling promotional messages
5. **Footer**: Links, company info, social media

**Components**:
- Auto-rotating hero slider
- Category navigation with hover effects
- Product cards with role-based pricing
- Search bar in header

#### Product Catalog (`/store/products`)
**Layout**: Sidebar + main content area
**Sidebar**:
- Category hierarchy (collapsible tree)
- Brand filter with checkboxes
- Price range slider
- Rating filter
- Availability toggle

**Main Area**:
- Search bar with autocomplete
- Sort dropdown (price, name, rating, date)
- View toggle (grid/list)
- Product grid with pagination
- Applied filters chips

**Product Cards**:
- Product image with hover zoom
- Name and brand
- Role-based price display
- Rating stars
- Add to cart/wishlist buttons
- Quick view option

#### Product Detail Page (`/store/products/[id]`)
**Layout**: Two-column (desktop), stacked (mobile)
**Left Column**:
- Main product image
- Thumbnail gallery
- Zoom functionality
- 360° view (if available)

**Right Column**:
- Product name and brand
- Rating and review count
- Role-based pricing with savings
- Variant selection (size, color)
- Quantity selector
- Add to cart/wishlist buttons
- Share buttons
- Shipping information

**Below**: Tabbed content (description, specifications, reviews)

#### Shopping Cart (`/store/cart`)
**Layout**: Two-column (cart items + summary)
**Cart Items**:
- Product image, name, variant
- Quantity controls (+/- buttons)
- Role-based pricing
- Remove/save for later buttons
- Total per item

**Summary Sidebar**:
- Subtotal calculation
- Role-based discounts
- Shipping estimation
- Tax calculation
- Coupon code input
- Total with breakdown
- Checkout button

#### Checkout (`/store/checkout`)
**Layout**: Multi-step process with sidebar summary
**Steps**:
1. **Shipping**: Address selection/creation, delivery options
2. **Payment**: Payment methods (cards, UPI, COD), billing address
3. **Review**: Order confirmation, terms acceptance

**Sidebar**: Order summary, item list, total breakdown

### 3. Customer Account Pages

#### Account Dashboard (`/account`)
**Layout**: Grid of action cards + recent activity
**Top Section**:
- Welcome message with user name and role
- Account status and verification badges
- Role upgrade CTA (if applicable)

**Action Cards**:
- Orders (count + quick access)
- Returns (pending count)
- Wishlist (items count)
- Profile management
- Addresses
- Password change

**Recent Activity**:
- Last few orders with status
- Recent returns
- Price alerts

#### Order History (`/account/orders`)
**Layout**: Filterable table with action buttons
**Filters**:
- Date range picker
- Status dropdown
- Search by order number

**Table Columns**:
- Order number (linked)
- Date
- Status badge
- Total amount
- Payment status
- Actions (view, reorder, return)

**Pagination**: Standard pagination controls

#### Order Details (`/account/orders/[id]`)
**Layout**: Multi-section detailed view
**Header**: Order number, date, status timeline
**Sections**:
1. **Items**: Product list with images, quantities, prices
2. **Shipping**: Address, tracking information, estimated delivery
3. **Payment**: Method, transaction ID, billing address
4. **Actions**: Download invoice, request return, contact support

#### Wishlist (`/account/wishlist`)
**Layout**: Product grid similar to catalog
**Features**:
- Move to cart buttons
- Remove from wishlist
- Share wishlist option
- Recently viewed section
- Empty state with product suggestions

#### Profile Management (`/account/profile`)
**Layout**: Tabbed interface
**Tabs**:
1. **Personal**: Name, email, phone, profile picture
2. **Business**: GST, business name, type
3. **Addresses**: Shipping/billing address management
4. **Security**: Password change, 2FA settings

### 4. Admin Dashboard & Management

#### Admin Dashboard (`/admin`)
**Layout**: Grid-based dashboard with widgets
**Top Row**: KPI cards (revenue, orders, customers, products)
**Second Row**: 
- Revenue chart (2/3 width)
- Quick actions grid (1/3 width)
**Bottom Row**:
- Recent orders table (2/3 width)
- Low stock alerts (1/3 width)

**KPI Cards**: Large number, trend indicator, comparison period
**Quick Actions**: Icon buttons for common tasks (add product, view orders, etc.)

#### User Management (`/admin/users`)
**Layout**: Data table with filters and actions
**Top Bar**: Search input, role filter, status filter, add user button
**Table**: Name, email, role, status, last login, actions
**Actions**: Edit, view details, change status, delete
**Bulk Actions**: Multiple selection for status changes

#### User Create/Edit (`/admin/users/new`, `/admin/users/[id]/edit`)
**Layout**: Form with sections
**Sections**:
1. **Personal Information**: Name, email, phone
2. **Business Details**: GST, business name, address
3. **Role & Permissions**: Role selection, custom permissions
4. **Status**: Active/inactive, verification status

#### Product Management (`/admin/products`)
**Layout**: Data table with rich product information
**Filters**: Category, brand, status, stock level
**Table Columns**: Image thumbnail, name, SKU, category, brand, price, stock, status
**Actions**: Edit, duplicate, delete, view analytics
**Bulk Operations**: Status change, category update, export

#### Product Create/Edit (`/admin/products/new`, `/admin/products/[id]/edit`)
**Layout**: Multi-section form
**Basic Information**: Name, description, category, brand
**Pricing**: Base price, role-based pricing table
**Inventory**: SKU, barcode, stock tracking
**Variants**: Variable product variant management
**Images**: Multiple image upload with drag-and-drop
**SEO**: Meta title, description, slug
**Advanced**: Measurements, shipping details

#### Category Management (`/admin/categories`)
**Layout**: Tree view + form
**Left Side**: Hierarchical category tree with drag-and-drop
**Right Side**: Category form (name, description, image, parent, SEO)
**Actions**: Create, edit, delete, reorder

#### Order Management (`/admin/orders`)
**Layout**: Advanced data table
**Filters**: Date range, status, payment status, customer
**Table**: Order number, customer, total, status, payment, date
**Advanced Search**: By product, customer details, address
**Bulk Actions**: Status updates, export orders

#### Order Details (`/admin/orders/[id]`)
**Layout**: Comprehensive order view
**Header**: Order number, customer info, quick actions
**Tabs**:
1. **Details**: Items, pricing, totals
2. **Customer**: Contact information, order history
3. **Shipping**: Address, tracking, dispatch status
4. **Payment**: Transaction details, refund options
5. **Timeline**: Order status history with timestamps

#### Inventory Management (`/admin/inventory`)
**Layout**: Multi-warehouse inventory view
**Top Controls**: Warehouse selector, stock level filters
**Table**: Product, warehouse, current stock, reserved, available, reorder level
**Actions**: Adjust stock, transfer, view history
**Alerts Section**: Low stock, overstock warnings

### 5. Warehouse Management

#### Warehouse Dashboard (`/admin/warehouses`)
**Layout**: Warehouse-centric dashboard
**Warehouse Selector**: Dropdown to switch between warehouses
**KPIs**: Total stock value, low stock items, pending transfers
**Sections**:
- Current stock levels by category
- Recent stock movements
- Transfer requests
- Dispatch queue

#### Stock Transfer (`/admin/transfers`)
**Layout**: Transfer management interface
**Transfer Creation Form**:
- Source/destination warehouse selectors
- Product search and selection
- Quantity inputs
- Notes and priority
**Active Transfers Table**: Status tracking, approval workflow

#### Dispatch Management (`/admin/dispatches`)
**Layout**: Order fulfillment interface
**Orders Queue**: Orders ready for dispatch
**Barcode Scanner**: Product verification interface
**Packing Interface**: Packing list generation, item checking
**Shipping Labels**: Label printing, courier selection

### 6. POS System

#### POS Terminal (`/pos`)
**Layout**: Touch-optimized interface
**Left Side** (60%): 
- Product search bar
- Category quick buttons
- Product grid with large touch targets
**Right Side** (40%):
- Shopping cart with items
- Customer selection
- Payment methods
- Total and tender amount
**Bottom**: Large checkout button, receipt options

**Barcode Scanner**: Full-screen scanner overlay
**Payment Interface**: Payment method selection, amount entry
**Receipt**: Print/email options with customer details

### 7. Reports & Analytics

#### Reports Dashboard (`/admin/reports`)
**Layout**: Report category tiles + recent reports
**Categories**:
- Sales & Revenue
- Inventory & Stock
- Customer Analytics  
- Supplier Performance
- Financial Reports

#### Sales Reports (`/admin/reports/sales`)
**Layout**: Filters + charts + tables
**Filters**: Date range, product categories, customers, warehouses
**Charts**: Revenue trends, top products, sales by category
**Tables**: Detailed transaction lists
**Export**: PDF, Excel, CSV options

#### Inventory Reports (`/admin/reports/inventory`)
**Layout**: Stock analysis interface
**Views**: Stock levels, movement history, valuation
**Charts**: Stock trends, turnover rates, aging analysis
**Tables**: Product-wise stock details

### 8. System Configuration

#### General Settings (`/admin/settings`)
**Layout**: Tabbed configuration interface
**Tabs**:
1. **Company**: Logo, name, address, contact details
2. **System**: Currency, timezone, date formats, language
3. **Email**: SMTP configuration, template settings
4. **Storage**: File upload settings, CDN configuration
5. **Security**: Session timeout, password policies

#### Payment Settings (`/admin/settings/payments`)
**Layout**: Payment gateway configuration
**Gateways**: Toggle cards for each payment method
**Configuration**: API keys, webhook URLs, test/live modes
**Testing**: Transaction test interface

#### User Roles & Permissions (`/admin/settings/roles`)
**Layout**: Role management interface
**Left Side**: Roles list with create/edit/delete
**Right Side**: Permission matrix with modules and actions
**Bulk Actions**: Copy permissions, reset to defaults

## Role-Specific UI Variations

### Super Admin Interface
- Full access to system configuration
- Advanced analytics and audit trails
- User role management
- System health monitoring

### Admin Interface
- Business-focused dashboard
- Product and inventory management
- Customer service tools
- Operational reports

### Vendor Interfaces (Distributor, Wholesaler, Dealer, Retailer)
- Limited to their product catalog
- Order management for their items
- Customer relationship management
- Sales performance analytics

### Customer Interface
- Product browsing with role-specific pricing
- Streamlined checkout process
- Order tracking and history
- Account self-service

### Warehouse Manager Interface
- Inventory-focused dashboard
- Stock movement tracking
- Transfer and dispatch management
- Warehouse performance metrics

### POS/Salesman Interface
- Touch-optimized point-of-sale
- Quick product search and barcode scanning
- Simple customer management
- Payment processing and receipt generation

## Responsive Design Requirements

### Mobile-First Customer Pages
- Touch-friendly navigation
- Swipe gestures for product galleries
- Simplified checkout flow
- Mobile payment options

### Desktop-Optimized Admin Interfaces
- Multi-column layouts
- Keyboard shortcuts
- Bulk operations
- Advanced filtering and search

### Tablet-Friendly POS
- Large touch targets
- Landscape orientation optimized
- Quick access to common functions
- Offline capability

## Accessibility & Performance
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Progressive web app capabilities
- Optimized for low-bandwidth connections