import { useState } from "react";

import { leadsApiBase } from "@/lib/leads-api";

export function LeadsLogin({
  error,
  onSubmit,
}: {
  error: string;
  onSubmit: (token: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        const token = value.trim();
        if (token) onSubmit(token);
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">SuperChoice</p>
      <h1 className="mt-3 font-serif text-4xl">เข้าสู่ระบบ</h1>
      <p className="mt-3 text-muted-foreground">
        ใส่ LEADS_API_TOKEN โทเค็นอยู่แค่ในแท็บนี้ และไม่ได้ถูกใส่ไว้ในตัวเว็บ
      </p>
      <label className="mt-6 block text-sm" htmlFor="leads-token">
        โทเค็น
      </label>
      <input
        id="leads-token"
        name="token"
        type="password"
        autoComplete="current-password"
        spellCheck={false}
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-border bg-background px-3"
      />
      <p className="mt-3 min-h-5 text-sm text-destructive" role="alert">
        {error}
      </p>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-primary px-5 text-sm text-primary-foreground"
      >
        เข้าสู่ระบบ
      </button>
      <p className="mt-4 text-xs text-muted-foreground">API {leadsApiBase()}</p>
    </form>
  );
}
