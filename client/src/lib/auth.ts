import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { db } from "@/lib/mongodb";

const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET || "development-only-secret-change-before-deploy-32chars",
  database: mongodbAdapter(db),
  trustedOrigins: [baseURL, "http://localhost:3000"],
  emailAndPassword: { enabled: true, minPasswordLength: 6, requireEmailVerification: false },
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
    google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
  } : {},
  plugins: [jwt({
    jwt: {
      definePayload: ({ user }) => ({
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.name,
      }),
    },
  })],
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
});
