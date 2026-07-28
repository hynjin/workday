import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { importLocalBundle } from "@/lib/local-import";
import { getOptionalUser } from "@/lib/auth";

export async function POST(request: Request) {
  if (!await getOptionalUser()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) return NextResponse.json({ error: "Import is too large." }, { status: 413 });
  try {
    return NextResponse.json(await importLocalBundle(await request.json()));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Local data validation failed.", issues: error.issues.length }, { status: 400 });
    return NextResponse.json({ error: "Backup failed. No partial data was committed." }, { status: 500 });
  }
}
