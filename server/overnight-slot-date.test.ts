import { describe, expect, it } from "vitest";
import { generateTimeSlots } from "../shared/timeSlots";

describe("overnight slot calendar ownership", () => {
  it("keeps same-date evening starts but does not publish post-midnight starts under the prior date", () => {
    const slots = generateTimeSlots(
      "2026-09-18",
      60,
      [{ dayOfWeek: 5, startTime: "20:00", endTime: "02:00", isAvailable: true }],
      [],
      [],
      30,
    );

    expect(slots.some((slot) => slot.time === "23:00")).toBe(true);
    expect(slots.some((slot) => slot.time === "00:00")).toBe(false);
    expect(slots.every((slot) => !slot.isNextDay)).toBe(true);
  });
});
