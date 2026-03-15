"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SlotOption {
  start: string;
  end: string;
}

interface SlotPickerProps {
  slots: SlotOption[];
  onSelect: (start: string) => void;
  loading?: boolean;
}

export function SlotPicker({ slots, onSelect, loading }: SlotPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const grouped = slots.reduce<Record<string, SlotOption[]>>((acc, slot) => {
    const date = new Date(slot.start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, daySlots]) => (
        <div key={date}>
          <h3 className="text-sm font-medium mb-2">{date}</h3>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => {
              const time = new Date(slot.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              const isSelected = selected === slot.start;
              return (
                <button
                  key={slot.start}
                  onClick={() => setSelected(slot.start)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    isSelected ? "border-brand-500 bg-brand-50 text-brand-700" : "hover:border-brand-300"
                  )}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {selected && (
        <Button onClick={() => onSelect(selected)} disabled={loading} className="w-full">
          {loading ? "Booking..." : "Confirm Selection"}
        </Button>
      )}
    </div>
  );
}
