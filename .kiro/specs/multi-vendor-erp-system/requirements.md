# Requirements Document

## Introduction

This document specifies the requirements for a comprehensive Multi-Vendor ERP + E-Commerce + POS + Inventory + Warehouse Management System. The system is designed to support multiple business roles (Super Admin, Admin, Distributor, Wholesaler, Dealer, Retailer, Parlour, Customer, Supplier, Warehouse Manager, Salesman) with role-based pricing, multi-warehouse inventory management, POS operations, and complete order lifecycle management.

## Glossary

- **System**: The Multi-Vendor ERP+E-Commerce+POS+Inventory+Warehouse Management System
- **User**: Any authenticated actor in the system (human or system process)
- **Product**: An item sold in the e-commerce platform, which can be simple or variable
- **Variable Product**: A product with multiple variants (e.g., size, color)
- **Simple Product**: A product without variants
- **Role**: A set of permissions assigned to a user (Super Admin, Admin, Distributor, Wholesaler, Dealer, Retailer, Parlour, Customer, Supplier, Warehouse Manager, Salesman)
- **Permission**: A granular capability granted to a role
- **Warehouse**: A physical location where inventory is stored
- **POS**: Point of Sale terminal for walk-in customers
- **RBAC**: Role-Based Access Control
- **JWT**: JSON Web Token for authentication
- **SKU**: Stock Keeping Unit - unique identifier for products
- **MRP**: Maximum Retail Price
- **GST**: Goods and Services Tax

## Requirements

### Requirement 1: User Roles and Permissions Management

**User Story:** As a Super Admin, I want to define granular roles and permissions, so that I can control access to system functionality based on business needs.

#### Acceptance Criteria

1. WHEN a Super Admin creates a role THEN the System SHALL assign a unique role identifier and store role metadata
2. WHEN a Super Admin defines permissions THEN the System SHALL create granular permission records covering all system modules
3. WHEN role-permission assignments are made THEN the System SHALL store the mapping in the role_permissions table
4. WHEN a user is assigned a role THEN the System SHALL store the mapping in the user_roles table
5. WHEN a user attempts an action THEN the System SHALL verify the user's role has the required permission
6. THE System SHALL support these roles: Super Admin, Admin, Distributor, Wholesaler, Dealer, Retailer, Parlour, Customer, Supplier, Warehouse Manager, Salesman
7. THE System SHALL support granular permissions per module (create, read, update, delete, list, export)

### Requirement 2: Authentication Module

**User Story:** As a user, I want to securely authenticate to the system, so that I can access my account and perform authorized actions.

#### Acceptance Criteria

1. WHEN a user provides valid credentials THEN the System SHALL issue a JWT access token and refresh token
2. WHEN an access token expires THEN the System SHALL allow token refresh using the refresh token
3. WHEN a user requests password reset THEN the System SHALL generate a reset token and send it to the user's email
4. WHEN a user provides valid OTP THEN the System SHALL allow login without password
5. WHEN a user requests logout THEN the System SHALL invalidate the current access token
6. WHEN invalid credentials are provided THEN the System SHALL return an authentication error
7. WHEN a user registers THEN the System SHALL create a user account with default Customer role and send verification email

### Requirement 3: User Management

**User Story:** As an Admin, I want to manage user accounts, so that I can onboard, update, and maintain user records.

#### Acceptance Criteria

1. WHEN an Admin creates a user THEN the System SHALL store user details including Name, Mobile, Email, GST Number, Business Name, State Code, Address, Role, and Status
2. WHEN an Admin updates a user THEN the System SHALL modify all editable fields while preserving audit trail
3. WHEN an Admin searches users THEN the System SHALL support filtering by name, email, mobile, role, and status
4. WHEN an Admin deactivates a user THEN the System SHALL prevent user login while preserving data
5. THE User record SHALL include: id, name, mobile, email, gst_number, business_name, state_code, address, role, status, created_at, updated_at

### Requirement 4: Role Upgrade Request

**User Story:** As a Customer, I want to request a role upgrade, so that I can access wholesale pricing and benefits.

#### Acceptance Criteria

1. WHEN a Customer requests role upgrade THEN the System SHALL create a role_upgrade_request record with current and requested role
2. WHEN a role upgrade request is submitted THEN the System SHALL notify relevant Admins
3. WHEN an Admin approves a role upgrade request THEN the System SHALL update the user's role and mark request as approved
4. WHEN an Admin rejects a role upgrade request THEN the System SHALL mark request as rejected and notify the user
5. THE System SHALL support upgrades from General Customer to: Wholesaler, Dealer, Retailer, Parlour

### Requirement 5: Category Management

**User Story:** As an Admin, I want to manage product categories in a hierarchical structure, so that products can be organized logically.

#### Acceptance Criteria

1. WHEN an Admin creates a category THEN the System SHALL assign it a unique identifier and support optional parent reference for nesting
2. WHEN a category is created with a parent THEN the System SHALL establish a parent-child relationship enabling unlimited nesting depth
3. WHEN categories are listed THEN the System SHALL return them in a tree structure with children nested under parents
4. WHEN a category with children is deleted THEN the System SHALL either reject deletion or cascade delete to children based on configuration
5. THE Category SHALL support: id, name, slug, description, parent_id, image, sort_order, status

