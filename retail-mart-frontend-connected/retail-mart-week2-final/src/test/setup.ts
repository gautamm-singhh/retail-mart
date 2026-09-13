import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { installMockApi, resetMockApi } from "@/test/mockApi";

// Every test in the suite runs against the in-memory fake backend in
// mockApi.ts instead of a live server - this keeps the frontend testable
// on its own while still exercising the real request/response contract
// (services/api/* -> client.ts -> fetch()).
installMockApi();

beforeEach(() => {
  resetMockApi();
  sessionStorage.clear();
});
