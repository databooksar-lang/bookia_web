export function canUseAiAutocomplete(currentPlanCode) {
  return currentPlanCode === "trial" || currentPlanCode === "base" || currentPlanCode === "plus_ai";
}
