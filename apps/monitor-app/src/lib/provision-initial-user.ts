import { APIError } from "better-auth";
import { auth } from "@/lib/auth";
import { env } from "@/env";

export async function provisionInitialUser() {
  const initialEmail = env.INITIAL_USER_EMAIL;
  const initialPassword = env.INITIAL_USER_PASSWORD;
  const initialName = env.INITIAL_USER_NAME || "Initial User";

  try {
    await auth.api.createUser({
      body: {
        email: initialEmail,
        password: initialPassword,
        name: initialName,
        role: "admin",
      },
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.message?.includes("User already exists.")) return;
    console.error("Failed to seed default user:", error);
  }
}
