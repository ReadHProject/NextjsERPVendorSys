const { verifyAccessToken, verifyRefreshToken, signAccessToken } = require("../utils/jwt");
const { prisma } = require("../config/database");
const { UnauthorizedError } = require("../utils/errors");

const ACCESS_COOKIE = "erp_access";
const REFRESH_COOKIE = "erp_refresh";

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[ACCESS_COOKIE] || null;
}

function getRefreshFromRequest(req) {
  return req.cookies?.[REFRESH_COOKIE] || null;
}

async function authenticate(req, res, next) {
  console.log(`[AUTH DEBUG] Method: ${req.method} URL: ${req.originalUrl}`);
  console.log(`[AUTH DEBUG] Headers:`, JSON.stringify(req.headers));
  console.log(`[AUTH DEBUG] Cookies:`, JSON.stringify(req.cookies));

  try {
    let payload = null;
    const accessToken = getTokenFromRequest(req);
    console.log(`[AUTH DEBUG] Extracted Access Token: ${accessToken ? 'Yes' : 'No'}`);

    if (accessToken) {
      try {
        payload = await verifyAccessToken(accessToken);
      } catch {
        payload = null;
      }
    }

    if (!payload) {
      const refreshToken = getRefreshFromRequest(req);
      if (refreshToken) {
        try {
          payload = await verifyRefreshToken(refreshToken);
          const newAccessToken = await signAccessToken({
            sub: payload.sub,
            email: payload.email,
            roles: payload.roles,
            permissions: payload.permissions,
          });
          res.cookie(ACCESS_COOKIE, newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000,
          });
        } catch {
          payload = null;
        }
      }
    }

    if (!payload) {
      console.error(`[AUTH DEBUG] Payload is null after verifying both tokens. AccessToken: ${accessToken ? 'present' : 'missing'}. RefreshToken: ${req.cookies?.[REFRESH_COOKIE] ? 'present' : 'missing'}`);
      throw new UnauthorizedError("Authentication required");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedError("Account not found or inactive");
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.name),
      permissions: user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.code)
      ),
    };

    if (req.user.permissions.includes("*")) {
      req.user.permissions = ["*"];
    }

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      console.error(`[AUTH DEBUG] UnauthorizedError:`, error.message);
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: error.message },
      });
    }
    console.error(`[AUTH DEBUG] Unexpected Error:`, error);
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
  }
}

function optionalAuth(req, res, next) {
  authenticate(req, res, next).catch(() => next());
}

module.exports = { authenticate, optionalAuth, ACCESS_COOKIE, REFRESH_COOKIE };
