export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function calculateDaysSince(date: string): number {
  const now = new Date();
  const past = new Date(date);
  const diff = now.getTime() - past.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getRandomColor(): string {
  const colors = [
    "bg-pink-100",
    "bg-blue-100",
    "bg-green-100",
    "bg-purple-100",
    "bg-yellow-100",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
