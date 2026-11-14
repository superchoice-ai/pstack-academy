import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LeadsLogin } from "@/components/leads/login";
import {
  DEFAULT_LEADS_API_BASE,
  LeadsError,
  formatRate,
  leadsApiBase,
  leadsErrorText,
  leadsFetch,
} from "@/lib/leads-api";

describe("leads API base", () => {
  it("falls back to the leads worker and strips a trailing slash", () => {
    vi.stubEnv("VITE_LEADS_API_BASE", "");
    expect(leadsApiBase()).toBe(DEFAULT_LEADS_API_BASE);
    vi.stubEnv("VITE_LEADS_API_BASE", "http://127.0.0.1:8790/");
    expect(leadsApiBase()).toBe("http://127.0.0.1:8790");
    vi.unstubAllEnvs();
  });

  it("sends the typed token and surfaces an unauthorized API", async () => {
    vi.stubEnv("VITE_LEADS_API_BASE", "https://leads.example");
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );
    await expect(leadsFetch("typed-by-user", "/api/stats", {}, fetchImpl)).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer typed-by-user");
    expect(leadsErrorText(new LeadsError(401, "unauthorized"))).toBe("โทเค็นไม่ถูกต้อง");
    expect(formatRate(0.2857)).toBe("28.6%");
    expect(formatRate(null)).toBe("—");
    vi.unstubAllEnvs();
  });
});

describe("leads login", () => {
  it("asks for a token and does not submit an empty value", async () => {
    const onSubmit = vi.fn();
    render(<LeadsLogin error="" onSubmit={onSubmit} />);
    const input = screen.getByLabelText("โทเค็น");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("");
    const form = input.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "  from-the-operator  " } });
    fireEvent.submit(form as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledWith("from-the-operator");
  });
});
