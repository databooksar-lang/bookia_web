const PLAN_LABELS = {
  starter: "Plan Starter",
  plus_ai: "Plan Plus AI",
  pro: "Plan Pro",
};

export function formatCurrentPlanLabel(planCode) {
  if (!planCode) {
    return "Sin plan configurado";
  }
  return PLAN_LABELS[planCode] || `Plan ${planCode}`;
}
