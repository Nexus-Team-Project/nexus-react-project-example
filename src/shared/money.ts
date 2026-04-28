/** This file contains small helpers for money parsing and comparisons. */
import { Prisma } from "@prisma/client";

/** Converts a number-like value into a two-decimal Prisma Decimal. */
export function toMoneyDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

/** Returns a plain number for API responses that expect numeric money values. */
export function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value.toFixed(2));
}

/** Checks whether two decimal money values are equal at two decimal places. */
export function moneyEquals(left: Prisma.Decimal, right: Prisma.Decimal): boolean {
  return left.toDecimalPlaces(2).equals(right.toDecimalPlaces(2));
}
