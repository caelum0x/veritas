// Email template for new user welcome messages

import type { EmailTemplate } from "../template.js";

export interface WelcomeEmailData {
  readonly recipientName: string;
  readonly email: string;
  readonly organizationName: string;
  readonly dashboardUrl: string;
  readonly docsUrl: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const welcomeTemplate: EmailTemplate<WelcomeEmailData> = {
  name: "welcome",

  subject: (data) => `Welcome to Veritas, ${data.recipientName}!`,

  html: (data) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Welcome to Veritas</title></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:28px;margin-bottom:8px;">Welcome to Veritas</h1>
  <p>Hello ${escapeHtml(data.recipientName)},</p>
  <p>Your account has been created for <strong>${escapeHtml(data.organizationName)}</strong>.</p>
  <p>You can now start verifying claims with confidence using our enterprise fact-verification platform.</p>
  <h2 style="font-size:18px;margin-top:24px;">Getting Started</h2>
  <ul>
    <li>Submit claims for verification via the dashboard or REST API</li>
    <li>Track verification status and view detailed provenance reports</li>
    <li>Integrate with your workflows using our SDK</li>
  </ul>
  <p style="margin-top:24px;">
    <a href="${escapeHtml(data.dashboardUrl)}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-right:12px;">Open Dashboard</a>
    <a href="${escapeHtml(data.docsUrl)}" style="background:#f3f4f6;color:#1a1a1a;padding:10px 20px;text-decoration:none;border-radius:4px;">Read the Docs</a>
  </p>
  <p style="margin-top:24px;">If you have any questions, reply to this email and our team will be happy to help.</p>
  <p style="color:#666;font-size:12px;margin-top:32px;">
    Your account email: ${escapeHtml(data.email)}<br>
    This is an automated message from Veritas.
  </p>
</body>
</html>`,

  text: (data) => [
    `Welcome to Veritas, ${data.recipientName}!`,
    "",
    `Your account has been created for ${data.organizationName}.`,
    "",
    "You can now start verifying claims with confidence using our enterprise fact-verification platform.",
    "",
    "Getting Started:",
    "  - Submit claims for verification via the dashboard or REST API",
    "  - Track verification status and view detailed provenance reports",
    "  - Integrate with your workflows using our SDK",
    "",
    `Open Dashboard: ${data.dashboardUrl}`,
    `Read the Docs:  ${data.docsUrl}`,
    "",
    "If you have any questions, reply to this email and our team will be happy to help.",
    "",
    `Your account email: ${data.email}`,
    "This is an automated message from Veritas.",
  ].join("\n"),
};
