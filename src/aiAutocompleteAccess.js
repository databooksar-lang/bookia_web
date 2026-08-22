export function canUseAiAutocomplete(currentPlanCode) {
  return currentPlanCode === "base" || currentPlanCode === "plus_ai";
}
