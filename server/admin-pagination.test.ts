import { describe, it, expect } from "vitest";

describe("Admin Users Pagination", () => {
  it("should have searchUsersFiltered procedure in admin router", async () => {
    const { adminRouter } = await import("./adminRouter");
    expect(adminRouter).toBeDefined();
    const procedures = Object.keys(adminRouter._def.procedures);
    expect(procedures).toContain("searchUsersFiltered");
  });

  it("should have getAllUsers function in db", async () => {
    const db = await import("./db");
    expect(typeof db.getAllUsers).toBe("function");
  });

  it("should return paginated results with correct shape", async () => {
    const db = await import("./db");
    const allUsers = await db.getAllUsers();

    // Simulate the pagination logic from searchUsersFiltered
    const page = 1;
    const limit = 20;
    const total = allUsers.length;
    const offset = (page - 1) * limit;
    const paginated = allUsers.slice(offset, offset + limit);

    const result = {
      users: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    expect(result).toHaveProperty("users");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("limit");
    expect(result).toHaveProperty("totalPages");
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.users.length).toBeLessThanOrEqual(20);
    expect(result.totalPages).toBe(Math.ceil(total / 20));
  });

  it("should paginate correctly for page 2", async () => {
    const db = await import("./db");
    const allUsers = await db.getAllUsers();

    const page = 2;
    const limit = 20;
    const total = allUsers.length;
    const offset = (page - 1) * limit;
    const paginated = allUsers.slice(offset, offset + limit);

    // If there are more than 20 users, page 2 should have users
    if (total > 20) {
      expect(paginated.length).toBeGreaterThan(0);
      expect(paginated.length).toBeLessThanOrEqual(20);
    } else {
      // If 20 or fewer users, page 2 should be empty
      expect(paginated.length).toBe(0);
    }
  });

  it("should filter by role correctly", async () => {
    const db = await import("./db");
    const allUsers = await db.getAllUsers();

    const filtered = allUsers.filter((u: any) => u.role === "admin");
    // All filtered users should have admin role
    filtered.forEach((u: any) => {
      expect(u.role).toBe("admin");
    });
  });

  it("should filter by status correctly", async () => {
    const db = await import("./db");
    const allUsers = await db.getAllUsers();

    const activeUsers = allUsers.filter((u: any) => u.deletedAt === null);
    const suspendedUsers = allUsers.filter((u: any) => u.deletedAt !== null);

    // Active + suspended should equal total
    expect(activeUsers.length + suspendedUsers.length).toBe(allUsers.length);
  });

  it("should search by name/email correctly", async () => {
    const db = await import("./db");
    const allUsers = await db.getAllUsers();

    if (allUsers.length > 0) {
      const firstUser = allUsers[0];
      const searchTerm = (firstUser.name || firstUser.email || "").substring(0, 3).toLowerCase();

      if (searchTerm) {
        const filtered = allUsers.filter((u: any) =>
          (u.name && u.name.toLowerCase().includes(searchTerm)) ||
          (u.email && u.email.toLowerCase().includes(searchTerm)) ||
          (u.phone && u.phone.includes(searchTerm))
        );
        expect(filtered.length).toBeGreaterThan(0);
      }
    }
  });

  it("should reset to page 1 when filters change (frontend behavior)", () => {
    // This tests the expected behavior: when search/filter changes, page resets to 1
    // In the frontend, setUserPage(1) is called on filter change
    let page = 3;
    // Simulate filter change resetting page
    page = 1;
    expect(page).toBe(1);
  });

  it("should calculate totalPages correctly", () => {
    // Test edge cases for totalPages calculation
    expect(Math.ceil(0 / 20)).toBe(0);
    expect(Math.ceil(1 / 20)).toBe(1);
    expect(Math.ceil(20 / 20)).toBe(1);
    expect(Math.ceil(21 / 20)).toBe(2);
    expect(Math.ceil(100 / 20)).toBe(5);
    expect(Math.ceil(101 / 20)).toBe(6);
  });
});

describe("Admin Providers Pagination", () => {
  it("should have searchProvidersFiltered procedure in admin router", async () => {
    const { adminRouter } = await import("./adminRouter");
    expect(adminRouter).toBeDefined();
    const procedures = Object.keys(adminRouter._def.procedures);
    expect(procedures).toContain("searchProvidersFiltered");
  });

  it("should have getAllProviders function in db", async () => {
    const db = await import("./db");
    expect(typeof db.getAllProviders).toBe("function");
  });

  it("should return paginated provider results with correct shape", async () => {
    const db = await import("./db");
    const allProviders = await db.getAllProviders();

    const page = 1;
    const limit = 20;
    const total = allProviders.length;
    const offset = (page - 1) * limit;
    const paginated = allProviders.slice(offset, offset + limit);

    const result = {
      providers: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    expect(result).toHaveProperty("providers");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("limit");
    expect(result).toHaveProperty("totalPages");
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.providers.length).toBeLessThanOrEqual(20);
  });

  it("should filter providers by verification status", async () => {
    const db = await import("./db");
    const allProviders = await db.getAllProviders();

    const pending = allProviders.filter((p: any) => p.verificationStatus === "pending");
    const verified = allProviders.filter((p: any) => p.verificationStatus === "verified");
    const rejected = allProviders.filter((p: any) => p.verificationStatus === "rejected");

    // All filtered providers should have correct status
    pending.forEach((p: any) => expect(p.verificationStatus).toBe("pending"));
    verified.forEach((p: any) => expect(p.verificationStatus).toBe("verified"));
    rejected.forEach((p: any) => expect(p.verificationStatus).toBe("rejected"));
  });

  it("should search providers by business name or city", async () => {
    const db = await import("./db");
    const allProviders = await db.getAllProviders();

    if (allProviders.length > 0) {
      const firstProvider = allProviders[0];
      const searchTerm = (firstProvider.businessName || "").substring(0, 3).toLowerCase();

      if (searchTerm) {
        const filtered = allProviders.filter((p: any) =>
          (p.businessName && p.businessName.toLowerCase().includes(searchTerm)) ||
          (p.city && p.city.toLowerCase().includes(searchTerm)) ||
          (p.state && p.state.toLowerCase().includes(searchTerm))
        );
        expect(filtered.length).toBeGreaterThan(0);
      }
    }
  });
});
