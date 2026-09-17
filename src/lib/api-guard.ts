import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";

export type GuardResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

export async function requireRole(...roles: Role[]): Promise<GuardResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }
  if (roles.length > 0 && !roles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
