const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { hashPassword, comparePassword } = require("../../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt");
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { authLimiter } = require("../../middleware/rateLimiter");
const { ApiError, UnauthorizedError, BadRequestError, NotFoundError } = require("../../utils/errors");
const activityService = require("../../services/activity.service");
const config = require("../../config");

const ACCESS_COOKIE = "erp_access";
const REFRESH_COOKIE = "erp_refresh";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  mobile: z.string().optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
});

const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(6) });

function setTokenCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    if (!user) throw new UnauthorizedError("Invalid email or password");
    if (user.status !== "ACTIVE") throw new UnauthorizedError("Account is not active");

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)))];
    if (permissions.includes("*")) permissions.length = 0, permissions.push("*");

    const tokenPayload = { sub: user.id, email: user.email, roles, permissions: permissions.includes("*") ? ["*"] : permissions };
    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken({ sub: user.id });

    setTokenCookies(res, accessToken, refreshToken);

    await activityService.log({
      userId: user.id, type: "LOGIN", entityType: "user", entityId: user.id,
      description: `User logged in: ${user.email}`, ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, roles, permissions: permissions.includes("*") ? ["*"] : permissions },
        accessToken,
      },
    });
  } catch (error) { next(error); }
});

router.post("/register", authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, mobile, businessName, gstNumber } = req.body;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new BadRequestError("Email already registered");

    const customerRole = await prisma.role.findUnique({ where: { name: "CUSTOMER" } });
    if (!customerRole) throw new BadRequestError("System configuration error");

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        mobile: mobile || null,
        businessName: businessName || null,
        gstNumber: gstNumber || null,
        roles: { create: { roleId: customerRole.id } },
      },
      include: { roles: { include: { role: true } } },
    });

    const roles = user.roles.map((ur) => ur.role.name);
    const accessToken = await signAccessToken({ sub: user.id, email: user.email, roles, permissions: [] });
    const refreshToken = await signRefreshToken({ sub: user.id });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      data: { user: { id: user.id, name: user.name, email: user.email, roles }, accessToken },
    });
  } catch (error) { next(error); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) throw new UnauthorizedError("No refresh token");

    const payload = await verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    if (!user || user.status !== "ACTIVE") throw new UnauthorizedError("Account not found or inactive");

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)))];
    if (permissions.includes("*")) permissions.length = 0, permissions.push("*");

    const newAccessToken = await signAccessToken({ sub: user.id, email: user.email, roles, permissions: permissions.includes("*") ? ["*"] : permissions });
    const newRefreshToken = await signRefreshToken({ sub: user.id });

    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, roles, permissions: permissions.includes("*") ? ["*"] : permissions },
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    res.clearCookie(ACCESS_COOKIE);
    res.clearCookie(REFRESH_COOKIE);
    next(new UnauthorizedError("Invalid refresh token"));
  }
});

router.post("/logout", async (req, res) => {
  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);
  res.json({ success: true, data: { message: "Logged out" } });
});

router.get("/me", authenticate, async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      roles: req.user.roles,
      permissions: req.user.permissions,
    },
  });
});

router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.json({ success: true, data: { message: "If the email exists, a reset link has been sent" } });

    const token = require("crypto").randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });

    res.json({ success: true, data: { message: "If the email exists, a reset link has been sent", ...(process.env.NODE_ENV !== "production" && { token }) } });
  } catch (error) { next(error); }
});

router.post("/reset-password", validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.consumed || reset.expiresAt < new Date()) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { consumed: true } }),
    ]);

    res.json({ success: true, data: { message: "Password reset successful" } });
  } catch (error) { next(error); }
});

module.exports = router;
