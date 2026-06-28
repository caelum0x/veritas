// Email template for invoice delivery notifications

import type { EmailTemplate } from "../template.js";

export interface InvoiceLineItemData {
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
}

export interface InvoiceEmailData {
  readonly recipientName: string;
  readonly organizationName: string;
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly lineItems: ReadonlyArray<InvoiceLineItemData>;
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly currency: string;
  readonly invoiceUrl: string;
}

const formatCents = (cents: number, currency: string): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const invoiceTemplate: EmailTemplate<InvoiceEmailData> = {
  name: "invoice",

  subject: (data) =>
    `Invoice ${data.invoiceNumber} from ${data.organizationName} — ${formatCents(data.totalCents, data.currency)}`,

  html: (data) => {
    const lineItemRows = data.lineItems
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(item.description)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCents(item.unitPriceCents, data.currency)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCents(item.totalCents, data.currency)}</td>
          </tr>`
      )
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Invoice ${escapeHtml(data.invoiceNumber)}</title></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:24px;margin-bottom:4px;">Invoice</h1>
  <p style="color:#666;margin-top:0;">#${escapeHtml(data.invoiceNumber)}</p>
  <p>Hello ${escapeHtml(data.recipientName)},</p>
  <p>Please find your invoice from <strong>${escapeHtml(data.organizationName)}</strong> below.</p>
  <p><strong>Invoice Date:</strong> ${escapeHtml(data.invoiceDate)} &nbsp; <strong>Due Date:</strong> ${escapeHtml(data.dueDate)}</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Description</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:right;">Qty</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:right;">Unit Price</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${lineItemRows}</tbody>
    <tfoot>
      <tr><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">Subtotal</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCents(data.subtotalCents, data.currency)}</td></tr>
      <tr><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">Tax</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCents(data.taxCents, data.currency)}</td></tr>
      <tr style="background:#f3f4f6;"><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">Total</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${formatCents(data.totalCents, data.currency)}</td></tr>
    </tfoot>
  </table>
  <p><a href="${escapeHtml(data.invoiceUrl)}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">View Invoice</a></p>
  <p style="color:#666;font-size:12px;margin-top:32px;">This is an automated message from Veritas.</p>
</body>
</html>`;
  },

  text: (data) => {
    const lineItemLines = data.lineItems.map(
      (item) =>
        `  ${item.description.padEnd(40)} x${item.quantity}  ${formatCents(item.unitPriceCents, data.currency).padStart(10)}  ${formatCents(item.totalCents, data.currency).padStart(10)}`
    );

    return [
      `Invoice #${data.invoiceNumber}`,
      `From: ${data.organizationName}`,
      "",
      `Hello ${data.recipientName},`,
      "",
      `Invoice Date: ${data.invoiceDate}`,
      `Due Date:     ${data.dueDate}`,
      "",
      "Items:",
      ...lineItemLines,
      "",
      `Subtotal: ${formatCents(data.subtotalCents, data.currency)}`,
      `Tax:      ${formatCents(data.taxCents, data.currency)}`,
      `Total:    ${formatCents(data.totalCents, data.currency)}`,
      "",
      `View invoice: ${data.invoiceUrl}`,
      "",
      "This is an automated message from Veritas.",
    ].join("\n");
  },
};
