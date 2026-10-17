export interface OpenAPITag {
  name: string;
  description?: string;
}

export interface OpenAPIContact {
  name?: string;
  email?: string;
  url?: string;
}

export interface OpenAPIInfo {
  title: string;
  version: string;
  description: string;
  contact?: OpenAPIContact;
}

export interface OpenAPISchemaProperty {
  type?: string;
  format?: string;
  description?: string;
  example?: unknown;
  items?: OpenAPISchemaProperty;
  $ref?: string;
  enum?: string[];
  properties?: Record<string, OpenAPISchemaProperty>;
}

export interface OpenAPISchema {
  type?: string;
  required?: string[];
  properties?: Record<string, OpenAPISchemaProperty>;
  items?: OpenAPISchemaProperty;
  $ref?: string;
  example?: unknown;
  description?: string;
}

export interface OpenAPIParameter {
  name: string;
  in: "path" | "query" | "body" | "header" | "formData";
  description?: string;
  required?: boolean;
  type?: string;
  enum?: (string | number)[];
  default?: unknown;
  example?: unknown;
  schema?: OpenAPISchema;
}

export interface OpenAPIResponse {
  description: string;
  schema?: OpenAPISchema;
  examples?: Record<string, unknown>;
}

export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  consumes?: string[];
  produces?: string[];
  parameters?: OpenAPIParameter[];
  responses?: Record<string, OpenAPIResponse>;
  security?: Record<string, unknown[]>[];
}

export type HTTPMethod = "get" | "post" | "put" | "patch" | "delete";

export type OpenAPIPathItem = Partial<Record<HTTPMethod, OpenAPIOperation>>;

export interface OpenAPISpec {
  swagger: string;
  info: OpenAPIInfo;
  basePath?: string;
  schemes?: string[];
  consumes?: string[];
  produces?: string[];
  tags?: OpenAPITag[];
  paths: Record<string, OpenAPIPathItem>;
  definitions?: Record<string, OpenAPISchema>;
  securityDefinitions?: Record<string, unknown>;
}

export interface FlatOperation {
  id: string;
  path: string;
  method: HTTPMethod;
  summary: string;
  description: string;
  tag: string;
  role: string;
  parameters: OpenAPIParameter[];
  requestBodySchema?: OpenAPISchema;
  responses: Record<string, OpenAPIResponse>;
  securityRequired: boolean;
}
