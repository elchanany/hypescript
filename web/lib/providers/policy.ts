import { PROVIDER_BY_ID } from "./registry";
import type { ProviderId } from "./types";

export const PROVIDER_APPROVALS_KEY = "hs_provider_billing_approvals_v1";

interface ApprovalStore {
  version: 1;
  approved: Partial<Record<ProviderId, number>>;
}

const empty = (): ApprovalStore => ({ version: 1, approved: {} });

export function parseProviderApprovals(raw: string | null): ApprovalStore {
  if (!raw) return empty();
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !value.approved || typeof value.approved !== "object") return empty();
    return { version: 1, approved: value.approved };
  } catch {
    return empty();
  }
}

function browserStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

export function getProviderApprovals(storage: Pick<Storage, "getItem"> | null = browserStorage()): ApprovalStore {
  return parseProviderApprovals(storage?.getItem(PROVIDER_APPROVALS_KEY) || null);
}

export function isProviderBillingApproved(id: ProviderId, storage: Pick<Storage, "getItem"> | null = browserStorage()): boolean {
  const provider = PROVIDER_BY_ID[id];
  if (provider.billingRisk === "no_charge") return true;
  return Number(getProviderApprovals(storage).approved[id]) > 0;
}

export function setProviderBillingApproval(
  id: ProviderId,
  approved: boolean,
  storage: Pick<Storage, "getItem" | "setItem"> | null = browserStorage(),
): void {
  if (!storage) return;
  const current = getProviderApprovals(storage);
  if (approved) current.approved[id] = Date.now();
  else delete current.approved[id];
  storage.setItem(PROVIDER_APPROVALS_KEY, JSON.stringify(current));
}

export async function ensureProviderBillingApproval(
  id: ProviderId,
  ask: (question: string, options: string[]) => Promise<string>,
): Promise<void> {
  if (isProviderBillingApproved(id)) return;
  const provider = PROVIDER_BY_ID[id];
  const approveLabel = `מאשר שימוש ב-${provider.labelHe}`;
  const answer = await ask(`${provider.billingNoteHe}\nלא תתבצע קריאה חיצונית בלי אישור.`, [approveLabel, "ביטול"]);
  if (answer !== approveLabel) throw new Error(`השימוש ב-${provider.labelHe} בוטל כי לא ניתן אישור חיוב/מכסה.`);
  setProviderBillingApproval(id, true);
}
