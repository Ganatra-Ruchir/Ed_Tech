import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, roleHome } from "@/lib/auth";
import { checkLoginLockout, recordLoginFailure, clearLoginFailures } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const lockedForSeconds = checkLoginLockout(email);
  if (lockedForSeconds !== null) {
    const minutes = Math.ceil(lockedForSeconds / 60);
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    recordLoginFailure(email);
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordLoginFailure(email);
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  clearLoginFailures(email);

  await setSessionCookie({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isCC: user.isCC,
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, isCC: user.isCC },
    redirectTo: roleHome(user.role),
  });
}