### Requirement 6: Brand Management

**User Story:** As an Admin, I want to manage product brands with default discounts, so that I can apply consistent pricing across brand products.

#### Acceptance Criteria

1. WHEN an Admin creates a brand THEN the System SHALL store brand details including name, logo, and default discount percentage
2. WHEN a brand is updated THEN the System SHALL modify brand metadata
3. WHEN a brand is deleted THEN the System SHALL handle associated products (set to null or reject)
4. THE Brand SHALL include: id, name, slug, logo, default_discount, description, status

### Requirement 7: Product Management

**User Story:** As an Admin, I want to manage products with comprehensive details, so that I can sell products through the e-commerce platform.

#### Acceptance Criteria

1. WHEN an Admin creates a simple product THEN the System SHALL store all product fields including name, description, type, category, brand, SKU, barcode, MRP, selling price, discount, tax, unit, measurement, images, and status
2. WHEN an Admin creates a variable product THEN the System SHALL support multiple variants with different SKUs, prices, and attributes
3. WHEN product inventory is updated THEN the System SHALL automatically adjust available stock
4. WHEN a product is deactivated THEN the System SHALL hide it from customers while preserving order history
5. THE Product SHALL support: Simple and Variable types with specific attributes for each
6. THE Variable Product SHALL support: multiple variants, each with unique SKU, price, and inventory

### Requirement 8: Role-Based Pricing

**User Story:** As a business owner, I want to set different prices per user role, so that I can offer tiered pricing to different customer segments.

#### Acceptance Criteria

1. WHEN an Admin sets product pricing THEN the System SHALL store separate prices for each role: General, Retailer, Dealer, Wholesaler, Parlour
2. WHEN a user views a product THEN the System SHALL display the price corresponding to the user's role
3. WHEN calculating cart total THEN the System SHALL apply role-appropriate pricing
4. THE Role-Based Price SHALL include: product_id, role, price, mrp, discount_percentage

### Requirement 9: Supplier Management

**User Story:** As a procurement manager, I want to manage supplier information and track transactions, so that I can maintain supplier relationships and track payments.

#### Acceptance Criteria

1. WHEN a supplier is created THEN the System SHALL store company details including GSTIN, email, phone, address, bank details, IFSC, credit days, and opening balance
2. WHEN a purchase is made from a supplier THEN the System SHALL create a transaction record
3. WHEN payments are made to a supplier THEN the System SHALL update the ledger and track outstanding balance
4. THE Supplier Module SHALL support: Company Name, GSTIN, Email, Phone, Address, Bank Details, IFSC, Credit Days, Opening Balance
5. THE Supplier Ledger SHALL track: all transactions, running balance, payment history

### Requirement 10: Warehouse Management

**User Story:** As a Warehouse Manager, I want to manage multiple warehouses and transfers, so that I can optimize inventory distribution.

#### Acceptance Criteria

1. WHEN a warehouse is created THEN the System SHALL store warehouse details including name, code, address, manager, and capacity
2. WHEN inventory is received THEN the System SHALL allocate stock to a specific warehouse
3. WHEN a warehouse transfer is initiated THEN the System SHALL create a transfer request with source and destination
4. WHEN a transfer is completed THEN the System SHALL adjust inventory at both warehouses
5. THE Warehouse SHALL support: Multi-warehouse setup, store branches, stock allocation, transfer workflows

### Requirement 11: Inventory Management

**User Story:** As an inventory manager, I want to track inventory with serial and batch numbers, so that I can maintain accurate stock records.

#### Acceptance Criteria

1. WHEN inventory is received THEN the System SHALL record quantity, batch number, serial numbers, and warehouse location
2. WHEN inventory is moved THEN the System SHALL create an inventory history record
3. WHEN stock is low THEN the System SHALL generate low stock alerts
4. THE Inventory Record SHALL include: product_id, warehouse_id, quantity, batch_number, serial_numbers, reorder_level

### Requirement 12: Barcode System

**User Story:** As an inventory clerk, I want to generate and scan barcodes, so that I can quickly track products through the supply chain.

#### Acceptance Criteria

1. WHEN a product variant is created THEN the System SHALL generate a unique barcode in format SKU-B{warehouse}-001
2. WHEN a barcode is scanned THEN the System SHALL return product details and current status
3. THE Barcode SHALL track: In Stock, Sold, Returned, Damaged statuses
4. THE Barcode SHALL support: SKU-based generation, warehouse encoding, sequential numbering

### Requirement 13: Order Management

**User Story:** As a customer, I want to place orders and track their status, so that I can purchase products and know when they'll arrive.

#### Acceptance Criteria

1. WHEN a customer places an order THEN the System SHALL create an order with status Pending
2. WHEN order status changes THEN the System SHALL update the status through: Pending → Confirmed → Packed → Dispatched → Delivered (or Cancelled/Returned)
3. WHEN an order is cancelled THEN the System SHALL restore inventory and notify the customer
4. THE Order SHALL include: order_number, customer_id, items, total, status, shipping_address, payment_status

