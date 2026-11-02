import { readFileSync, writeFileSync } from "node:fs";
const path = "src/lib/auth.ts";
const source = readFileSync(path, "utf8");
const patched = source.replace(/\s*sessionCookieCache:\s*true,\s*/g, "\n    ");
writeFileSync(path, patched);
if (patched.includes("sessionCookieCache: true")) throw new Error("Better Auth JWT sessionCookieCache setting was not removed.");
console.log("Better Auth JWT plugin configuration verified.");
