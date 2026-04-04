import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB module
vi.mock("./db", () => ({
  getPortfolioItems: vi.fn(),
  addPortfolioItem: vi.fn(),
  deletePortfolioItem: vi.fn(),
}));

import { getPortfolioItems, addPortfolioItem, deletePortfolioItem } from "./db";

describe("Portfolio DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getPortfolioItems returns items for a provider", async () => {
    const mockItems = [
      { id: 1, providerId: 10, imageUrl: "https://s3.example.com/photo1.jpg", categoryId: 7, title: "Haircut", sortOrder: 0 },
      { id: 2, providerId: 10, imageUrl: "https://s3.example.com/photo2.jpg", categoryId: 20, title: "DJ Setup", sortOrder: 1 },
    ];
    (getPortfolioItems as any).mockResolvedValue(mockItems);

    const result = await getPortfolioItems(10);
    expect(result).toHaveLength(2);
    expect(result[0].categoryId).toBe(7);
    expect(result[1].title).toBe("DJ Setup");
    expect(getPortfolioItems).toHaveBeenCalledWith(10);
  });

  it("getPortfolioItems returns empty array for provider with no portfolio", async () => {
    (getPortfolioItems as any).mockResolvedValue([]);

    const result = await getPortfolioItems(999);
    expect(result).toHaveLength(0);
  });

  it("addPortfolioItem creates a new item", async () => {
    const newItem = {
      providerId: 10,
      imageUrl: "https://s3.example.com/new-photo.jpg",
      categoryId: 15,
      title: "AV Setup",
      description: "Professional audio visual setup",
      sortOrder: 0,
    };
    (addPortfolioItem as any).mockResolvedValue({ id: 3, ...newItem });

    const result = await addPortfolioItem(newItem);
    expect(result.id).toBe(3);
    expect(result.title).toBe("AV Setup");
    expect(addPortfolioItem).toHaveBeenCalledWith(newItem);
  });

  it("addPortfolioItem works without optional fields", async () => {
    const minimalItem = {
      providerId: 10,
      imageUrl: "https://s3.example.com/photo.jpg",
      sortOrder: 0,
    };
    (addPortfolioItem as any).mockResolvedValue({ id: 4, ...minimalItem, categoryId: null, title: null, description: null });

    const result = await addPortfolioItem(minimalItem);
    expect(result.id).toBe(4);
    expect(result.categoryId).toBeNull();
    expect(result.title).toBeNull();
  });

  it("deletePortfolioItem removes an item", async () => {
    (deletePortfolioItem as any).mockResolvedValue(undefined);

    await deletePortfolioItem(3);
    expect(deletePortfolioItem).toHaveBeenCalledWith(3);
  });
});

