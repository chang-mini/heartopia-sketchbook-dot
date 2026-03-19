/*
Module: shared math
Description: Common numeric helpers used across domains.
Domain: domain/shared
Dependencies: none
Usage:
  import { clamp } from "../shared/math.js";
*/

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export { clamp };
