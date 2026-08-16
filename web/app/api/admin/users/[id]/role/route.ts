import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { adminContext } from "@/lib/admin/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;

  const admin = await adminContext(auth.user.id);
  if (!admin.allowed || !admin.service) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const s = admin.service;
  const targetUserId = params.id;

  const body = await request.json().catch(() => ({}));
  const newRole = body.role; // "system_admin" | "user"

  if (newRole !== "system_admin" && newRole !== "user") {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  // Check target user's current roles
  const { data: targetRoles } = await s.from("user_roles").select("role_id").eq("user_id", targetUserId);
  const currentRoles = (targetRoles || []).map((r: any) => String(r.role_id));

  // STRICT PROTECTION: Super Admin (system_owner) can NEVER be modified or touched by any admin!
  if (currentRoles.includes("system_owner")) {
    return NextResponse.json(
      { error: "super_admin_protected", message: "לא ניתן לשנות את תפקידו של מנהל העל (Super Admin)." },
      { status: 403 }
    );
  }

  if (newRole === "system_admin") {
    const { error } = await s.from("user_roles").upsert(
      { user_id: targetUserId, role_id: "system_admin" },
      { onConflict: "user_id,role_id" }
    );
    if (error) return NextResponse.json({ error: "role_update_failed" }, { status: 500 });
  } else if (newRole === "user") {
    const { error } = await s.from("user_roles").delete().eq("user_id", targetUserId).eq("role_id", "system_admin");
    if (error) return NextResponse.json({ error: "role_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role: newRole });
}
