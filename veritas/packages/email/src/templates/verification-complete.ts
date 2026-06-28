// Email template for verification completion notifications

import type { EmailTemplate } from "../template.js";

export interface VerificationCompleteData {
  readonly recipientName: string;
  readonly claimText: string;
  readonly verdict: string;
  readonly confidencePercent: number;
  readonly reportUrl: string;
  readonly verifiedAt: string;
}

export const verificationCompleteTemplate: EmailTemplate<VerificationCompleteData> = {
  name: "verification-complete",

  subject: (data) => `Verification Complete: ${data.verdict} — ${data.claimText.slice(0, 60)}`,

  html: (data) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Verification Complete</title></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:24px;margin-bottom:8px;">Verification Complete</h1>
  <p>Hello ${escapeHtml(data.recipientName)},</p>
  <p>Your claim has been verified.</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0;">
    <tr><td style="padding:8px;font-weight:bold;border:1px solid #ddd;">Claim</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(data.claimText)}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;border:1px solid #ddd;">Verdict</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(data.verdict)}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;border:1px solid #ddd;">Confidence</td>
        <td style="padding:8px;border:1px solid #ddd;">${data.confidencePercent}%</td></tr>
    <tr><td style="padding:8px;font-weight:bold;border:1px solid #ddd;">Verified At</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(data.verifiedAt)}</td></tr>
  </table>
  <p><a href="${escapeHtml(data.reportUrl)}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">View Full Report</a></p>
  <p style="color:#666;font-size:12px;margin-top:32px;">This is an automated message from Veritas.</p>
</body>
</html>`,

  text: (data) => [
    "Verification Complete",
    "",
    `Hello ${data.recipientName},`,
    "",
    "Your claim has been verified.",
    "",
    `Claim:      ${data.claimText}`,
    `Verdict:    ${data.verdict}`,
    `Confidence: ${data.confidencePercent}%`,
    `Verified:   ${data.verifiedAt}`,
    "",
    `View the full report: ${data.reportUrl}`,
    "",
    "This is an automated message from Veritas.",
  ].join("\n"),
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
