import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Proxy is a thin, self-contained redirect layer for UX only. It must not be
// the sole authorization boundary: every route handler and server action
// independently re-checks the session and role (see src/lib/api-guard.ts).

const SESSION_COOKIE = "sp_session";

const ROLE_PREFIXES: Record<string, string> = {
  "/student": "STUDENT",
  "/faculty": "FACULTY",
  "/admin": "ADMIN",
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

async function readRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function roleHome(role: string): string {
  switch (role) {
    case "STUDENT":
      return "/student";
    case "FACULTY":
      return "/faculty";
    case "ADMIN":
      return "/admin";
    default:
      return "/login";
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await readRole(request);

  if (pathname === "/login") {
    if (role) {
      return NextResponse.redirect(new URL(roleHome(role), request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(role ? roleHome(role) : "/login", request.url),
    );
  }

  if (pathname === "/messages" || pathname.startsWith("/messages/")) {
    if (!role) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix),
  );
  if (matchedPrefix) {
    if (!role) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== ROLE_PREFIXES[matchedPrefix]) {
      return NextResponse.redirect(new URL(roleHome(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
