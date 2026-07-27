import { redirect } from "next/navigation";
import { dateKeyToDate, getWorkdayDate, nextDate } from "@/lib/workday-date";

export default function UpcomingPage() {
  const tomorrow = nextDate(dateKeyToDate(getWorkdayDate())).toISOString().slice(0, 10);
  redirect(`/?date=${tomorrow}`);
}
