import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createContactSubmission: vi.fn(async () => ({ id: 47 })),
  getContactSubmissionById: vi.fn(async () => ({
    id: 47, userId: null, email: "guest@example.com", name: "Guest", subject: "Help", status: "new",
  })),
  createContactReply: vi.fn(async () => ({ id: 51 })),
  updateContactSubmissionStatus: vi.fn(async () => undefined),
}));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));
vi.mock("./notifications", () => ({ sendNotification: vi.fn(async () => true) }));

import * as db from "./db";
import { sendNotification } from "./notifications";
import { contactRouter } from "./contactRouter";
import { getTemplate } from "./notifications/templates";

const guest = { user: null, req: {}, res: {} } as TrpcContext;
const admin = { user: { id: 99, role: "admin" }, req: {}, res: {} } as TrpcContext;
const submission = {
  name: "Guest", email: "guest@example.com", subject: "Need help",
  category: "booking" as const, message: "How do I find my booking?",
};

beforeEach(() => vi.clearAllMocks());

describe("Help Center support contact", () => {
  it("stores a guest message and acknowledges it as support, not a booking", async () => {
    const result = await contactRouter.createCaller(guest).submit(submission);
    expect(result).toEqual({ success: true, id: 47 });
    expect(db.createContactSubmission).toHaveBeenCalledWith({ ...submission, userId: undefined });
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: "contact_received", channel: "email", recipient: expect.objectContaining({ email: submission.email }),
      data: { referenceId: 47 },
    }));
  });

  it("does not issue a notification or database insert for invalid form input", async () => {
    await expect(contactRouter.createCaller(guest).submit({ ...submission, message: "short" })).rejects.toThrow();
    expect(db.createContactSubmission).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sends an admin reply with a support subject and retains its delivery flag", async () => {
    const result = await contactRouter.createCaller(admin).reply({ submissionId: 47, message: "We can help you find it." });
    expect(result).toMatchObject({ success: true, id: 51, emailSent: true });
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: "contact_reply", channel: "email", data: { referenceId: 47, message: "We can help you find it." },
    }));
    expect(db.createContactReply).toHaveBeenCalledWith(expect.objectContaining({ emailSent: true, adminUserId: 99 }));
  });

  it("does not claim an admin email was delivered when its provider declined it", async () => {
    vi.mocked(sendNotification).mockResolvedValueOnce(false);
    const result = await contactRouter.createCaller(admin).reply({ submissionId: 47, message: "Checking." });
    expect(result.emailSent).toBe(false);
    expect(db.createContactReply).toHaveBeenCalledWith(expect.objectContaining({ emailSent: false }));
  });

  it("renders truthful support templates without booking details or personal addresses", () => {
    const received = getTemplate("contact_received", { referenceId: 47 });
    const replied = getTemplate("contact_reply", { referenceId: 47, message: "Please check your account." });
    expect(received.subject).toContain("Support received your message (#47)");
    expect(received.body).toContain("info@ologycrew.com");
    expect(replied.subject).toContain("Support reply (#47)");
    expect(replied.body).toContain("Please check your account.");
    for (const template of [received, replied]) {
      expect(template.subject).not.toMatch(/booking confirmed/i);
      expect(template.body).not.toContain("garychisolm30@gmail.com");
      expect(template.body).not.toContain("undefined");
    }
  });
});

describe("Help Center public navigation", () => {
  const root = resolve(import.meta.dirname, "..");
  const page = readFileSync(resolve(root, "client/src/pages/HelpCenter.tsx"), "utf8");
  const styles = readFileSync(resolve(root, "client/src/pages/HelpCenter.css"), "utf8");
  const metadata = readFileSync(resolve(root, "server/_core/vite.ts"), "utf8");

  it("keeps the public contact form, accessible search, FAQ and account shortcuts available", () => {
    expect(page).toContain("trpc.contact.submit.useMutation");
    expect(page).toContain('href="#contact"');
    expect(page).toContain('id="contact"');
    expect(page).toContain('id="help-search"');
    expect(page).toContain('aria-pressed={activeCategory === cat}');
    expect(page).toContain('<FAQAccordionItem key={item.question} item={item} />');
    expect(page).toContain('href: "/messages"');
    expect(page).not.toContain('label: "Messages", href: "/my-bookings"');
  });

  it("leads with real featured articles and lets visitors browse all five resource collections", () => {
    for (const title of ["How Bookings Work", "Provider Onboarding", "How Payments Work"]) {
      expect(page).toContain(`title: "${title}"`);
    }
    expect(page).toContain('featuredResources.map((resource, index)');
    expect(page).toContain('openResource(resource.sectionId, resource.title)');
    expect(page).toContain('guideSections.map((section) => <button');
    expect(page).toContain('aria-pressed={activeSectionId === section.id}');
    expect(page).toContain('<ResourceReader match={selectedResource} />');
    expect(page).toContain('match.article.content');
    expect(page).toContain('id="resource-library"');
    expect(page).toContain('id="help-resource-reader"');
    expect(page).toContain('hash === "contact" || hash === "faq"');
    expect(styles).toContain('.ology-help-featured-grid');
    expect(styles).toContain('.ology-help-collection-grid');
    expect(styles).toContain('.ology-help-library-grid');
  });

  it("removes unsupported referral/copy claims and only scopes its brand styles", () => {
    expect(page).toContain("net amount captured at award time");
    expect(page).not.toContain("both of you receive a reward");
    expect(page).not.toContain("48+ service categories");
    expect(page).not.toContain("Trust Score");
    for (const link of ['/provider/services', '/provider/quotes', '/provider/portfolio']) {
      expect(page).toContain(`link: "${link}"`);
    }
    expect(styles).toContain(".ology-help");
    expect(styles).toContain("prefers-reduced-motion");
    expect(metadata).toContain('content="https://ologycrew.com/help"');
    expect(metadata).toContain('OlogyCrew Help &amp; Resources');
    expect(page).toContain('`${OLOGYCREW_PUBLIC_ORIGIN}/help`');
    expect(readFileSync(resolve(root, "server/contactRouter.ts"), "utf8")).not.toContain("garychisolm30@gmail.com");
  });
});
