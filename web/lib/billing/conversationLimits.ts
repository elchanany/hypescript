export type ConversationPlan = "free" | "trial" | "creator" | "pro";

export const CONVERSATION_PIN_LIMITS: Record<ConversationPlan, number> = {
  free: 5,
  trial: 5,
  creator: 10,
  pro: 15,
};

export function conversationPinLimit(planId: string | null | undefined): number {
  return CONVERSATION_PIN_LIMITS[planId as ConversationPlan] ?? CONVERSATION_PIN_LIMITS.free;
}
