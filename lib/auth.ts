import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const sessionCookieName = "roadwatch-demo-session";

export async function getSessionUser() {
  const session = (await cookies()).get(sessionCookieName)?.value;

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      id: session,
    },
    include: {
      ward: true,
    },
  });
}

export async function requireUser() {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("Sign in is required for this action.");
  }

  return user;
}

type AuthRole = "GOV" | "RESIDENT";

export function assertGovRole(user: { role: AuthRole }) {
  if (user.role !== "GOV") {
    throw new Error("Only government-labelled accounts can record repairs.");
  }
}

export function assertResidentRole(user: { role: AuthRole }) {
  if (user.role !== "RESIDENT") {
    throw new Error("Only resident accounts can collect or vote on violations.");
  }
}

export function assertWardScope(user: { wardId: string }, wardId: string) {
  if (user.wardId !== wardId) {
    throw new Error("This account cannot act outside its assigned ward.");
  }
}

export async function requireGovUser() {
  const user = await requireUser();

  assertGovRole(user);

  return user;
}

export async function requireResidentUser() {
  const user = await requireUser();

  assertResidentRole(user);

  return user;
}

export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionUser() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}
