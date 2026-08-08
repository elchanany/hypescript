/** Extracts a compact checklist from a Plan-mode response without hiding the raw plan. */
export function parsePlanSteps(text: string): string[] {
  const steps: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s*(?:\[[ xX]\])?|\d+[.)])\s+(.+?)\s*$/);
    if (!match) continue;
    const step = match[1]
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (step && !steps.includes(step)) steps.push(step);
  }
  if (steps.length) return steps.slice(0, 12);

  return text
    .split(/\r?\n+/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((line) => line.length > 8)
    .slice(0, 6);
}

export function approvedPlanPrompt(plan: string): string {
  return `אישרתי במפורש את התוכנית הבאה. בצע אותה כעת במצב Act, לפי הסדר, ודווח אמת על כל שלב:\n\n${plan}`;
}