### Requirement 14: Cart Module

**User Story:** As a customer, I want to manage my shopping cart, so that I can review and modify items before checkout.

#### Acceptance Criteria

1. WHEN a customer adds an item to cart THEN the System SHALL store the item with quantity
2. WHEN cart quantity is updated THEN the System SHALL recalculate totals with role-based pricing
3. WHEN an item is removed THEN the System SHALL delete it from cart
4. WHEN items are added to wishlist THEN the System SHALL store them separately for later
5. THE Cart SHALL support: Add, Update Quantity, Remove, Wishlist, Save For Later

### Requirement 15: Payment Module

**User Story:** As a customer, I want to pay using multiple methods, so that I can complete purchases conveniently.

#### Acceptance Criteria

1. WHEN a customer selects payment method THEN the System SHALL process the payment through: Cash, UPI, Razorpay, Stripe, COD
2. WHEN payment succeeds THEN the System SHALL update order payment_status to Paid
3. WHEN payment fails THEN the System SHALL update order payment_status to Failed and notify customer
4. THE Payment Module SHALL support: Cash, UPI, Razorpay, Stripe, Cash on Delivery

### Requirement 16: Dispatch Module

**User Story:** As a warehouse operator, I want to process orders for dispatch, so that orders reach customers on time.

#### Acceptance Criteria

1. WHEN an order is picked THEN the System SHALL verify items against order
2. WHEN items are scanned for dispatch THEN the System SHALL verify barcode matches order item
3. WHEN dispatch is completed THEN the System SHALL reduce inventory and update order status
4. THE Dispatch Workflow SHALL include: Order → Warehouse Pick → Barcode Scan → Dispatch → Inventory Reduced

### Requirement 17: Return Management

**User Story:** As a customer, I want to return products, so that I can get refunds for defective or unwanted items.

#### Acceptance Criteria

1. WHEN a customer requests return THEN the System SHALL create a return request
2. WHEN returned item is scanned THEN the System SHALL verify against original order
3. WHEN return condition is checked THEN the System SHALL classify as: Good (Restock) or Damaged (Damage Inventory)
4. THE Return Workflow SHALL include: Customer Return → Barcode Scan → Condition Check → Restock/Damage Inventory

### Requirement 18: POS Module

**User Story:** As a salesman, I want to process walk-in customer sales at a POS terminal, so that I can complete quick transactions.

#### Acceptance Criteria

1. WHEN a walk-in customer arrives THEN the System SHALL create a temporary customer session
2. WHEN products are scanned THEN the System SHALL add them to the POS cart
3. WHEN payment is completed THEN the System SHALL generate an invoice and reduce inventory
4. THE POS SHALL support: Walk-in Customer, Barcode Scan, Invoice Generation, Receipt Print, Inventory Deduction

### Requirement 19: Slider Management

**User Story:** As an Admin, I want to manage promotional sliders on the storefront, so that I can highlight campaigns and offers.

#### Acceptance Criteria

1. WHEN an Admin creates a slider THEN the System SHALL store title, subtitle, image, button text, and URL
2. WHEN sliders are retrieved THEN the System SHALL return them in sort order for display
3. THE Slider SHALL include: title, subtitle, image, button_text, url, sort_order, status

### Requirement 20: Ticker Message Module

**User Story:** As an Admin, I want to display scrolling messages on the storefront, so that I can communicate announcements to customers.

#### Acceptance Criteria

1. WHEN an Admin creates a ticker message THEN the System SHALL store message, type, link, and status
2. WHEN ticker messages are retrieved THEN the System SHALL return active messages for display
3. THE Ticker Message SHALL include: message, type (info/warning/success), link, status

### Requirement 21: Reports and Analytics

**User Story:** As an Admin, I want to view dashboard metrics and generate reports, so that I can make informed business decisions.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the System SHALL display: Total Revenue, Total Sales, Total Orders, Total Customers, Total Products, Low Stock Alerts, Pending Returns, Pending Role Requests
2. WHEN a report is generated THEN the System SHALL support: Sales Report, Inventory Report, Supplier Report, Warehouse Report, Customer Report, Profit/Loss Report
3. THE Dashboard SHALL provide real-time metrics cards and drill-down capabilities

### Requirement 22: System Configuration

**User Story:** As a Super Admin, I want to configure system-wide settings, so that the system operates according to business requirements.

#### Acceptance Criteria

1. THE System SHALL support configuration for: Company Name, Logo, Currency, Tax Rates, Timezone, Date Format
2. THE System SHALL support email configuration for transactional emails
3. THE System SHALL support payment gateway configuration
4. THE System SHALL support storage configuration (AWS S3 or Cloudinary)

### Requirement 23: Audit Logging

**User Story:** As an Admin, I want to track all system actions, so that I can investigate issues and maintain compliance.

#### Acceptance Criteria

1. WHEN a significant action occurs THEN the System SHALL create an audit log entry with user, action, entity, timestamp
2. WHEN audit logs are queried THEN the System SHALL support filtering by user, action type, date range
3. THE Audit Log SHALL include: id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, timestamp