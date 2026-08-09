const slugify = require("slugify");

function makeSlug(text) {
  return slugify(text, { lower: true, strict: true, trim: true });
}

function generateOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${date}-${rand}`;
}

function generatePONumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PO-${date}-${rand}`;
}

function generateInvoiceNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${date}-${rand}`;
}

function generateBarcode() {
  const prefix = "629";
  const body = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  const full = prefix + body;
  const checksum = calculateEAN13Checksum(full);
  return full + checksum;
}

function calculateEAN13Checksum(code) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return ((10 - (sum % 10)) % 10).toString();
}

function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function paginate(page, pageSize) {
  const p = Math.max(1, parseInt(page) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  return { page: p, pageSize: ps, skip: (p - 1) * ps };
}

module.exports = {
  makeSlug,
  generateOrderNumber,
  generatePONumber,
  generateInvoiceNumber,
  generateBarcode,
  calculateEAN13Checksum,
  formatMoney,
  paginate,
};
