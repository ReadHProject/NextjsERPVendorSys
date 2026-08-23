const { PrismaClient, UserStatus, ProductStatus, BarcodeStatus, TickerType } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function keepAlive() {
  await prisma.$queryRaw`SELECT 1`;
}

async function withRetry(fn, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.code === "P1017" && attempt < retries) {
        console.log(`    Connection lost, reconnecting (attempt ${attempt}/${retries})...`);
        await prisma.$disconnect();
        await prisma.$connect();
        continue;
      }
      throw err;
    }
  }
}

const ROLES = [
  "SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "DISTRIBUTOR", "WHOLESALER", "DEALER",
  "RETAILER", "PARLOUR", "CUSTOMER", "ONLINE", "MRP_MEMBER", "SUPPLIER", "WAREHOUSE_MANAGER", "SALESMAN", "GENERAL"
];

const PERMISSIONS = [
  { code: "product.create", module: "product", action: "create" },
  { code: "product.read", module: "product", action: "read" },
  { code: "product.update", module: "product", action: "update" },
  { code: "product.delete", module: "product", action: "delete" },
  { code: "product.list", module: "product", action: "list" },
  { code: "product.export", module: "product", action: "export" },
  { code: "category.create", module: "category", action: "create" },
  { code: "category.read", module: "category", action: "read" },
  { code: "category.update", module: "category", action: "update" },
  { code: "category.delete", module: "category", action: "delete" },
  { code: "brand.create", module: "brand", action: "create" },
  { code: "brand.read", module: "brand", action: "read" },
  { code: "brand.update", module: "brand", action: "update" },
  { code: "brand.delete", module: "brand", action: "delete" },
  { code: "inventory.create", module: "inventory", action: "create" },
  { code: "inventory.read", module: "inventory", action: "read" },
  { code: "inventory.update", module: "inventory", action: "update" },
  { code: "inventory.delete", module: "inventory", action: "delete" },
  { code: "warehouse.create", module: "warehouse", action: "create" },
  { code: "warehouse.read", module: "warehouse", action: "read" },
  { code: "warehouse.update", module: "warehouse", action: "update" },
  { code: "warehouse.delete", module: "warehouse", action: "delete" },
  { code: "barcode.create", module: "barcode", action: "create" },
  { code: "barcode.read", module: "barcode", action: "read" },
  { code: "barcode.update", module: "barcode", action: "update" },
  { code: "order.create", module: "order", action: "create" },
  { code: "order.read", module: "order", action: "read" },
  { code: "order.update", module: "order", action: "update" },
  { code: "order.delete", module: "order", action: "delete" },
  { code: "order.export", module: "order", action: "export" },
  { code: "cart.create", module: "cart", action: "create" },
  { code: "cart.read", module: "cart", action: "read" },
  { code: "cart.update", module: "cart", action: "update" },
  { code: "cart.delete", module: "cart", action: "delete" },
  { code: "wishlist.create", module: "wishlist", action: "create" },
  { code: "wishlist.read", module: "wishlist", action: "read" },
  { code: "wishlist.delete", module: "wishlist", action: "delete" },
  { code: "payment.create", module: "payment", action: "create" },
  { code: "payment.read", module: "payment", action: "read" },
  { code: "payment.update", module: "payment", action: "update" },
  { code: "dispatch.create", module: "dispatch", action: "create" },
  { code: "dispatch.read", module: "dispatch", action: "read" },
  { code: "dispatch.update", module: "dispatch", action: "update" },
  { code: "return.create", module: "return", action: "create" },
  { code: "return.read", module: "return", action: "read" },
  { code: "return.update", module: "return", action: "update" },
  { code: "pos.create", module: "pos", action: "create" },
  { code: "pos.read", module: "pos", action: "read" },
  { code: "pos.update", module: "pos", action: "update" },
  { code: "supplier.create", module: "supplier", action: "create" },
  { code: "supplier.read", module: "supplier", action: "read" },
  { code: "supplier.update", module: "supplier", action: "update" },
  { code: "supplier.delete", module: "supplier", action: "delete" },
  { code: "user.create", module: "user", action: "create" },
  { code: "user.read", module: "user", action: "read" },
  { code: "user.update", module: "user", action: "update" },
  { code: "user.delete", module: "user", action: "delete" },
  { code: "user.list", module: "user", action: "list" },
  { code: "user.export", module: "user", action: "export" },
  { code: "role.create", module: "role", action: "create" },
  { code: "role.read", module: "role", action: "read" },
  { code: "role.update", module: "role", action: "update" },
  { code: "role.delete", module: "role", action: "delete" },
  { code: "permission.read", module: "permission", action: "read" },
  { code: "role.upgrade.read", module: "role.upgrade", action: "read" },
  { code: "role.upgrade.update", module: "role.upgrade", action: "update" },
  { code: "slider.create", module: "slider", action: "create" },
  { code: "slider.read", module: "slider", action: "read" },
  { code: "slider.update", module: "slider", action: "update" },
  { code: "slider.delete", module: "slider", action: "delete" },
  { code: "ticker.create", module: "ticker", action: "create" },
  { code: "ticker.read", module: "ticker", action: "read" },
  { code: "ticker.update", module: "ticker", action: "update" },
  { code: "ticker.delete", module: "ticker", action: "delete" },
  { code: "report.read", module: "report", action: "read" },
  { code: "report.export", module: "report", action: "export" },
  { code: "dashboard.read", module: "dashboard", action: "read" },
  { code: "setting.read", module: "setting", action: "read" },
  { code: "setting.update", module: "setting", action: "update" },
  { code: "audit.log.read", module: "audit.log", action: "read" },
  { code: "audit.log.export", module: "audit.log", action: "export" },
  { code: "ticket.create", module: "ticket", action: "create" },
  { code: "ticket.read", module: "ticket", action: "read" },
  { code: "ticket.update", module: "ticket", action: "update" },
  { code: "ticket.delete", module: "ticket", action: "delete" },
  { code: "purchase.order.create", module: "purchase.order", action: "create" },
  { code: "purchase.order.read", module: "purchase.order", action: "read" },
  { code: "purchase.order.update", module: "purchase.order", action: "update" },
  { code: "purchase.order.approve", module: "purchase.order", action: "approve" },
  { code: "purchase.order.receive", module: "purchase.order", action: "receive" },
  { code: "commission.read", module: "commission", action: "read" },
  { code: "commission.approve", module: "commission", action: "approve" },
  { code: "commission.pay", module: "commission", action: "pay" },
  { code: "vendor.create", module: "vendor", action: "create" },
  { code: "vendor.read", module: "vendor", action: "read" },
  { code: "vendor.update", module: "vendor", action: "update" },
  { code: "vendor.approve", module: "vendor", action: "approve" },
  { code: "salesperson.create", module: "salesperson", action: "create" },
  { code: "salesperson.read", module: "salesperson", action: "read" },
  { code: "salesperson.update", module: "salesperson", action: "update" },
  { code: "customer.type.create", module: "customer.type", action: "create" },
  { code: "customer.type.read", module: "customer.type", action: "read" },
  { code: "customer.type.update", module: "customer.type", action: "update" },
  { code: "product.type.create", module: "product.type", action: "create" },
  { code: "product.type.read", module: "product.type", action: "read" },
  { code: "product.type.update", module: "product.type", action: "update" },
  { code: "login.as.create", module: "login.as", action: "create" },
  { code: "login.as.read", module: "login.as", action: "read" },
  { code: "stock.alert.read", module: "stock.alert", action: "read" },
  { code: "stock.alert.update", module: "stock.alert", action: "update" },
  { code: "upload.create", module: "upload", action: "create" },
  { code: "upload.delete", module: "upload", action: "delete" },
  { code: "product.image.upload", module: "product.image", action: "upload" },
  { code: "product.image.delete", module: "product.image", action: "delete" }
];

