/**
 * Phase 3B — supplierService rewire integration test.
 *
 * Verifies:
 *   1. supplierService.list() (no search) routes through the dataClient
 *      adapter (so shadow mode actually fires when configured).
 *   2. supplierService.list() (with search) bypasses the adapter and uses
 *      the legacy Supabase OR-ilike path — preserving exact search
 *      behavior during the shadow window.
 *   3. supplierService.list() preserves the legacy `{ data, total }`
 *      response shape so no UI consumer breaks.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted, so any refs they capture must be hoisted too.
const { adapterListMock, adapterGetByIdMock } = vi.hoisted(() => ({
  adapterListMock: vi.fn(),
  adapterGetByIdMock: vi.fn(),
}));

vi.mock("@/lib/data/dataClient", () => ({
  dataClient: () => ({
    list: adapterListMock,
    getById: adapterGetByIdMock,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }),
}));

const {
  supabaseRangeMock,
  supabaseOrMock,
  supabaseEqMock,
  supabaseFromMock,
  supabaseGetUserMock,
} = vi.hoisted(() => {
  const supabaseRangeMock = vi.fn();
  const supabaseOrderMock = vi.fn(() => ({ range: supabaseRangeMock }));
  const supabaseOrMock = vi.fn(() => ({ order: supabaseOrderMock }));
  const supabaseEqMock = vi.fn(() => ({ or: supabaseOrMock }));
  const supabaseSelectMock = vi.fn(() => ({ eq: supabaseEqMock }));
  const supabaseFromMock = vi.fn(() => ({ select: supabaseSelectMock }));
  const supabaseGetUserMock = vi.fn(async () => ({ data: { user: null } }));
  return {
    supabaseRangeMock,
    supabaseOrMock,
    supabaseEqMock,
    supabaseFromMock,
    supabaseGetUserMock,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseFromMock,
    auth: { getUser: supabaseGetUserMock },
  },
}));

import { supplierService } from "@/services/supplierService";

beforeEach(() => {
  adapterListMock.mockReset();
  adapterGetByIdMock.mockReset();
  supabaseRangeMock.mockReset();
  supabaseOrMock.mockClear();
  supabaseEqMock.mockClear();
  supabaseFromMock.mockClear();
});

describe("Phase 3B — supplierService routes reads through dataClient", () => {
  it("empty-search list → uses dataClient adapter (shadow-eligible path)", async () => {
    adapterListMock.mockResolvedValueOnce({
      rows: [{ id: "s1", name: "Alpha" }],
      total: 1,
    });

    const result = await supplierService.list("dealer-1", "", 1);

    expect(adapterListMock).toHaveBeenCalledTimes(1);
    expect(adapterListMock).toHaveBeenCalledWith({
      dealerId: "dealer-1",
      page: 0, // 1-indexed UI → 0-indexed adapter
      pageSize: 25,
      orderBy: { column: "name", direction: "asc" },
    });

    // Legacy response shape preserved
    expect(result).toEqual({ data: [{ id: "s1", name: "Alpha" }], total: 1 });

    // Supabase direct path was NOT used
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it("search list → bypasses adapter, uses legacy Supabase OR-ilike path", async () => {
    supabaseRangeMock.mockResolvedValueOnce({
      data: [{ id: "s2", name: "Beta" }],
      error: null,
      count: 1,
    });

    const result = await supplierService.list("dealer-1", "bet", 2);

    // dataClient was bypassed
    expect(adapterListMock).not.toHaveBeenCalled();

    // Supabase direct path was used with correct dealer scope + range
    expect(supabaseFromMock).toHaveBeenCalledWith("suppliers");
    expect(supabaseEqMock).toHaveBeenCalledWith("dealer_id", "dealer-1");
    expect(supabaseOrMock).toHaveBeenCalledWith(
      "name.ilike.%bet%,contact_person.ilike.%bet%,phone.ilike.%bet%",
    );
    // page 2 → from=25, to=49
    expect(supabaseRangeMock).toHaveBeenCalledWith(25, 49);
    expect(result).toEqual({ data: [{ id: "s2", name: "Beta" }], total: 1 });
  });

  it("propagates adapter errors from list (no silent swallow on primary)", async () => {
    adapterListMock.mockRejectedValueOnce(new Error("network down"));
    await expect(supplierService.list("dealer-1", "", 1)).rejects.toThrow(
      "network down",
    );
  });
});
