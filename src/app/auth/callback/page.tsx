"use client";

import { useEffect, useRef } from "react";
import { completeAuthSession } from "@/lib/auth-actions";

export default function AuthCallbackPage() {
  const submitted = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (submitted.current) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = params.get("expires_in");
    if (params.get("error") || !accessToken || !refreshToken || !expiresIn) {
      window.location.replace("/login?authError=expired");
      return;
    }
    submitted.current = true;
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("accessToken") as HTMLInputElement).value = accessToken;
    (form.elements.namedItem("refreshToken") as HTMLInputElement).value = refreshToken;
    (form.elements.namedItem("expiresIn") as HTMLInputElement).value = expiresIn;
    form.requestSubmit();
  }, []);

  return <main className="authShell">
    <section className="panel authCard">
      <p className="eyebrow">WORKDAY</p>
      <h1>Confirming your account…</h1>
      <form ref={formRef} action={completeAuthSession}>
        <input type="hidden" name="accessToken"/>
        <input type="hidden" name="refreshToken"/>
        <input type="hidden" name="expiresIn"/>
      </form>
    </section>
  </main>;
}
