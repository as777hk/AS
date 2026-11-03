"use client";
import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({ plugins: [jwtClient()] });
export async function syncAuthCookie() {
  const { data, error } = await authClient.token();
  if (error || !data?.token) throw new Error(error?.message || "Could not create secure API session.");
  const response = await fetch("/api/auth/cookie", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: data.token }) });
  if (!response.ok) throw new Error("Could not establish the secure API session.");
}
