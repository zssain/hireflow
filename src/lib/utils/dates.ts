import { Timestamp } from "firebase-admin/firestore";
import { format, addDays, differenceInDays, isPast, isFuture } from "date-fns";

export function now(): Timestamp {
  return Timestamp.now();
}

export function fromDate(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

export function toDate(ts: Timestamp): Date {
  return ts.toDate();
}

export function formatDate(ts: Timestamp, pattern: string = "MMM d, yyyy"): string {
  return format(ts.toDate(), pattern);
}

export function formatDateTime(ts: Timestamp): string {
  return format(ts.toDate(), "MMM d, yyyy 'at' h:mm a");
}

export function daysFromNow(days: number): Timestamp {
  return Timestamp.fromDate(addDays(new Date(), days));
}

export function daysBetween(a: Timestamp, b: Timestamp): number {
  return differenceInDays(a.toDate(), b.toDate());
}

export function isExpired(ts: Timestamp): boolean {
  return isPast(ts.toDate());
}

export function isUpcoming(ts: Timestamp): boolean {
  return isFuture(ts.toDate());
}

export function periodKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM");
}

export function dateKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}
