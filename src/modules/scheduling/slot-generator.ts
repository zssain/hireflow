import { addMinutes, setHours, setMinutes, isAfter, isBefore, eachDayOfInterval, getDay } from "date-fns";

export interface TimeSlot {
  start: Date;
  end: Date;
}

interface SlotGeneratorParams {
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  workingHoursStart?: number;
  workingHoursEnd?: number;
  excludeWeekends?: boolean;
}

export function generateSlots(params: SlotGeneratorParams): TimeSlot[] {
  const {
    windowStart,
    windowEnd,
    durationMinutes,
    workingHoursStart = 9,
    workingHoursEnd = 17,
    excludeWeekends = true,
  } = params;

  const slots: TimeSlot[] = [];
  const days = eachDayOfInterval({ start: windowStart, end: windowEnd });

  for (const day of days) {
    const dow = getDay(day);
    if (excludeWeekends && (dow === 0 || dow === 6)) continue;

    let slotStart = setMinutes(setHours(day, workingHoursStart), 0);
    const dayEnd = setMinutes(setHours(day, workingHoursEnd), 0);

    while (isBefore(addMinutes(slotStart, durationMinutes), dayEnd) || addMinutes(slotStart, durationMinutes).getTime() === dayEnd.getTime()) {
      const slotEnd = addMinutes(slotStart, durationMinutes);
      if (isAfter(slotStart, windowStart) || slotStart.getTime() === windowStart.getTime()) {
        slots.push({ start: slotStart, end: slotEnd });
      }
      slotStart = addMinutes(slotStart, 30);
    }
  }

  return slots;
}