describe("Category filter logic", () => {
  const mockProviders = [
    { id: 1, businessName: "Joe's Barber", city: "Atlanta", state: "GA", zipCode: "30301", averageRating: "4.5" },
    { id: 2, businessName: "Quick Clean", city: "New York", state: "NY", zipCode: "10001", averageRating: "3.2" },
    { id: 3, businessName: "Pro DJ", city: "Atlanta", state: "GA", zipCode: "30302", averageRating: "4.8" },
    { id: 4, businessName: "Budget Fix", city: "Chicago", state: "IL", zipCode: "60601", averageRating: "2.5" },
  ];

  const mockServices = [
    { id: 1, providerId: 1, name: "Haircut", basePrice: "25.00", hourlyRate: null, serviceType: "in_person", categoryId: 7 },
    { id: 2, providerId: 2, name: "Deep Clean", basePrice: "150.00", hourlyRate: null, serviceType: "mobile", categoryId: 188 },
    { id: 3, providerId: 3, name: "DJ Set", basePrice: "500.00", hourlyRate: null, serviceType: "in_person", categoryId: 20 },
    { id: 4, providerId: 1, name: "Beard Trim", basePrice: "15.00", hourlyRate: null, serviceType: "in_person", categoryId: 7 },
    { id: 5, providerId: 4, name: "Plumbing Fix", basePrice: null, hourlyRate: "45.00", serviceType: "mobile", categoryId: 9 },
  ];

  function filterProviders(
    services: typeof mockServices,
    providers: typeof mockProviders,
    locationFilter: string,
    minRating: number,
    maxPrice: number | null,
    serviceTypeFilter: string,
  ) {
    const map = new Map<number, { provider: any; services: any[] }>();
    for (const service of services) {
      if (maxPrice !== null) {
        const price = parseFloat(service.basePrice || service.hourlyRate || "0");
        if (price > maxPrice && price > 0) continue;
      }
      if (serviceTypeFilter !== "all" && service.serviceType !== serviceTypeFilter) continue;

      if (!map.has(service.providerId)) {
        const prov = providers.find((p) => p.id === service.providerId);
        if (prov) map.set(service.providerId, { provider: prov, services: [] });
      }
      map.get(service.providerId)?.services.push(service);
    }

    const filtered = new Map<number, { provider: any; services: any[] }>();
    for (const [id, entry] of Array.from(map.entries())) {
      const prov = entry.provider;
      if (locationFilter) {
        const loc = [prov.city, prov.state, prov.zipCode].filter(Boolean).join(" ").toLowerCase();
        if (!loc.includes(locationFilter.toLowerCase())) continue;
      }
      if (minRating > 0) {
        const rating = parseFloat(prov.averageRating || "0");
        if (rating < minRating) continue;
      }
      filtered.set(id, entry);
    }
    return filtered;
  }

  it("returns all providers when no filters applied", () => {
    const result = filterProviders(mockServices, mockProviders, "", 0, null, "all");
    expect(result.size).toBe(4);
  });

  it("filters by location (city)", () => {
    const result = filterProviders(mockServices, mockProviders, "Atlanta", 0, null, "all");
    expect(result.size).toBe(2);
    expect(result.has(1)).toBe(true); // Joe's Barber
    expect(result.has(3)).toBe(true); // Pro DJ
  });

  it("filters by location (state abbreviation)", () => {
    const result = filterProviders(mockServices, mockProviders, "NY", 0, null, "all");
    expect(result.size).toBe(1);
    expect(result.has(2)).toBe(true); // Quick Clean
  });

  it("filters by minimum rating", () => {
    const result = filterProviders(mockServices, mockProviders, "", 4, null, "all");
    expect(result.size).toBe(2);
    expect(result.has(1)).toBe(true); // 4.5
    expect(result.has(3)).toBe(true); // 4.8
  });

  it("filters by max price", () => {
    const result = filterProviders(mockServices, mockProviders, "", 0, 50, "all");
    // Joe's Barber ($25, $15), Budget Fix ($45/hr) — Quick Clean ($150) and Pro DJ ($500) excluded
    expect(result.size).toBe(2);
    expect(result.has(1)).toBe(true);
    expect(result.has(4)).toBe(true);
  });

  it("filters by service type", () => {
    const result = filterProviders(mockServices, mockProviders, "", 0, null, "mobile");
    expect(result.size).toBe(2);
    expect(result.has(2)).toBe(true); // Quick Clean (mobile)
    expect(result.has(4)).toBe(true); // Budget Fix (mobile)
  });

  it("combines location + rating filters", () => {
    const result = filterProviders(mockServices, mockProviders, "Atlanta", 4.5, null, "all");
    expect(result.size).toBe(2); // Joe's Barber (4.5) and Pro DJ (4.8) both in Atlanta
    expect(result.has(1)).toBe(true);
    expect(result.has(3)).toBe(true);
  });

  it("combines location + rating filters (both Atlanta providers)", () => {
    const result = filterProviders(mockServices, mockProviders, "Atlanta", 4, null, "all");
    expect(result.size).toBe(2);
  });

  it("returns empty when no matches", () => {
    const result = filterProviders(mockServices, mockProviders, "Los Angeles", 0, null, "all");
    expect(result.size).toBe(0);
  });

  it("location filter is case insensitive", () => {
    const result = filterProviders(mockServices, mockProviders, "atlanta", 0, null, "all");
    expect(result.size).toBe(2);
  });
});
