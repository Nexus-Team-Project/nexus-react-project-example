/** This file creates public IDs for offers, purchases, and internal records. */
import { randomUUID } from "node:crypto";

/** Creates a public ID with a readable prefix and random UUID body. */
export function createPublicId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}
