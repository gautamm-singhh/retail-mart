import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { installMockApi, resetMockApi } from "@/test/mockApi";
import { clearAllEntityCaches } from "@/services/api/cacheManager";

installMockApi();

beforeEach(() => {
  resetMockApi();
  clearAllEntityCaches();
  sessionStorage.clear();
});
