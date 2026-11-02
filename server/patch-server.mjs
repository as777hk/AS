import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
const files = new Map([
  ["src/app.ts", `import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import studiosRouter from "./routes/studios.js";
import bookingsRouter from "./routes/bookings.js";
import wishlistRouter from "./routes/wishlist.js";
import newsletterRouter from "./routes/newsletter.js";
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || "http://localhost:3000").split(",").map((x) => x.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: "draft-7", legacyHeaders: false }));
app.get("/health", (_req, res) => res.json({ status: "ok", service: "studiospace-api", time: new Date().toISOString() }));
app.use("/api/studios", studiosRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/newsletter", newsletterRouter);
app.use((_req, res) => res.status(404).json({ message: "API route not found." }));
app.use((error, _req, res, _next) => { console.error("API error:", error instanceof Error ? error.message : "Unknown error"); res.status(500).json({ message: "The server could not complete this request." }); });
export default app;
`],
  ["src/index.ts", `import "dotenv/config";
import app from "./app.js";
if (process.env.VERCEL !== "1") { const port = Number(process.env.PORT || 4000); app.listen(port, "0.0.0.0", () => console.log(`StudioSpace API listening on ${port}`)); }
export default app;
`],
  ["api/[...path].ts", `import app from "../src/app.js";
export default app;
`],
]);
for (const [path, content] of files) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }
console.log("Express app split and Vercel catch-all adapter generated.");
