import { AR_TO_EN_DICTIONARY } from "./src/shared/services/translationService";
const SORTED_AR_ENTRIES = Object.entries(AR_TO_EN_DICTIONARY).sort(
  (a, b) => b[0].length - a[0].length,
);
console.log(SORTED_AR_ENTRIES.slice(0, 5));
