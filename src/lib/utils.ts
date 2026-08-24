import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Junta classes condicionais (clsx) e resolve conflitos do Tailwind
 * (tailwind-merge) — ex.: cn("p-2", cond && "p-4") vira "p-4".
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
