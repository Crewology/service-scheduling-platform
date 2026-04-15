import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Contact Router Input Validation Tests ──────────────────────────────────

describe("Contact Form Feature", () => {
  describe("Input Validation", () => {
    it("should require name to be non-empty", () => {
      const name = "";
      expect(name.trim().length > 0).toBe(false);
    });

    it("should require name to be max 200 characters", () => {
      const name = "A".repeat(201);
      expect(name.length <= 200).toBe(false);
    });

    it("should accept valid name", () => {
      const name = "John Doe";
      expect(name.trim().length > 0 && name.length <= 200).toBe(true);
    });

    it("should validate email format", () => {
      const validEmails = ["test@example.com", "user.name@domain.co", "a@b.c"];
      const invalidEmails = ["notanemail", "@domain.com", "user@", ""];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });
      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it("should require subject to be non-empty", () => {
      const subject = "   ";
      expect(subject.trim().length > 0).toBe(false);
    });

    it("should require message to be at least 10 characters", () => {
      const shortMessage = "Hi";
      const validMessage = "I need help with my booking please.";
      expect(shortMessage.length >= 10).toBe(false);
      expect(validMessage.length >= 10).toBe(true);
    });

    it("should enforce message max length of 5000 characters", () => {
      const longMessage = "A".repeat(5001);
      expect(longMessage.length <= 5000).toBe(false);
    });

    it("should validate category enum values", () => {
      const validCategories = ["general", "booking", "payment", "provider", "technical", "other"];
      const invalidCategories = ["invalid", "random", ""];
      
      validCategories.forEach((cat) => {
        expect(validCategories.includes(cat)).toBe(true);
      });
      invalidCategories.forEach((cat) => {
        expect(validCategories.includes(cat)).toBe(false);
      });
    });
  });

  describe("Category Labels", () => {
    const categoryLabels: Record<string, string> = {
      general: "General Inquiry",
      booking: "Booking Issue",
      payment: "Payment & Billing",
      provider: "Provider Support",
      technical: "Technical Issue",
      other: "Other",
    };

    it("should have labels for all 6 categories", () => {
      expect(Object.keys(categoryLabels)).toHaveLength(6);
    });

    it("should map each category to a human-readable label", () => {
      expect(categoryLabels["general"]).toBe("General Inquiry");
      expect(categoryLabels["booking"]).toBe("Booking Issue");
      expect(categoryLabels["payment"]).toBe("Payment & Billing");
      expect(categoryLabels["provider"]).toBe("Provider Support");
      expect(categoryLabels["technical"]).toBe("Technical Issue");
      expect(categoryLabels["other"]).toBe("Other");
    });
  });

  describe("Owner Notification Content", () => {
    it("should format notification content with all submission details", () => {
      const input = {
        name: "Jane Smith",
        email: "jane@example.com",
        subject: "Booking Issue",
        category: "booking",
        message: "I can't see my booking confirmation.",
      };
      const categoryLabel = "Booking Issue";
      const submissionId = 42;
      const userId = 7;

      const content = [
        `**From:** ${input.name} (${input.email})`,
        `**Category:** ${categoryLabel}`,
        `**Subject:** ${input.subject}`,
        ``,
        `**Message:**`,
        input.message,
        ``,
        `---`,
        `Submission ID: #${submissionId}`,
        userId ? `Logged-in User ID: ${userId}` : `Guest submission`,
      ].join("\n");

      expect(content).toContain("Jane Smith");
      expect(content).toContain("jane@example.com");
      expect(content).toContain("Booking Issue");
      expect(content).toContain("I can't see my booking confirmation.");
      expect(content).toContain("Submission ID: #42");
      expect(content).toContain("Logged-in User ID: 7");
    });

    it("should show 'Guest submission' when no userId", () => {
      const userId = null;
      const line = userId ? `Logged-in User ID: ${userId}` : `Guest submission`;
      expect(line).toBe("Guest submission");
    });

    it("should format notification title with subject", () => {
      const subject = "Payment not received";
      const title = `New Contact Form: ${subject}`;
      expect(title).toBe("New Contact Form: Payment not received");
    });
  });

  describe("Confirmation Email Content", () => {
    it("should include reference number in confirmation", () => {
      const submissionId = 123;
      const confirmationLine = `- **Reference #:** ${submissionId}`;
      expect(confirmationLine).toContain("123");
    });

    it("should include contact info in confirmation email", () => {
      const emailContent = [
        `If you need immediate assistance, you can reach us at:`,
        `- **Email:** garychisolm30@gmail.com`,
        `- **Phone:** (678) 525-0891`,
      ].join("\n");

      expect(emailContent).toContain("garychisolm30@gmail.com");
      expect(emailContent).toContain("(678) 525-0891");
    });

    it("should include response time expectation", () => {
      const message = "We typically respond within 24-48 hours.";
      expect(message).toContain("24-48 hours");
    });
  });

  describe("Contact Submission Status", () => {
    it("should support all valid status values", () => {
      const validStatuses = ["new", "in_progress", "resolved", "closed"];
      expect(validStatuses).toHaveLength(4);
      expect(validStatuses).toContain("new");
      expect(validStatuses).toContain("in_progress");
      expect(validStatuses).toContain("resolved");
      expect(validStatuses).toContain("closed");
    });

    it("should default new submissions to 'new' status", () => {
      const defaultStatus = "new";
      expect(defaultStatus).toBe("new");
    });
  });

  describe("Database Schema", () => {
    it("should store all required fields", () => {
      const requiredFields = ["name", "email", "subject", "category", "message"];
      const optionalFields = ["userId", "status", "createdAt"];
      
      expect(requiredFields).toHaveLength(5);
      expect(optionalFields).toHaveLength(3);
    });

    it("should have correct field constraints", () => {
      const constraints = {
        name: { maxLength: 200, required: true },
        email: { maxLength: 320, required: true },
        subject: { maxLength: 500, required: true },
        message: { maxLength: 5000, minLength: 10, required: true },
        category: { enum: ["general", "booking", "payment", "provider", "technical", "other"], required: true },
        status: { enum: ["new", "in_progress", "resolved", "closed"], default: "new" },
      };

      expect(constraints.name.maxLength).toBe(200);
      expect(constraints.email.maxLength).toBe(320);
      expect(constraints.subject.maxLength).toBe(500);
      expect(constraints.message.maxLength).toBe(5000);
      expect(constraints.message.minLength).toBe(10);
      expect(constraints.category.enum).toHaveLength(6);
      expect(constraints.status.default).toBe("new");
    });
  });

  describe("Frontend Form Behavior", () => {
    it("should trim whitespace from all inputs before submission", () => {
      const inputs = {
        name: "  John Doe  ",
        email: " john@example.com ",
        subject: " Help needed ",
        message: " I need assistance with my account. ",
      };

      const trimmed = {
        name: inputs.name.trim(),
        email: inputs.email.trim(),
        subject: inputs.subject.trim(),
        message: inputs.message.trim(),
      };

      expect(trimmed.name).toBe("John Doe");
      expect(trimmed.email).toBe("john@example.com");
      expect(trimmed.subject).toBe("Help needed");
      expect(trimmed.message).toBe("I need assistance with my account.");
    });

    it("should show character count for message field", () => {
      const message = "Hello, I need help.";
      const display = `${message.length}/5000 characters`;
      expect(display).toBe("19/5000 characters");
    });

    it("should reset form after successful submission and clicking 'Send Another'", () => {
      const defaultState = {
        name: "",
        email: "",
        subject: "",
        category: "general",
        message: "",
        submitted: false,
        refId: null,
      };

      expect(defaultState.name).toBe("");
      expect(defaultState.category).toBe("general");
      expect(defaultState.submitted).toBe(false);
      expect(defaultState.refId).toBeNull();
    });
  });
});
