// HTML renderer: converts an ApiDoc into a self-contained HTML documentation page.

import type { ApiDoc, DocEndpoint, DocParameter, DocTag } from "./doc.js";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function methodClass(method: string): string {
  const m = method.toLowerCase();
  const classes: Record<string, string> = {
    get: "method-get",
    post: "method-post",
    put: "method-put",
    patch: "method-patch",
    delete: "method-delete",
  };
  return classes[m] ?? "method-other";
}

function renderParameterHtml(p: DocParameter): string {
  const required = p.required
    ? `<span class="badge required">required</span>`
    : `<span class="badge optional">optional</span>`;
  const deprecated = p.deprecated ? `<span class="badge deprecated">deprecated</span>` : "";
  const schema = p.schema ? `<code>${esc(JSON.stringify(p.schema))}</code>` : "";
  return `
    <tr>
      <td><strong>${esc(p.name)}</strong></td>
      <td><code>${esc(p.location)}</code></td>
      <td>${required}${deprecated}</td>
      <td>${schema}</td>
      <td>${esc(p.description)}</td>
    </tr>`;
}

function renderEndpointHtml(endpoint: DocEndpoint): string {
  const id = esc(endpoint.operationId);
  const params = endpoint.parameters.length > 0
    ? `<h4>Parameters</h4>
       <table><thead><tr><th>Name</th><th>In</th><th>Required</th><th>Schema</th><th>Description</th></tr></thead>
       <tbody>${endpoint.parameters.map(renderParameterHtml).join("")}</tbody></table>`
    : "";

  const requestBody = endpoint.requestBody
    ? `<h4>Request Body</h4>
       <p>Content-Type: <code>${esc(endpoint.requestBody.contentTypes.join(", "))}</code></p>
       ${endpoint.requestBody.description ? `<p>${esc(endpoint.requestBody.description)}</p>` : ""}
       ${endpoint.requestBody.schema ? `<pre><code>${esc(JSON.stringify(endpoint.requestBody.schema, null, 2))}</code></pre>` : ""}`
    : "";

  const responses = endpoint.responses.length > 0
    ? `<h4>Responses</h4><ul>
       ${endpoint.responses.map((r) =>
         `<li><code>${esc(r.statusCode)}</code> — ${esc(r.description)}</li>`
       ).join("")}</ul>`
    : "";

  const deprecated = endpoint.deprecated
    ? `<p class="deprecated-notice">This endpoint is deprecated.</p>`
    : "";

  const security = endpoint.security.length > 0
    ? `<p><strong>Security:</strong> ${endpoint.security.map((s) => `<code>${esc(s)}</code>`).join(", ")}</p>`
    : "";

  return `
  <div class="endpoint" id="${id}">
    <div class="endpoint-header">
      <span class="method ${esc(methodClass(endpoint.method))}">${esc(endpoint.method)}</span>
      <code class="path">${esc(endpoint.path)}</code>
      ${endpoint.summary ? `<span class="summary">${esc(endpoint.summary)}</span>` : ""}
    </div>
    ${deprecated}
    ${endpoint.description ? `<p>${esc(endpoint.description)}</p>` : ""}
    ${security}
    ${params}
    ${requestBody}
    ${responses}
  </div>`;
}

function renderTagHtml(tag: DocTag): string {
  if (tag.endpoints.length === 0) return "";
  return `
  <section class="tag-section" id="tag-${esc(tag.name.toLowerCase())}">
    <h2>${esc(tag.name)}</h2>
    ${tag.description ? `<p>${esc(tag.description)}</p>` : ""}
    ${tag.endpoints.map(renderEndpointHtml).join("")}
  </section>`;
}

function renderCss(): string {
  return `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #1a1a1a; }
    .container { max-width: 960px; margin: 0 auto; padding: 2rem; }
    h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; }
    h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-top: 2rem; }
    .endpoint { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1.5rem; padding: 1.5rem; }
    .endpoint-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .method { padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: bold; font-size: 0.8rem; color: white; }
    .method-get { background: #10b981; } .method-post { background: #3b82f6; }
    .method-put { background: #f59e0b; } .method-patch { background: #8b5cf6; }
    .method-delete { background: #ef4444; } .method-other { background: #6b7280; }
    .path { font-size: 1.1rem; } .summary { color: #6b7280; }
    .badge { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 3px; margin-left: 0.25rem; }
    .required { background: #fef2f2; color: #dc2626; }
    .optional { background: #f3f4f6; color: #6b7280; }
    .deprecated { background: #fffbeb; color: #d97706; }
    .deprecated-notice { color: #d97706; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; font-family: monospace; }
    pre code { background: none; padding: 0; }
    footer { border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 3rem; color: #9ca3af; font-size: 0.85rem; }
  `;
}

/** Render an ApiDoc as a self-contained HTML string. */
export function renderHtml(doc: ApiDoc): string {
  const tagSections = doc.tags.map(renderTagHtml).join("");
  const untaggedSection = doc.untaggedEndpoints.length > 0
    ? `<section class="tag-section"><h2>Other Endpoints</h2>${doc.untaggedEndpoints.map(renderEndpointHtml).join("")}</section>`
    : "";

  const servers = doc.servers.length > 0
    ? `<p><strong>Servers:</strong> ${doc.servers.map((s) => `<code>${esc(s.url)}</code>${s.description ? ` — ${esc(s.description)}` : ""}`).join(", ")}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(doc.info.title)} v${esc(doc.info.version)}</title>
  <style>${renderCss()}</style>
</head>
<body>
  <div class="container">
    <h1>${esc(doc.info.title)}</h1>
    <p><strong>Version:</strong> ${esc(doc.info.version)}</p>
    ${doc.info.description ? `<p>${esc(doc.info.description)}</p>` : ""}
    ${servers}
    ${tagSections}
    ${untaggedSection}
    <footer>Generated at ${esc(doc.generatedAt)}</footer>
  </div>
</body>
</html>`;
}
