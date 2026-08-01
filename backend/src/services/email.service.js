const nodemailer = require("nodemailer");
const config = require("../config");

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth.user ? config.smtp.auth : undefined,
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, text, html, from }) {
  if (process.env.NODE_ENV !== "production" || !config.smtp.auth.user) {
    console.log("\n📧 [EMAIL DEV LOG]");
    console.log("  To:", to);
    console.log("  Subject:", subject);
    console.log("  Body:", text || html);
    console.log("");
    return { ok: true, dev: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: from || config.smtp.from,
      to,
      subject,
      text,
      html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send failed:", error.message);
    return { ok: false, error: error.message };
  }
}

function renderTemplate(template, variables = {}) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

module.exports = { sendEmail, renderTemplate };
