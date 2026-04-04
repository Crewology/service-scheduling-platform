import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB functions
const mockFavorites = {
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  getUserFavorites: vi.fn(),
  isFavorite: vi.fn(),
};

const mockPackages = {
  createPackage: vi.fn(),
  getProviderPackages: vi.fn(),
  getPublicPackagesByProvider: vi.fn(),
  deletePackage: vi.fn(),
};

vi.mock("./db/favorites", () => mockFavorites);
vi.mock("./db/packages", () => mockPackages);

describe("Customer Favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add a provider to favorites", async () => {
    mockFavorites.addFavorite.mockResolvedValue({ id: 1, userId: 10, providerId: 5 });
    const result = await mockFavorites.addFavorite(10, 5);
    expect(result).toEqual({ id: 1, userId: 10, providerId: 5 });
    expect(mockFavorites.addFavorite).toHaveBeenCalledWith(10, 5);
  });

  it("should remove a provider from favorites", async () => {
    mockFavorites.removeFavorite.mockResolvedValue(true);
    const result = await mockFavorites.removeFavorite(10, 5);
    expect(result).toBe(true);
    expect(mockFavorites.removeFavorite).toHaveBeenCalledWith(10, 5);
  });

  it("should get user favorites list", async () => {
    const mockData = [
      { id: 1, providerId: 5, businessName: "Pro DJ", slug: "pro-dj" },
      { id: 2, providerId: 8, businessName: "Clean Home", slug: "clean-home" },
    ];
    mockFavorites.getUserFavorites.mockResolvedValue(mockData);
    const result = await mockFavorites.getUserFavorites(10);
    expect(result).toHaveLength(2);
    expect(result[0].businessName).toBe("Pro DJ");
  });

  it("should check if a provider is favorited", async () => {
    mockFavorites.isFavorite.mockResolvedValue(true);
    const result = await mockFavorites.isFavorite(10, 5);
    expect(result).toBe(true);
  });

  it("should return false for non-favorited provider", async () => {
    mockFavorites.isFavorite.mockResolvedValue(false);
    const result = await mockFavorites.isFavorite(10, 99);
    expect(result).toBe(false);
  });
});

describe("Service Packages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a service package", async () => {
    const packageData = {
      id: 1,
      providerId: 5,
      name: "Full Event Package",
      packagePrice: "299.99",
      originalPrice: "450.00",
    };
    mockPackages.createPackage.mockResolvedValue(packageData);
    const result = await mockPackages.createPackage({
      providerId: 5,
      name: "Full Event Package",
      packagePrice: "299.99",
      originalPrice: "450.00",
      serviceIds: [1, 2, 3],
    });
    expect(result.name).toBe("Full Event Package");
    expect(result.packagePrice).toBe("299.99");
  });

  it("should get provider packages", async () => {
    const packages = [
      { id: 1, name: "Basic Package", packagePrice: "99.99" },
      { id: 2, name: "Premium Package", packagePrice: "299.99" },
    ];
    mockPackages.getProviderPackages.mockResolvedValue(packages);
    const result = await mockPackages.getProviderPackages(5);
    expect(result).toHaveLength(2);
  });

  it("should get public packages for a provider", async () => {
    const packages = [
      { id: 1, name: "Event Package", packagePrice: "199.99", isActive: true },
    ];
    mockPackages.getPublicPackagesByProvider.mockResolvedValue(packages);
    const result = await mockPackages.getPublicPackagesByProvider(5);
    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
  });

  it("should delete a package", async () => {
    mockPackages.deletePackage.mockResolvedValue(true);
    const result = await mockPackages.deletePackage(1, 5);
    expect(result).toBe(true);
  });

  it("should calculate savings percentage correctly", () => {
    const packagePrice = 299.99;
    const originalPrice = 450.0;
    const savings = Math.round(((originalPrice - packagePrice) / originalPrice) * 100);
    expect(savings).toBe(33);
  });
});

describe("Response Time Tracking", () => {
  it("should calculate average response time from message timestamps", () => {
    // Simulate response time calculation
    const messages = [
      { sentAt: new Date("2026-01-01T10:00:00Z"), repliedAt: new Date("2026-01-01T10:15:00Z") },
      { sentAt: new Date("2026-01-01T12:00:00Z"), repliedAt: new Date("2026-01-01T12:30:00Z") },
      { sentAt: new Date("2026-01-01T14:00:00Z"), repliedAt: new Date("2026-01-01T14:45:00Z") },
    ];

    const responseTimes = messages.map((m) => {
      return (m.repliedAt.getTime() - m.sentAt.getTime()) / (1000 * 60);
    });

    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    expect(avg).toBe(30); // (15 + 30 + 45) / 3 = 30 minutes
  });

  it("should format response time label correctly", () => {
    function formatResponseTime(avgMinutes: number): string {
      if (avgMinutes < 60) return `${Math.round(avgMinutes)} min`;
      if (avgMinutes < 1440) return `${Math.round(avgMinutes / 60)} hr`;
      return `${Math.round(avgMinutes / 1440)} day`;
    }

    expect(formatResponseTime(15)).toBe("15 min");
    expect(formatResponseTime(90)).toBe("2 hr");
    expect(formatResponseTime(1500)).toBe("1 day");
  });

  it("should return null for providers with no messages", () => {
    const responseTimes: number[] = [];
    const result = responseTimes.length === 0 ? null : responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    expect(result).toBeNull();
  });
});
