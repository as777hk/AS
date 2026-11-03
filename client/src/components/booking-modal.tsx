"use client";

import { useEffect, useMemo, useState } from "react";
import { X, CalendarDays, Clock3 } from "lucide-react";
import { Studio, api } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type OccupiedSlot = { startTime: string; endTime: string };

export function BookingModal({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("12:00");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<{ date: string; slots: OccupiedSlot[]; failed?: boolean } | null>(null);
  const router = useRouter();

  const occupied = availability?.date === date ? availability.slots : [];
  const availabilityLoading = Boolean(date) && availability?.date !== date;
  const availabilityFailed = availability?.date === date && availability.failed === true;
  const hours = useMemo(() => {
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
  }, [start, end]);
  const total = hours * studio.hourlyRate + studio.securityDeposit;
  const hasConflict = occupied.some((slot) => start < slot.endTime && end > slot.startTime);
  // Calendar-day validity is enforced by the backend.

  useEffect(() => {
    if (!date) return;
¶»§q«^u½Í”ˆ½¹±¥¬õí½¹±½Í•ô…É¥„µ±…‰•°ô‰±½Í”‰½½­¥¹œ‘¥…±½œˆøñ`€¼øð½‰ÕÑÑ½¸ø(€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰•å•‰É½ÜˆùIMIYe=UHMAð½ÍÁ…¸ø(€€€€€€€€ñ È¥ô‰‰½½­¥¹œµµ½‘…°µÑ¥Ñ±”ˆù	½½¬íÍÑÕ‘¥¼¹Ñ¥Ñ±•ôð½ Èø(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÕÑ•ˆù¡½½Í”Ñ¡”‘…Ñ”…¹ÁÉ½‘ÕÑ¥½¸¡½ÕÉÌ¸e½ÕÈÉ•ÅÕ•ÍÐÝ¥±°‰”Í•¹Ð…ÌA•¹‘¥¹œ¸ð½Àø(€€€€€€€€ñ™½É´½¹MÕ‰µ¥ÐõíÍÕ‰µ¥Ñô±…ÍÍ9…µ”ô‰™½É´µÍÑ…¬ˆø(€€€€€€€€€€ñ±…‰•°ø(€€€€€€€€€€€	½½­¥¹œ‘…Ñ”(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¥¹ÁÕÐµ¥½¸ˆø(€€€€€€€€€€€€€€ñ…±•¹‘…É…åÌ€¼ø(€€€€€€€€€€€€€€ñ¥¹ÁÕÐÉ•ÅÕ¥É•ÑåÁ”ô‰‘…Ñ”ˆµ¥¸õíÕ¹‘•™¥¹•‘ôÙ…±Õ”õí‘…Ñ•ô½¹¡…¹”õì¡•Ù•¹Ð¤€ôøÍ•Ñ…Ñ”¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ô€¼ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½±…‰•°ø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÑÝ¼µ™¥•±‘Ìˆø(€€€€€€€€€€€€ñ±…‰•°ø(€€€€€€€€€€€€€MÑ…ÉÐÑ¥µ”(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¥¹ÁÕÐµ¥½¸ˆø(€€€€€€€€€€€€€€€€ñ±½¬Ì€¼ø(€€€€€€€€€€€€€€€€ñ¥¹ÁÕÐÑåÁ”ô‰Ñ¥µ”ˆÉ•ÅÕ¥É•Ù…±Õ”õíÍÑ…ÉÑô½¹¡…¹”õì¡•Ù•¹Ð¤€ôøÍ•ÑMÑ…ÉÐ¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ô€¼ø(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€ð½±…‰•°ø(€€€€€€€€€€€€ñ±…‰•°ø(€€€€€€€€€€€€€¹Ñ¥µ”(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¥¹ÁÕÐµ¥½¸ˆø(€€€€€€€€€€€€€€€€ñ±½¬Ì€¼ø(€€€€€€€€€€€€€€€€ñ¥¹ÁÕÐÑåÁ”ô‰Ñ¥µ”ˆÉ•ÅÕ¥É•Ù…±Õ”õí•¹‘ô½¹¡…¹”õì¡•Ù•¹Ð¤€ôøÍ•Ñ¹¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ô€¼ø(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€ð½±…‰•°ø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰…Ù…¥±…‰¥±¥Ñäµ¹½Ñ”ˆÉ½±”ô‰ÍÑ…ÑÕÌˆø(€€€€€€€€€€€ì…‘…Ñ”€ü€‰M•±•Ð„‘…Ñ”Ñ¼¡•¬½¹™¥Éµ•É•Í•ÉÙ…Ñ¥½¹Ì¸ˆ€è(€€€€€€€€€€€€€…Ù…¥±…‰¥±¥Ñå1½…‘¥¹œ€ü€‰¡•­¥¹œ½¹™¥Éµ•É•Í•ÉÙ…Ñ¥½¹ÏŠ˜ˆ€è(€€€€€€€€€€€€€…Ù…¥±…‰¥±¥Ñå…¥±•€ü€‰1¥Ù”…Ù…¥±…‰¥±¥Ñä½Õ±¹½Ð‰”±¾ÚîÆ­y