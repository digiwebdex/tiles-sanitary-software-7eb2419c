/**
 * Phase 3A — Suppliers shadow-mode mismatch logging tests.
 *
 * Verifies:
 *   1. id-set mismatch is detected & recorded when primary/vps return
 *      different rows even with the same total count.
 *   2. field-level mismatch on getById is recorded (ignoring timestamps).
 *   3. shadow read failures are counted but never crash the primary read.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createShadowAdapter } from "@/lib/data/shadowAdapter";
import type { ResourceAdapter } from "@/lib/data/types";

interface Supplier {
  id: string;
  name: string;
  status: string;
  created_at?: string;
}

function makeAdapter(overrides: Partial<ResourceAdapter<Supplier>> = {}): ResourceAdapter<Supplier> {
  return {
    list: vi.fn(async () => ({ rows: [], total: 0 })),
    getById: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: "x", name: "x", status: "active" })),
    update: vi.fn(async () => ({ id: "x", name: "x", status: "active" })),
    remove: vi.fn(async () => undefined),
    ...overrides,
  };
}

beforeEach(() => {
  // Reset the global stats tracker between tests
  (window as any).__vpsShadowStats = {
    reads: 0,
    mismatches: 0,
    failures: 0,
    lastMismatch: null,
  };
});

describe("Phase 3A — Suppliers shadow adapter", () => {
  it("detects id-set mismatch even when totals match", async () => {
    const primary = makeAdapter({
      list: vi.fn(async () => ({
        rows: [
          { id: "s1", name: "Alpha", status: "active" },
          { id: "s2", name: "Beta", status: "active" },
        ],
        total: 2,
      })),
    });
    const shadow = makeAdapter({
      list: vi.fn(async () => ({
        rows: [
          { id: "s1", name: "Alpha", status: "active" },
          { id: "s3", name: "Gamma", status: "active" },
        ],
        total: 2,
      })),
    });

    const adapter = createShadowAdapter<Supplier>("SUPPLIERS", primary, shadow);
    const result = await adapter.list({ dealerId: "d1" });

    // Primary always wins
    expect(result.rows.map((r) => r.id)).toEqual(["s1", "s2"]);

    // Allow fire-and-forget shadow read to settle
    await new Promise((r) => setTimeout(r, 0));

    const stats = (window as any).__vpsShadowStats;
    expect(stats.reads).toBe(1);
    expect(stats.mismatches).toBeGreaterThan(0);
    expect(stats.lastMismatch?.op).toBe("list.idSet");
    expect(stats.lastMismatch?.detail).toMatchObject({
      missingInVps: ["s2"],
      extraInVps: ["s3"],
    });
  });

  it("detects per-field mismatch on getById and ignores timestamps", async () => {
    const primary = makeAdapter({
      getById: vi.fn(async () => ({
        id: "s1",
        name: "Alpha",
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
      })),
    });
    const shadow = makeAdapter({
      getById: vi.fn(async () => ({
        id: "s1",
        name: "Alpha-RENAMED",
        status: "active",
        created_at: "2024-06-01T00:00:00Z", // different but ignored
      })),
    });

    const adapter = createShadowAdapter<Supplier>("SUPPLIERS", primary, shadow);
    const result = await adapter.getById("s1", "d1");
    expect(result?.name).toBe("Alpha");

    await new Promise((r) => setTimeout(r, 0));
    const stats = (window as any).__vpsShadowStats;
    expect(stats.lastMismatch?.op).toBe("getById.fields");
    expect((stats.lastMismatch?.detail as any).fields).toEqual(["name"]);
  });

  it("counts shadow failures without breaking primary read", async () => {
    const primary = makeAdapter({
      list: vi.fn(async () => ({
        rows: [{ id: "s1", name: "Alpha", status: "active" }],
        total: 1,
      })),
    });
    const shadow = makeAdapter({
      list: vi.fn(async () => {
        throw new Error("VPS endpoint down");
      }),
    });

    const adapter = createShadowAdapter<Supplier>("SUPPLIERS", primary, shadow);
    const result = await adapter.list({ dealerId: "d1" });
    expect(result.rows).toHaveLength(1);

    await new Promise((r) => setTimeout(r, 0));
    const stats = (window as any).__vpsShadowStats;
    expect(stats.failures).toBe(1);
    expect(stats.reads).toBe(1);
  });
});
