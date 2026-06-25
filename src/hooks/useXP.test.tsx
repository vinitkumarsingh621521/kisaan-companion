import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mocks must be declared before importing the hook under test.
const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false, signOut: vi.fn() }),
}));

import { useXP } from "./useXP";

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
});

describe("useXP", () => {
  it("loads XP from bump_streak rpc", async () => {
    rpc.mockResolvedValue({
      data: { xp: 120, level: 2, streak_days: 3, last_active_date: "2026-06-25" },
    });

    const { result } = renderHook(() => useXP());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(rpc).toHaveBeenCalledWith("bump_streak");
    expect(result.current.data).toEqual({
      xp: 120,
      level: 2,
      streak_days: 3,
      last_active_date: "2026-06-25",
    });
  });

  it("falls back to user_xp select when rpc returns nothing", async () => {
    rpc.mockResolvedValue({ data: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { xp: 10, level: 1, streak_days: 1, last_active_date: null },
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    const { result } = renderHook(() => useXP());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(from).toHaveBeenCalledWith("user_xp");
    expect(result.current.data?.xp).toBe(10);
  });
});
