import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dbMocks = vi.hoisted(() => ({
  getCustomerTier: vi.fn(),
  getCustomerBookingsWithDetails: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/sdk", () => ({ sdk: authMocks }));

import { handleCSVExport, handlePDFExport } from "./bookingExport";

function response() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
    setHeader: vi.fn((key: string, value: string) => {
      res.headers[key] = value;
    }),
    send: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
  };
  return res;
}

describe("customer booking export entitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.authenticateRequest.mockResolvedValue({ id: 101, name: "Export Tester" });
    dbMocks.getCustomerBookingsWithDetails.mockResolvedValue([]);
  });

  it("denies Individual CSV export before querying booking data", async () => {
    dbMocks.getCustomerTier.mockResolvedValue("free");
    const res = response();

    await handleCSVExport({ query: {} } as any, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Booking exports are available for Manager subscribers." });
    expect(dbMocks.getCustomerBookingsWithDetails).not.toHaveBeenCalled();
  });

  it("denies Coordinator PDF export before querying booking data", async () => {
    dbMocks.getCustomerTier.mockResolvedValue("pro");
    const res = response();

    await handlePDFExport({ query: {} } as any, res);

    expect(res.statusCode).toBe(403);
    expect(dbMocks.getCustomerBookingsWithDetails).not.toHaveBeenCalled();
  });

  it("allows Manager CSV export", async () => {
    dbMocks.getCustomerTier.mockResolvedValue("business");
    const res = response();

    await handleCSVExport({ query: {} } as any, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("text/csv");
    expect(dbMocks.getCustomerBookingsWithDetails).toHaveBeenCalledWith(101, undefined);
  });

  it("shows the unified-page Export control only in Manager customer view", () => {
    const source = readFileSync(resolve(__dirname, "../client/src/pages/MyBookings.tsx"), "utf8");
    expect(source).toContain('bookingView === "customer" && customerSubscription?.currentTier === "business"');
    expect(source).toContain("{canExportBookings && <DropdownMenu>");
  });
});
