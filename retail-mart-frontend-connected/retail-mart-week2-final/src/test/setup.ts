import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { installMockApi, resetMockApi } from "@/test/mockApi";

installMockApi();

beforeEach(() => {
  resetMockApi();
  sessionStorage.clear();
});
