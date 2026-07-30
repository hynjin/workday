export function formatScheduleEyebrow(dateKey:string) {
  const date=new Date(`${dateKey}T00:00:00Z`);
  const weekday=new Intl.DateTimeFormat("en-CA",{timeZone:"UTC",weekday:"short"}).format(date).toUpperCase();
  return `${Number(dateKey.slice(0,4))}. ${Number(dateKey.slice(5,7))}. ${Number(dateKey.slice(8))} ${weekday}`;
}
