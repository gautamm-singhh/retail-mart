import { apiConfig } from "./client";
import type { OpenAPISpec, FlatOperation, HTTPMethod, OpenAPIParameter, OpenAPISchema } from "@/types/openapi";
import fallbackSpecJson from "@/features/docs/data/openApiFallback.json";

const fallbackSpec: OpenAPISpec = fallbackSpecJson as unknown as OpenAPISpec;

export function getApiBaseUrl(): string {
  return (apiConfig.baseUrl || "http://127.0.0.1:4000/api").replace(/\/+$/, "");
}

export function getSwaggerUrl(): string {
  const base = getApiBaseUrl();
  return `${base}/docs/`;
}

export function getOpenApiJsonUrl(): string {
  const base = getApiBaseUrl();
  return `${base}/docs.json`;
}

export function extractRoleFromOperation(
  description: string = "",
  summary: string = "",
  securityRequired: boolean = false
): string {
  const combined = `${summary} ${description}`.toLowerCase();

  if (
    combined.includes("public api") ||
    combined.includes("no login required") ||
    combined.includes("no authentication required") ||
    (!securityRequired && combined.includes("public"))
  ) {
    return "Public";
  }
  if (
    combined.includes("admin or manager or staff") ||
    combined.includes("admin, manager, or staff") ||
    combined.includes("customer, admin, manager, staff")
  ) {
    return "Staff, Manager, or Admin";
  }
  if (combined.includes("admin or manager") || combined.includes("admin, manager")) {
    return "Manager or Admin";
  }
  if (
    combined.includes("admin access required") ||
    combined.includes("admin role required") ||
    combined.includes("admin only") ||
    combined.includes("admin access")
  ) {
    return "Admin";
  }
  if (
    combined.includes("customer authentication required") ||
    combined.includes("customer role required") ||
    combined.includes("customer access") ||
    combined.includes("customer account")
  ) {
    return "Customer";
  }
  if (combined.includes("authentication required") || securityRequired) {
    return "Authenticated";
  }
  return "Public";
}

export function resolveSchemaRef(ref: string, spec: OpenAPISpec): OpenAPISchema | undefined {
  if (!ref.startsWith("#/definitions/")) return undefined;
  const defName = ref.replace("#/definitions/", "");
  return spec.definitions?.[defName];
}

export function generateSampleJson(schema?: OpenAPISchema): string | null {
  if (!schema || !schema.properties) return null;
  const sample: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.example !== undefined) {
      sample[key] = prop.example;
    } else if (prop.type === "string") {
      sample[key] = prop.enum ? prop.enum[0] : `${key}_value`;
    } else if (prop.type === "number" || prop.type === "integer") {
      sample[key] = 1;
    } else if (prop.type === "boolean") {
      sample[key] = true;
    } else if (prop.type === "array") {
      sample[key] = [];
    } else if (prop.type === "object") {
      sample[key] = {};
    } else {
      sample[key] = null;
    }
  }

  return JSON.stringify(sample, null, 2);
}

export function flattenOperations(spec: OpenAPISpec): FlatOperation[] {
  const list: FlatOperation[] = [];
  const validMethods: HTTPMethod[] = ["get", "post", "put", "patch", "delete"];

  for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) continue;

    for (const method of validMethods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const tag = operation.tags?.[0] || "General";
      const summary = operation.summary || `${method.toUpperCase()} ${pathKey}`;
      const description = operation.description || "";
      const securityRequired = Boolean(operation.security && operation.security.length > 0);
      const role = extractRoleFromOperation(description, summary, securityRequired);

      const bodyParam = operation.parameters?.find((p) => p.in === "body");
      let requestBodySchema = bodyParam?.schema;
      if (requestBodySchema?.$ref) {
        const resolved = resolveSchemaRef(requestBodySchema.$ref, spec);
        if (resolved) {
          requestBodySchema = { ...resolved, $ref: requestBodySchema.$ref };
        }
      }

      list.push({
        id: `${method}-${pathKey.replace(/[^a-zA-Z0-9]/g, "-")}`,
        path: pathKey,
        method,
        summary,
        description,
        tag,
        role,
        parameters: (operation.parameters || []) as OpenAPIParameter[],
        requestBodySchema,
        responses: operation.responses || {},
        securityRequired,
      });
    }
  }

  return list;
}

export async function fetchOpenApiSpec(): Promise<{
  spec: OpenAPISpec;
  isLive: boolean;
  sourceUrl: string;
  error?: string;
}> {
  const candidateUrls = [
    getOpenApiJsonUrl(),
    `${apiConfig.baseUrl}/docs.json`,
    "/api/docs.json",
    "http://127.0.0.1:4000/api/docs.json",
    "http://localhost:4000/api/docs.json",
  ];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        const data = (await response.json()) as OpenAPISpec;
        if (data && data.paths && Object.keys(data.paths).length > 0) {
          return { spec: data, isLive: true, sourceUrl: url };
        }
      }
    } catch {
      /* ignore */
    }
  }

  return {
    spec: fallbackSpec,
    isLive: false,
    sourceUrl: "Bundled Local Snapshot (openApiFallback.json)",
    error: "Backend API specification is currently unreachable. Displaying the latest local documentation snapshot.",
  };
}
