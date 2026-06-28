// Markdown renderer: converts an ApiDoc into Markdown documentation strings.

import type { ApiDoc, DocEndpoint, DocParameter, DocRequestBody, DocResponse, DocTag } from "./doc.js";

function renderBadge(method: string): string {
  return `**\`${method}\`**`;
}

function renderParameter(p: DocParameter): string {
  const required = p.required ? " *(required)*" : " *(optional)*";
  const deprecated = p.deprecated ? " ~~deprecated~~" : "";
  const schema = p.schema ? ` — \`${JSON.stringify(p.schema)}\`` : "";
  return `- **${p.name}** \`${p.location}\`${required}${deprecated}${schema}: ${p.description}`;
}

function renderRequestBody(rb: DocRequestBody): string {
  const lines: string[] = [
    "#### Request Body",
    "",
    `Content-Type: ${rb.contentTypes.join(", ")}`,
  ];
  if (rb.description) lines.push("", rb.description);
  if (rb.schema) {
    lines.push("", "```json", JSON.stringify(rb.schema, null, 2), "```");
  }
  return lines.join("\n");
}

function renderResponse(r: DocResponse): string {
  const contentInfo = r.contentTypes.length > 0
    ? ` (${r.contentTypes.join(", ")})`
    : "";
  return `- **${r.statusCode}**${contentInfo}: ${r.description}`;
}

function renderEndpoint(endpoint: DocEndpoint): string {
  const lines: string[] = [
    `### ${renderBadge(endpoint.method)} \`${endpoint.path}\``,
    "",
  ];

  if (endpoint.deprecated) lines.push("> **Deprecated**", "");
  if (endpoint.summary) lines.push(endpoint.summary, "");
  if (endpoint.description) lines.push(endpoint.description, "");

  if (endpoint.operationId) {
    lines.push(`**Operation ID:** \`${endpoint.operationId}\``, "");
  }

  if (endpoint.security.length > 0) {
    lines.push(`**Security:** ${endpoint.security.join(", ")}`, "");
  }

  if (endpoint.parameters.length > 0) {
    lines.push("#### Parameters", "");
    for (const p of endpoint.parameters) {
      lines.push(renderParameter(p));
    }
    lines.push("");
  }

  if (endpoint.requestBody) {
    lines.push(renderRequestBody(endpoint.requestBody), "");
  }

  if (endpoint.responses.length > 0) {
    lines.push("#### Responses", "");
    for (const r of endpoint.responses) {
      lines.push(renderResponse(r));
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderTag(tag: DocTag): string {
  const lines: string[] = [`## ${tag.name}`, ""];
  if (tag.description) lines.push(tag.description, "");
  for (const endpoint of tag.endpoints) {
    lines.push(renderEndpoint(endpoint));
  }
  return lines.join("\n");
}

function renderHeader(doc: ApiDoc): string {
  const { info } = doc;
  const lines: string[] = [
    `# ${info.title}`,
    "",
    `**Version:** ${info.version}`,
    "",
  ];
  if (info.description) lines.push(info.description, "");
  if (info.termsOfService) lines.push(`**Terms of Service:** ${info.termsOfService}`, "");
  if (info.contact) {
    lines.push(`**Contact:** ${info.contact.name} — ${info.contact.email}`, "");
  }
  if (info.license) {
    lines.push(`**License:** ${info.license.name}`, "");
  }
  if (doc.servers.length > 0) {
    lines.push("## Servers", "");
    for (const s of doc.servers) {
      lines.push(`- \`${s.url}\`${s.description ? ` — ${s.description}` : ""}`)
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Render an ApiDoc as a Markdown string. */
export function renderMarkdown(doc: ApiDoc): string {
  const sections: string[] = [renderHeader(doc)];

  for (const tag of doc.tags) {
    if (tag.endpoints.length > 0) {
      sections.push(renderTag(tag));
    }
  }

  if (doc.untaggedEndpoints.length > 0) {
    sections.push("## Other Endpoints", "");
    for (const endpoint of doc.untaggedEndpoints) {
      sections.push(renderEndpoint(endpoint));
    }
  }

  sections.push(`---\n*Generated at ${doc.generatedAt}*\n`);
  return sections.join("\n");
}
