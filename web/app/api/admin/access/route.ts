import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { adminContext } from "@/lib/admin/server";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return NextResponse.json({ admin: false }, { status: 200 });
  const access = await adminContext(auth.user.id);
  return NextResponse.json({ admin: access.allowed, roles: access.roles });
}

