import { type ClassValue, clsx } from "clsx/lite";

// combine classnames
export const cn = (...inputs: ClassValue[]): string => {
  return clsx(...inputs);
};
