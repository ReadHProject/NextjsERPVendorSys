/**
 * SMS Service for sending OTP and SMS notifications
 */

async function sendOtpSms(mobile, code) {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    console.log(`[SMS DEV MODE] OTP Code for ${mobile}: ${code}`);
    return true;
  }

  try {
    if (process.env.SMS_API_KEY) {
      // Production SMS Gateway hook placeholder
      return true;
    }

    console.warn(`[SMS PROD WARNING] No SMS_API_KEY configured for sending OTP to ${mobile}`);
    return true;
  } catch (err) {
    console.error(`[SMS ERROR] Failed to send SMS to ${mobile}:`, err);
    throw err;
  }
}

module.exports = {
  sendOtpSms,
};
