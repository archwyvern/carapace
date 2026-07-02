import { describe, expect, it } from "vitest";
import { timeAgo } from "./RelativeTime";

describe("timeAgo", () => {
  const t0 = 1_750_000_000_000;
  it("buckets ages into human units", () => {
    expect(timeAgo(t0, t0 + 2_000)).toBe("just now");
    expect(timeAgo(t0, t0 + 12_000)).toBe("12s ago");
    expect(timeAgo(t0, t0 + 3 * 60_000)).toBe("3m ago");
    expect(timeAgo(t0, t0 + 2 * 3_600_000)).toBe("2h ago");
    expect(timeAgo(t0, t0 + 5 * 86_400_000)).toBe("5d ago");
  });
  it("clamps future stamps to just now", () => {
    expect(timeAgo(t0 + 10_000, t0)).toBe("just now");
  });
});
