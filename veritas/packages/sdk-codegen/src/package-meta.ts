// Package metadata descriptors for generated SDK packages across supported languages.

export type SdkLanguage = "typescript" | "python" | "go";

export interface PackageMeta {
  /** Human-readable package name. */
  readonly name: string;
  /** Language ecosystem package identifier. */
  readonly packageId: string;
  /** Semantic version string. */
  readonly version: string;
  /** Package description. */
  readonly description: string;
  /** Homepage / repository URL. */
  readonly repositoryUrl: string;
  /** Author or organisation. */
  readonly author: string;
  /** SPDX license identifier. */
  readonly license: string;
  /** Primary entry-point module path within the package. */
  readonly entryPoint: string;
  /** Language this metadata applies to. */
  readonly language: SdkLanguage;
  /** Optional key-value pairs for extra manifest fields. */
  readonly extra?: Readonly<Record<string, string>>;
}

export interface PackageMetaOptions {
  readonly version?: string;
  readonly repositoryUrl?: string;
  readonly author?: string;
  readonly license?: string;
}

const DEFAULTS = {
  repositoryUrl: "https://github.com/veritas-platform/veritas",
  author: "Veritas Platform <sdk@veritas.io>",
  license: "MIT",
} as const;

/** Build TypeScript/npm package metadata for the Veritas SDK. */
export function buildTypeScriptMeta(opts: PackageMetaOptions = {}): PackageMeta {
  return {
    name: "Veritas TypeScript SDK",
    packageId: "@veritas/sdk",
    version: opts.version ?? "1.0.0",
    description: "Official TypeScript SDK for the Veritas fact-verification platform.",
    repositoryUrl: opts.repositoryUrl ?? DEFAULTS.repositoryUrl,
    author: opts.author ?? DEFAULTS.author,
    license: opts.license ?? DEFAULTS.license,
    entryPoint: "src/index.ts",
    language: "typescript",
    extra: {
      types: "src/index.ts",
      type: "module",
      engines: JSON.stringify({ node: ">=18" }),
    },
  };
}

/** Build Python/PyPI package metadata for the Veritas SDK. */
export function buildPythonMeta(opts: PackageMetaOptions = {}): PackageMeta {
  return {
    name: "Veritas Python SDK",
    packageId: "veritas-sdk",
    version: opts.version ?? "1.0.0",
    description: "Official Python SDK for the Veritas fact-verification platform.",
    repositoryUrl: opts.repositoryUrl ?? DEFAULTS.repositoryUrl,
    author: opts.author ?? DEFAULTS.author,
    license: opts.license ?? DEFAULTS.license,
    entryPoint: "veritas/__init__.py",
    language: "python",
    extra: {
      pythonRequires: ">=3.9",
      classifiers: JSON.stringify([
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
      ]),
    },
  };
}

/** Build Go module metadata for the Veritas SDK. */
export function buildGoMeta(opts: PackageMetaOptions = {}): PackageMeta {
  return {
    name: "Veritas Go SDK",
    packageId: "github.com/veritas-platform/veritas-go",
    version: opts.version ?? "v1.0.0",
    description: "Official Go SDK for the Veritas fact-verification platform.",
    repositoryUrl: opts.repositoryUrl ?? DEFAULTS.repositoryUrl,
    author: opts.author ?? DEFAULTS.author,
    license: opts.license ?? DEFAULTS.license,
    entryPoint: "veritas.go",
    language: "go",
    extra: {
      goVersion: "1.21",
    },
  };
}

/** Render npm package.json content string from TypeScript metadata. */
export function renderNpmPackageJson(meta: PackageMeta): string {
  if (meta.language !== "typescript") {
    throw new Error(`renderNpmPackageJson expects typescript metadata, got ${meta.language}`);
  }

  const manifest: Record<string, unknown> = {
    name: meta.packageId,
    version: meta.version,
    description: meta.description,
    type: meta.extra?.["type"] ?? "module",
    main: meta.entryPoint,
    types: meta.extra?.["types"] ?? meta.entryPoint,
    license: meta.license,
    author: meta.author,
    repository: {
      type: "git",
      url: meta.repositoryUrl,
    },
  };

  if (meta.extra?.["engines"]) {
    try {
      manifest["engines"] = JSON.parse(meta.extra["engines"]) as unknown;
    } catch {
      // ignore parse errors; emit as-is
    }
  }

  return JSON.stringify(manifest, null, 2);
}

/** Render a Python pyproject.toml content string from Python metadata. */
export function renderPyprojectToml(meta: PackageMeta): string {
  if (meta.language !== "python") {
    throw new Error(`renderPyprojectToml expects python metadata, got ${meta.language}`);
  }

  const lines = [
    `[build-system]`,
    `requires = ["setuptools>=68", "wheel"]`,
    `build-backend = "setuptools.backends.legacy:build"`,
    ``,
    `[project]`,
    `name = "${meta.packageId}"`,
    `version = "${meta.version}"`,
    `description = "${meta.description}"`,
    `license = {text = "${meta.license}"}`,
    `authors = [{name = "${meta.author}"}]`,
    `requires-python = "${meta.extra?.["pythonRequires"] ?? ">=3.9"}"`,
    ``,
    `[project.urls]`,
    `Homepage = "${meta.repositoryUrl}"`,
  ];

  return lines.join("\n");
}

/** Render a go.mod content string from Go metadata. */
export function renderGoMod(meta: PackageMeta): string {
  if (meta.language !== "go") {
    throw new Error(`renderGoMod expects go metadata, got ${meta.language}`);
  }

  return [
    `module ${meta.packageId}`,
    ``,
    `go ${meta.extra?.["goVersion"] ?? "1.21"}`,
    ``,
    `require (`,
    `\tgolang.org/x/net v0.24.0`,
    `)`,
  ].join("\n");
}
