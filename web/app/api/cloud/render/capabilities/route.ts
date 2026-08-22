// מה שרת הייצוא המהיר שפרוס כרגע יודע לעשות. הלקוח קורא את זה פעם אחת לפני
// ייצוא כדי להחליט אם אפשר לרנדר בענן, במקום להניח — הנחה שגויה מייצרת וידאו
// "מוצלח" בלי כתוביות.

import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getWorkerCapabilities } from "@/lib/cloud/workerCapabilities.server";
import { NO_CAPABILITIES } from "@/lib/cloud/workerCapabilities";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return NextResponse.json({ capabilities: NO_CAPABILITIES, available: false });
  const capabilities = await getWorkerCapabilities();
  return NextResponse.json({ capabilities, available: true });
}
