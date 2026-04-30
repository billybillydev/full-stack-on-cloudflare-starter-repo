import { getDb } from "@/db/database";
import {
  account,
  session,
  user,
  verification,
} from "@/drizzle-out/auth-schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

let auth: ReturnType<typeof betterAuth>;

export function createBetterAuth(
  database: NonNullable<Parameters<typeof betterAuth>[0]>["database"],
  google?: { clientId: string; clientSecret: string },
): ReturnType<typeof betterAuth> {
  auth = betterAuth({
    database,
    emailAndPassword: { enabled: true },
    socialProviders: {
      google: {
        clientId: google?.clientId ?? "",
        clientSecret: google?.clientSecret ?? "",
      },
    },
  });
  return auth;
}

export function getAuth(google: {
  clientId: string;
  clientSecret: string;
}): ReturnType<typeof betterAuth> {
  if (auth) {
    return auth;
  }
  auth = createBetterAuth(
    drizzleAdapter(getDb, {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    google,
  );
  return auth;
}
