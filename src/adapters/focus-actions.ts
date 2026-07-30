"use server";

import { endFocus } from "@/lib/actions";

export async function endProductFocus(formData:FormData) {
  return endFocus(formData);
}
