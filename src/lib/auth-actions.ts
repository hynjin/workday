"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticateWithPassword, clearAuthSession, registerWithPassword, saveAuthSession } from "./auth";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function signIn(form: FormData) {
  const input = credentials.parse({ email: form.get("email"), password: form.get("password") });
  await saveAuthSession(await authenticateWithPassword(input.email, input.password));
  redirect("/");
}

export async function signUp(form: FormData) {
  const input = credentials.parse({ email: form.get("email"), password: form.get("password") });
  const session = await registerWithPassword(input.email, input.password);
  if (!session.access_token) redirect("/login?checkEmail=1");
  await saveAuthSession(session);
  redirect("/");
}

export async function signOut() {
  await clearAuthSession();
  redirect("/login");
}