const ROLE_PERMS = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  ADMIN: PERMISSIONS.filter((p) => !["config.update"].includes(p.code)).map((p) => p.code),
  SUB_ADMIN: ["product.read", "product.list", "order.create", "order.read", "order.update", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete", "ticket.create", "ticket.read", "ticket.update", "report.read", "dashboard.read", "user.read", "vendor.read", "vendor.approve"],
  DISTRIBUTOR: ["product.read", "product.list", "order.create", "order.read", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete", "report.read"],
  WHOLESALER: ["product.read", "product.list", "order.create", "order.read", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete", "report.read"],
  DEALER: ["product.read", "product.list", "order.create", "order.read", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete"],
  RETAILER: ["product.read", "product.list", "order.create", "order.read", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete"],
  PARLOUR: ["product.read", "product.list", "order.create", "order.read", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete"],
  CUSTOMER: ["product.read", "product.list", "order.create", "order.read", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete", "return.create", "return.read", "ticket.create", "ticket.read"],
  ONLINE: ["product.read", "product.list", "order.create", "order.read", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete", "ticket.create", "ticket.read"],
  MRP_MEMBER: ["product.read", "product.list", "order.create", "order.read", "cart.create", "cart.read", "cart.update", "cart.delete", "wishlist.create", "wishlist.read", "wishlist.delete", "ticket.create", "ticket.read"],
  SUPPLIER: ["supplier.read", "product.read", "order.read", "purchase.read", "vendor.read"],
  WAREHOUSE_MANAGER: ["inventory.create", "inventory.read", "inventory.update", "warehouse.read", "warehouse.update", "barcode.create", "barcode.read", "barcode.update", "dispatch.create", "dispatch.read", "dispatch.update", "return.read", "return.update", "product.read", "order.read", "purchase.read", "stockalert.read", "stockalert.update"],
  SALESMAN: ["dashboard.read", "pos.create", "pos.read", "pos.update", "product.read", "product.list", "inventory.read", "order.create", "order.read", "commission.read", "salesperson.read"]
};

async function main() {
  console.log("Seeding...");

  // Wipe all tables in correct order (respect FKs)
  const tables = [
    "AuditLog", "Payment", "DispatchItem", "Dispatch", "ReturnItem", "ReturnRequest",
    "OrderStatusHistory", "OrderItem", "Order", "CartItem", "Cart", "Wishlist",
    "PosSaleItem", "PosSale", "Barcode", "InventoryMovement", "Inventory",
    "WarehouseTransferItem", "WarehouseTransfer", "RolePrice", "ProductVariant",
    "ProductVisibility", "Product", "Category", "Brand",
    "SupplierTransaction", "Supplier", "Warehouse", "Slider", "TickerMessage",
    "RoleUpgradeRequest", "SalesPerson", "OtpToken", "PasswordReset",
    "UserRole", "User", "SystemConfig", "CommissionConfig", "RolePermission",
    "Role", "Permission", "StockAlert", "SalesCommission", "LoginAsUser",
    "VendorOrderItem", "VendorOrder", "VendorProductVariant", "VendorProduct", "Vendor",
    "PurchaseOrderItem", "PurchaseOrder", "TicketMessage", "TicketReply", "Ticket",
    "CustomerType", "ProductType",
  ];
  for (const table of tables) {
    try { await prisma[table].deleteMany(); } catch (e) { /* table may not exist */ }
  }

  // Permissions (batch)
  await prisma.permission.createMany({ data: PERMISSIONS, skipDuplicates: true });
  const allPerms = await prisma.permission.findMany();
  const permRecords = {};
  for (const p of allPerms) permRecords[p.code] = p.id;
  console.log(`  Created ${allPerms.length} permissions`);

  // Roles (batch)
  await prisma.role.createMany({
    data: ROLES.map((r) => ({ name: r, isSystem: true, description: `${r} role` })),
    skipDuplicates: true,
  });
  const allRoles = await prisma.role.findMany();
  const roleRecords = {};
  for (const r of allRoles) roleRecords[r.name] = r.id;
  console.log(`  Created ${allRoles.length} roles`);

  // Role-Permission mappings (batch)
  const rolePermData = [];
  for (const [role, codes] of Object.entries(ROLE_PERMS)) {
    if (!roleRecords[role]) continue;
    for (const c of codes) {
      if (!permRecords[c]) continue;
      rolePermData.push({ roleId: roleRecords[role], permissionId: permRecords[c] });
    }
  }
  await prisma.rolePermission.createMany({ data: rolePermData, skipDuplicates: true });
  console.log(`  Created ${rolePermData.length} role-permission mappings`);

  // Users
  const pw = await bcrypt.hash("Admin@123", 10);
  const userPw = await bcrypt.hash("Customer@123", 10);
  const users = [
    { name: "Super Admin", email: "admin@demo.local", passwordHash: pw, role: "SUPER_ADMIN" },
    { name: "Sub Admin", email: "subadmin@demo.local", passwordHash: pw, role: "SUB_ADMIN" },
    { name: "Warehouse Manager", email: "wh@demo.local", passwordHash: pw, role: "WAREHOUSE_MANAGER" },
    { name: "Salesman", email: "salesman@demo.local", mobile: "9876543210", passwordHash: pw, role: "SALESMAN" },
    { name: "Wholesaler User", email: "wholesaler@demo.local", passwordHash: pw, role: "WHOLESALER" },
    { name: "Dealer User", email: "dealer@demo.local", passwordHash: pw, role: "DEALER" },
    { name: "Retailer User", email: "retailer@demo.local", passwordHash: pw, role: "RETAILER" },
    { name: "Parlour User", email: "parlour@demo.local", passwordHash: pw, role: "PARLOUR" },
    { name: "Customer User", email: "customer@demo.local", mobile: "9123456789", passwordHash: userPw, role: "CUSTOMER" },
    { name: "Online User", email: "online@demo.local", passwordHash: userPw, role: "ONLINE" },
    { name: "MRP Member", email: "mrp@demo.local", passwordHash: userPw, role: "MRP_MEMBER" },
    { name: "Supplier Co", email: "supplier@demo.local", passwordHash: pw, role: "SUPPLIER" },
  ];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { ...(u.mobile && { mobile: u.mobile }) },
      create: { name: u.name, email: u.email, mobile: u.mobile || null, passwordHash: u.passwordHash, status: UserStatus.ACTIVE },
    });
    if (roleRecords[u.role]) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRecords[u.role] } },
        update: {},
        create: { userId: user.id, roleId: roleRecords[u.role] },
      });
    }
  }
  console.log(`  Created ${users.length} users`);

  // Warehouses
  const wh1 = await prisma.warehouse.upsert({ where: { code: "WH1" }, update: {}, create: { name: "Main Warehouse", code: "WH1", city: "Mumbai", state: "MH", pincode: "400001" } });
  const wh2 = await prisma.warehouse.upsert({ where: { code: "WH2" }, update: {}, create: { name: "North Hub", code: "WH2", city: "Delhi", state: "DL", pincode: "110001" } });
  const wh3 = await prisma.warehouse.upsert({ where: { code: "WH3" }, update: {}, create: { name: "South Hub", code: "WH3", city: "Bangalore", state: "KA", pincode: "560001" } });
  console.log("  Created 3 warehouses");

  // Categories
  const catData = [
    { name: "Electronics", slug: "electronics" },
    { name: "Fashion", slug: "fashion" },
    { name: "Home & Kitchen", slug: "home-kitchen" },
    { name: "Beauty", slug: "beauty" },
    { name: "Sports", slug: "sports" },
    { name: "Grocery", slug: "grocery" },
    { name: "Books", slug: "books" },
    { name: "Toys", slug: "toys" },
  ];
  await prisma.category.createMany({ data: catData, skipDuplicates: true });
  const allCats = await prisma.category.findMany();
  const catIds = {};
  for (const c of allCats) catIds[c.slug] = c.id;

  const subCatData = [
    { name: "Mobiles", slug: "mobiles", parentId: catIds["electronics"] },
    { name: "Laptops", slug: "laptops", parentId: catIds["electronics"] },
    { name: "Men", slug: "men", parentId: catIds["fashion"] },
    { name: "Women", slug: "women", parentId: catIds["fashion"] },
  ];
  await prisma.category.createMany({ data: subCatData, skipDuplicates: true });
  console.log("  Created categories");

  // Brands
  const brandNames = ["Acme", "Globex", "Initech", "Umbrella", "Soylent", "Vandelay", "Stark", "Wayne", "Wonka", "Tyrell"];
  await prisma.brand.createMany({
    data: brandNames.map((b) => ({ name: b, slug: b.toLowerCase(), defaultDiscount: 5 })),
    skipDuplicates: true,
  });
  const allBrands = await prisma.brand.findMany();
  const brandIds = {};
  for (const b of allBrands) brandIds[b.slug] = b.id;
  console.log("  Created 10 brands");

  // Customer Types
  const ctData = [
    { name: "Dealer", description: "Dealer customer type", discountPct: 10, sortOrder: 1 },
    { name: "Wholesaler", description: "Wholesaler customer type", discountPct: 10, sortOrder: 2 },
    { name: "Retailer", description: "Retailer customer type", discountPct: 10, sortOrder: 3 },
    { name: "Parlour", description: "Parlour customer type", discountPct: 10, sortOrder: 4 },
    { name: "Online", description: "Online customer type", discountPct: 10, sortOrder: 5 },
    { name: "MRP Member", description: "MRP member customer type", discountPct: 10, sortOrder: 6 },
  ];
  await prisma.customerType.createMany({ data: ctData, skipDuplicates: true });
  const allCts = await prisma.customerType.findMany();
  const ctRecords = {};
  for (const ct of allCts) ctRecords[ct.name] = ct.id;
  console.log("  Created customer types");

  // Product Types
  const ptData = [
    { name: "Cosmetics", slug: "cosmetics", description: "Cosmetics product type", sortOrder: 0 },
    { name: "Jewellery", slug: "jewellery", description: "Jewellery product type", sortOrder: 1 },
    { name: "Cutlery", slug: "cutlery", description: "Cutlery product type", sortOrder: 2 },
    { name: "Simple Product", slug: "simple", description: "Standard single-variant product", sortOrder: 3 },
    { name: "Variable Product", slug: "variable", description: "Product with multiple variants", sortOrder: 4 },
  ];
  await prisma.productType.createMany({ data: ptData, skipDuplicates: true });
  console.log("  Created product types");

  // Products + variants (one at a time since we need IDs)
  const products = [
    { name: "Smartphone X", desc: "Latest model smartphone", gst: 18, price: 25000, mrp: 30000, brand: "acme", cat: "mobiles" },
    { name: "Laptop Pro 14", desc: "14-inch productivity laptop", gst: 18, price: 85000, mrp: 95000, brand: "acme", cat: "laptops" },
    { name: "Wireless Earbuds", desc: "Noise-cancelling earbuds", gst: 18, price: 2999, mrp: 4999, brand: "globex", cat: "electronics" },
    { name: "Smartwatch S2", desc: "Fitness tracking smartwatch", gst: 18, price: 5999, mrp: 7999, brand: "globex", cat: "electronics" },
    { name: "Men's T-shirt", desc: "100% cotton t-shirt", gst: 12, price: 499, mrp: 799, brand: "initech", cat: "men" },
    { name: "Women's Kurti", desc: "Traditional printed kurti", gst: 12, price: 899, mrp: 1299, brand: "umbrella", cat: "women" },
    { name: "Non-stick Pan", desc: "24cm non-stick frying pan", gst: 18, price: 799, mrp: 1199, brand: "soylent", cat: "home-kitchen" },
    { name: "Face Serum 30ml", desc: "Vitamin C face serum", gst: 18, price: 599, mrp: 899, brand: "soylent", cat: "beauty" },
    { name: "Football Size 5", desc: "Standard match football", gst: 12, price: 999, mrp: 1499, brand: "vandelay", cat: "sports" },
    { name: "Basmati Rice 5kg", desc: "Premium aged basmati rice", gst: 5, price: 650, mrp: 750, brand: "stark", cat: "grocery" },
    { name: "Mystery Novel", desc: "Bestselling mystery novel", gst: 0, price: 399, mrp: 499, brand: "wayne", cat: "books" },
    { name: "Building Blocks Set", desc: "100-piece building blocks", gst: 12, price: 1299, mrp: 1799, brand: "wonka", cat: "toys" },
  ];
  const allSubCats = await prisma.category.findMany({ where: { parentId: { not: null } } });
  const subCatMap = {};
  for (const sc of allSubCats) subCatMap[sc.slug] = sc.id;

  const rolePriceBulk = [];
  const inventoryBulk = [];
  const barcodeBulk = [];
  for (let i = 0; i < products.length; i++) {
    await keepAlive();
    const p = products[i];
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + (i + 1);
    const created = await withRetry(() =>
      prisma.product.upsert({
        where: { slug },
        update: {},
        create: {
          name: p.name, slug, description: p.desc,
          status: ProductStatus.ACTIVE,
          categoryId: subCatMap[p.cat] || catIds[p.cat],
          brandId: brandIds[p.brand],
          gstRate: p.gst,
          image: `https://picsum.photos/seed/${encodeURIComponent(p.name)}/600/600`,
        },
      })
    );
    const sku = "SKU" + String(i + 1).padStart(4, "0");
    const variant = await withRetry(() =>
      prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: { productId: created.id, sku, name: p.name, mrp: p.mrp, price: p.price },
      })
    );
    for (const role of ["RETAILER", "DEALER", "WHOLESALER", "PARLOUR"]) {
      if (!roleRecords[role]) continue;
      const factor = role === "WHOLESALER" ? 0.7 : role === "DEALER" ? 0.8 : role === "RETAILER" ? 0.9 : 0.85;
      rolePriceBulk.push({ productId: created.id, roleId: roleRecords[role], price: Math.round(p.price * factor), mrp: p.mrp, discountPercent: (1 - factor) * 100 });
    }
    inventoryBulk.push({ productId: created.id, variantId: variant.id, warehouseId: wh1.id, quantity: 100, reorderLevel: 10 });
    for (let s = 1; s <= 5; s++) {
      barcodeBulk.push({ code: `${sku}-B${wh1.code}-${String(s).padStart(3, "0")}`, productId: created.id, variantId: variant.id, warehouseId: wh1.id, status: BarcodeStatus.IN_STOCK });
    }
  }
  await prisma.rolePrice.createMany({ data: rolePriceBulk, skipDuplicates: true });
  await prisma.inventory.createMany({ data: inventoryBulk, skipDuplicates: true });
  await prisma.barcode.createMany({ data: barcodeBulk, skipDuplicates: true });
  console.log(`  Created ${products.length} products with variants, pricing, inventory, barcodes`);

  // Suppliers
  await prisma.supplier.createMany({
    data: [
      { companyName: "Acme Distributors", gstin: "27AAAAA0000A1Z5", email: "acme@supplier.test", phone: "9999999991", creditDays: 30, openingBalance: 50000 },
      { companyName: "Globex Trading", gstin: "29BBBBB0000B1Z3", email: "globex@supplier.test", phone: "9999999992", creditDays: 30, openingBalance: 50000 },
      { companyName: "Vandelay Imports", gstin: "24CCCCC0000C1Z1", email: "vandelay@supplier.test", phone: "9999999993", creditDays: 30, openingBalance: 50000 },
    ],
    skipDuplicates: true,
  });

  // Sliders
  await prisma.slider.createMany({
    data: [
      { title: "Welcome offer #1", image: "https://picsum.photos/seed/slide1/1200/400" },
      { title: "Welcome offer #2", image: "https://picsum.photos/seed/slide2/1200/400" },
      { title: "Welcome offer #3", image: "https://picsum.photos/seed/slide3/1200/400" },
    ],
    skipDuplicates: true,
  });

  // Tickers
  await prisma.tickerMessage.createMany({
    data: [
      { message: "Free shipping on orders above ₹999", type: TickerType.INFO },
      { message: "New arrivals this week", type: TickerType.SUCCESS },
    ],
    skipDuplicates: true,
  });

  // System config
  await prisma.systemConfig.createMany({
    data: [
      { key: "company.name", value: "Multi-Vendor Demo" },
      { key: "currency", value: "INR" },
      { key: "tax.gst", value: 18 },
    ],
    skipDuplicates: true,
  });

  // Commission Config
  if (roleRecords["SALESMAN"]) {
    await prisma.commissionConfig.upsert({
      where: { roleId: roleRecords["SALESMAN"] },
      update: {},
      create: { roleId: roleRecords["SALESMAN"], percentage: 5 },
    });
  }

  // Salesperson
  const salesmanUser = await prisma.user.findUnique({ where: { email: "salesman@demo.local" } });
  if (salesmanUser) {
    await prisma.salesPerson.upsert({
      where: { userId: salesmanUser.id },
      update: {},
      create: { userId: salesmanUser.id, targetAmount: 1000000 },
    });
  }

  // Stock Alerts
  const lowStockProduct = await prisma.product.findFirst({ where: { name: "Building Blocks Set" } });
  if (lowStockProduct) {
    await prisma.stockAlert.create({
      data: { productId: lowStockProduct.id, warehouseId: wh1.id, currentQty: 5, reorderLevel: 10 },
    });
  }

  // Product Visibility
  const electronicsCat = await prisma.category.findUnique({ where: { slug: "electronics" } });
  if (electronicsCat && ctRecords["Online"] && ctRecords["MRP Member"]) {
    const eProducts = await prisma.product.findMany({ where: { categoryId: electronicsCat.id } });
    const visData = [];
    for (const p of eProducts) {
      visData.push({ productId: p.id, customerTypeId: ctRecords["Online"], isVisible: true });
      visData.push({ productId: p.id, customerTypeId: ctRecords["MRP Member"], isVisible: true });
    }
    if (visData.length) await prisma.productVisibility.createMany({ data: visData, skipDuplicates: true });
  }

  console.log("Seed complete!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Super admin:  admin@demo.local / Admin@123");
  console.log("  Warehouse:    wh@demo.local / Admin@123");
  console.log("  Salesman:     salesman@demo.local / Admin@123");
  console.log("  Wholesaler:   wholesaler@demo.local / Admin@123");
  console.log("  Dealer:       dealer@demo.local / Admin@123");
  console.log("  Retailer:     retailer@demo.local / Admin@123");
  console.log("  Customer:     customer@demo.local / Customer@123");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
