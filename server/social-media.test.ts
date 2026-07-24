import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Join OlogyCrew today! Book top-rated professionals. #services #booking" } }],
  }),
}));

// Mock the db connection
vi.mock("./db/connection", () => ({
  requireDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      { id: 1, name: "BARBER SHOP", isActive: true },
      { id: 2, name: "DJ & MUSIC SERVICES", isActive: true },
    ]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
  }),
}));

// Mock env
vi.mock("./_core/env", () => ({
  ENV: {
    facebookPageAccessToken: "",
    facebookPageId: "",
    instagramBusinessAccountId: "",
    linkedinAccessToken: "",
    linkedinOrganizationId: "",
  },
}));

describe("Social Media Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generateSocialPost returns content and metadata", async () => {
    const { generateSocialPost } = await import("./socialMedia");
    const result = await generateSocialPost();
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("postType");
    expect(result.content).toBeTruthy();
    expect(["provider_recruitment", "customer_attraction", "category_spotlight"]).toContain(result.postType);
  });

  it("previewSocialPost returns preview without publishing", async () => {
    const { previewSocialPost } = await import("./socialMedia");
    const result = await previewSocialPost();
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("postType");
    expect(result.content).toBeTruthy();
  });

  it("publishSocialPost gracefully handles missing credentials", async () => {
    const { publishSocialPost } = await import("./socialMedia");
    const result = await publishSocialPost();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("results");
    expect(result.results).toHaveLength(3);
    // All should fail gracefully since no credentials are set
    result.results.forEach((r) => {
      expect(r.success).toBe(false);
      expect(r.error).toContain("not configured");
    });
  });

  it("publishSocialPost returns platform-specific results", async () => {
    const { publishSocialPost } = await import("./socialMedia");
    const result = await publishSocialPost();
    const platforms = result.results.map((r) => r.platform);
    expect(platforms).toContain("facebook");
    expect(platforms).toContain("instagram");
    expect(platforms).toContain("linkedin");
  });
});
