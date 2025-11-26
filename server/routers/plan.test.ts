import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe(
  "plan.generate",
  () => {
    it(
      "should return a valid plan response",
      async () => {
        const ctx = createPublicContext();
        const caller = appRouter.createCaller(ctx);

        const result = await caller.plan.generate({
          city: "Ho Chi Minh City",
          timeSlot: "morning",
          vibes: ["Chill"],
          interests: ["Coffee"],
          budget: "Medium",
          groupSize: "Couple",
        });

        expect(result).toBeDefined();
        expect(result.plan).toBeDefined();
        expect(Array.isArray(result.plan)).toBe(true);
        expect(result.notes).toBeDefined();
        expect(["gemini", "fallback", "sheet-empty"]).toContain(result.source);
      },
      { timeout: 30000 }
    );

    it(
      "should handle non-existent city gracefully",
      async () => {
        const ctx = createPublicContext();
        const caller = appRouter.createCaller(ctx);

        const result = await caller.plan.generate({
          city: "NonExistentCity",
          timeSlot: "morning",
          vibes: ["Chill"],
          interests: ["Coffee"],
        });

        expect(result.source).toBe("sheet-empty");
        expect(result.plan.length).toBe(0);
        expect(result.notes).toContain("chưa có địa điểm");
      },
      { timeout: 10000 }
    );

    it(
      "should accept optional budget and groupSize",
      async () => {
        const ctx = createPublicContext();
        const caller = appRouter.createCaller(ctx);

        const result = await caller.plan.generate({
          city: "Ho Chi Minh City",
          timeSlot: "afternoon",
          vibes: ["Active"],
          interests: ["Food"],
        });

        expect(result).toBeDefined();
        expect(result.plan).toBeDefined();
      },
      { timeout: 30000 }
    );

    it(
      "should return plan items with required fields when available",
      async () => {
        const ctx = createPublicContext();
        const caller = appRouter.createCaller(ctx);

        const result = await caller.plan.generate({
          city: "Ho Chi Minh City",
          timeSlot: "morning",
          vibes: ["Chill"],
          interests: ["Coffee"],
        });

        if (result.plan.length > 0) {
          result.plan.forEach((item) => {
            expect(item.time).toBeDefined();
            expect(typeof item.time).toBe("string");
            expect(item.place).toBeDefined();
            expect(typeof item.place).toBe("string");
            expect(item.area).toBeDefined();
            expect(typeof item.area).toBe("string");
            expect(item.note).toBeDefined();
            expect(typeof item.note).toBe("string");
          });
        }
      },
      { timeout: 30000 }
    );
  },
  { timeout: 60000 }
);
