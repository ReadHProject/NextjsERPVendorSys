const { SignJWT, jwtVerify } = require("jose");
const config = require("../config");

const encoder = new TextEncoder();

function getAccessTokenSecret() {
  return encoder.encode(config.jwt.accessSecret);
}

function getRefreshTokenSecret() {
  return encoder.encode(config.jwt.refreshSecret);
}

async function signAccessToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(config.jwt.accessExpiry)
    .sign(getAccessTokenSecret());
}

async function signRefreshToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(config.jwt.refreshExpiry)
    .sign(getRefreshTokenSecret());
}

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, getAccessTokenSecret());
  return payload;
}

async function verifyRefreshToken(token) {
  const { payload } = await jwtVerify(token, getRefreshTokenSecret());
  return payload;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
