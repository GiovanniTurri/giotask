export function inReminderDeliveryWindow(now: Date): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23",
  }).format(now));
  return hour >= 8 && hour <= 19;
}