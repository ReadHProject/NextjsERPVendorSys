const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { hashPassword, comparePassword } = require("../../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt");
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { authLimiter, otpLimiter } = require("../../middleware/rateLimiter");
const { ApiError, UnauthorizedError, BadRequestError, NotFoundError, ValidationError } = require("../../utils/errors");
const activityService = require("../../services/activity.service");
const smsService = require("../../services/sms.service");
const crypto = require("crypto");
const config = require("../../config");

const ACCESS_COOKIE = "erp_access";
const REFRESH_COOKIE = "erp_refresh";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const sendOtpSchema = z.object({
  mobile: z.string(),
  role: z.enum(["SALESMAN", "CUSTOMER"]).optional().default("CUSTOMER"),
});

const verifyOtpSchema = z.object({
  mobile: z.string(),
  code: z.string().length(6),
});

function normalizeMobile(phone) {
  if (!phone) return "";
  const cleaned = phone.toString().replace(/\D/g, "");
  return cleaned.length >= 10 ? cleaned.slice(-10) : "";
}

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

router.post("/send-otp", otpLimiter, validate(sendOtpSchema), async (req, res, next) => {
  try {
    const { mobile, role } = req.body;
    const normalized = normalizeMobile(mobile);
    if (normalized.length !== 10) {
      throw new ValidationError("Invalid 10-digit mobile number");
    }

    const existingUser = await prisma.user.findUnique({
      where: { mobile: normalized },
      include: { roles: { include: { role: true } } },
    });

    if (role === "SALESMAN") {
      if (!existingUser || existingUser.status !== "ACTIVE") {
        throw new UnauthorizedError("Salesman account not found or inactive for this phone number");
      }
      const isSalesman = existingUser.roles.some((r) => ["SALESMAN", "SUPER_ADMIN", "SUPERADMIN", "ADMIN", "SUB_ADMIN", "STAFF", "WAREHOUSE_MANAGER"].includes(r.role.name?.toUpperCase()));
      if (!isSalesman) {
        throw new UnauthorizedError("Account is not authorized as Salesman");
      }
    } else if (existingUser && existingUser.status !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active");
    }

    await prisma.otpToken.updateMany({
      where: { mobile: normalized, consumed: false },
      data: { consumed: true },
    });

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpToken.create({
      data: {
        mobile: normalized,
        role: role || "CUSTOMER",
        userId: existingUser?.id || null,
        code,
        expiresAt,
      },
    });

    try {
      await smsService.sendOtpSms(normalized, code);
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new BadRequestError("Failed to send OTP SMS. Please try again.");
      }
    }

    res.json({
      success: true,
      data: {
        message: "OTP sent successfully",
        ...(process.env.NODE_ENV !== "production" && { otp: code }),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const { mobile, code } = req.body;
    const normalized = normalizeMobile(mobile);
    if (normalized.length !== 10) {
      throw new ValidationError("Invalid 10-digit mobile number");
    }

    const otpRecord = await prisma.otpToken.findFirst({
      where: { mobile: normalized, code, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new UnauthorizedError("Invalid or expired OTP");
    }

    const consumed = await prisma.otpToken.updateMany({
      where: { id: otpRecord.id, consumed: false },
      data: { consumed: true },
    });

    if (consumed.count !== 1) {
      throw new UnauthorizedError("Invalid or expired OTP");
    }

    let user = await prisma.user.findUnique({
      where: { mobile: normalized },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    if (!user) {
      if (otpRecord.role === "SALESMAN") {
        throw new UnauthorizedError("Salesman account not found");
      }
      const customerRole = await prisma.role.findUnique({ where: { name: "CUSTOMER" } });
      const placeholderEmail = `${normalized}@customer.local`;
      const placeholderName = `Customer ${normalized.slice(-4)}`;
      const randomPass = crypto.randomBytes(24).toString("hex");
      const passwordHash = await hashPassword(randomPass);

      try {
        user = await prisma.user.create({
          data: {
            name: placeholderName,
            email: placeholderEmail,
            mobile: normalized,
            passwordHash,
            status: "ACTIVE",
            roles: customerRole ? { create: { roleId: customerRole.id } } : undefined,
          },
          include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
        });
      } catch (e) {
        user = await prisma.user.findUnique({
          where: { mobile: normalized },
          include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
        });
        if (!user) throw e;
      }
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active");
    }

    if (otpRecord.role === "SALESMAN") {
      const isSalesman = user.roles.some((r) => ["SALESMAN", "SUPER_ADMIN", "SUPERADMIN", "ADMIN", "SUB_ADMIN", "STAFF", "WAREHOUSE_MANAGER"].includes(r.role.name?.toUpperCase()));
      if (!isSalesman) {
        throw new UnauthorizedError("Account is not authorized as Salesman");
      }
    }

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)))];
    if (permissions.includes("*")) permissions.length = 0, permissions.push("*");

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions: permissions.includes("*") ? ["*"] : permissions,
    };
    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken({ sub: user.id });

    setTokenCookies(res, accessToken, refreshToken);

    await activityService.log({
      userId: user.id,
      type: "LOGIN",
      entityType: "user",
      entityId: user.id,
      description: `User logged in via OTP: ${user.mobile || user.email}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          roles,
          permissions: permissions.includes("*") ? ["*"] : permissions,
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

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
