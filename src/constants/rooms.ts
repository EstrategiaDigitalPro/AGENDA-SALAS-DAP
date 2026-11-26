import type { RoomDefinition, RoomId } from '../types/meeting';

export const ADMIN_EMAIL = 'corcomunicaciones@gmail.com';

export const ROOMS: RoomDefinition[] = [
  {
    id: 'sala-piso-8-dap',
    name: 'Sala piso 8 DAP',
    shortName: 'Piso 8 DAP',
    location: 'Piso 8',
    pageBgClass: 'bg-[#FFF5EC]',
    slotBgClass: 'bg-[#FFF3E8]',
    slotTodayBgClass: 'bg-[#FFEBDA]',
    slotHoverBgClass: 'hover:bg-[#FFE0C4]',
    slotHourBorderClass: 'border-[#FDBA74]/80',
    slotHalfBorderClass: 'border-[#FED7AA]/65',
    slotHoverTextClass: 'text-[#C2410C]',
    timeAxisBgClass: 'bg-[#FFEADB]',
    tabUnderlineClass: 'bg-[#F97316]',
    cardBgClass: 'bg-[#EA580C] hover:bg-[#C2410C]',
    cardBorderClass: 'border-[#9A3412]',
    cardTextClass: 'text-white',
    cardSubtextClass: 'text-orange-100',
    dotColorClass: 'bg-[#EA580C]',
  },
  {
    id: 'sala-a-opt',
    name: 'Sala A OPT',
    shortName: 'Sala A OPT',
    location: 'Área OPT',
    pageBgClass: 'bg-[#F6F1FF]',
    slotBgClass: 'bg-[#F4EDFF]',
    slotTodayBgClass: 'bg-[#ECE1FF]',
    slotHoverBgClass: 'hover:bg-[#E2D2FE]',
    slotHourBorderClass: 'border-[#C4B5FD]/85',
    slotHalfBorderClass: 'border-[#DDD6FE]/70',
    slotHoverTextClass: 'text-[#6D28D9]',
    timeAxisBgClass: 'bg-[#EDE3FF]',
    tabUnderlineClass: 'bg-[#A855F7]',
    cardBgClass: 'bg-[#7C3AED] hover:bg-[#6D28D9]',
    cardBorderClass: 'border-[#5B21B6]',
    cardTextClass: 'text-white',
    cardSubtextClass: 'text-purple-100',
    dotColorClass: 'bg-[#7C3AED]',
  },
  {
    id: 'sala-b-opt',
    name: 'Sala B OPT',
    shortName: 'Sala B OPT',
    location: 'Área OPT',
    pageBgClass: 'bg-[#FDF1F7]',
    slotBgClass: 'bg-[#FCEBF3]',
    slotTodayBgClass: 'bg-[#FADCEB]',
    slotHoverBgClass: 'hover:bg-[#F7CCE1]',
    slotHourBorderClass: 'border-[#F472B6]/70',
    slotHalfBorderClass: 'border-[#FBCFE8]/80',
    slotHoverTextClass: 'text-[#BE185D]',
    timeAxisBgClass: 'bg-[#F9E2EE]',
    tabUnderlineClass: 'bg-[#EC4899]',
    cardBgClass: 'bg-[#DB2777] hover:bg-[#BE185D]',
    cardBorderClass: 'border-[#9D174D]',
    cardTextClass: 'text-white',
    cardSubtextClass: 'text-pink-100',
    dotColorClass: 'bg-[#DB2777]',
  },
];

export const ROOM_IDS: RoomId[] = ROOMS.map((r) => r.id);

export const ROOM_BY_ID: Record<RoomId, RoomDefinition> = {
  'sala-piso-8-dap': ROOMS[0],
  'sala-a-opt': ROOMS[1],
  'sala-b-opt': ROOMS[2],
};

// Schedule boundaries: 7:00 AM (420m) to 7:00 PM (1140m) in 30-min steps
export const START_MINUTES = 420;
export const END_MINUTES = 1140;
export const STEP_MINUTES = 30;
export const SLOT_COUNT = (END_MINUTES - START_MINUTES) / STEP_MINUTES; // 24 slots

// Validation boundaries synced with firebase-blueprint.json and firestore.rules
export const TITLE_MAX_LENGTH = 120;
export const ORGANIZER_MAX_LENGTH = 80;
export const NOTES_MAX_LENGTH = 400;
export const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export const TIME_SLOT_STARTS: number[] = Array.from(
  { length: SLOT_COUNT },
  (_, index) => START_MINUTES + index * STEP_MINUTES
);

export const TIME_SLOT_ENDS: number[] = Array.from(
  { length: SLOT_COUNT },
  (_, index) => START_MINUTES + (index + 1) * STEP_MINUTES
);

export function formatMinutes(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minStr = minutes.toString().padStart(2, '0');
  return `${hours12}:${minStr} ${period}`;
}

export function formatDuration(startMinutes: number, endMinutes: number): string {
  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} h ${mins} min`;
  }
  if (hours > 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  return `${mins} min`;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, deltaDays: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + deltaDays);
  return toISODate(d);
}

export function getMondayOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return toISODate(d);
}

export function getWeekDates(mondayISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayISO, i));
}

export function getWorkWeekDates(mondayISO: string): string[] {
  return Array.from({ length: 5 }, (_, i) => addDays(mondayISO, i));
}

export function isWeekendISO(iso: string): boolean {
  if (!DATE_REGEX.test(iso)) return false;
  const day = parseISODate(iso).getDay();
  return day === 0 || day === 6;
}

export function getDefaultWorkDateISO(todayISO: string): string {
  const d = parseISODate(todayISO);
  const day = d.getDay();
  if (day === 6) return addDays(todayISO, 2); // Saturday -> next Monday
  if (day === 0) return addDays(todayISO, 1); // Sunday -> next Monday
  return todayISO;
}

export const WORKDAY_FULL = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
];

export const WORKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

export const WEEKDAY_FULL = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const MONTHS_FULL = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function formatShortDayHeader(iso: string): { dayNumber: number; monthShort: string } {
  const d = parseISODate(iso);
  return {
    dayNumber: d.getDate(),
    monthShort: MONTHS_SHORT[d.getMonth()],
  };
}

export function formatSpanishFullDate(iso: string): string {
  if (!DATE_REGEX.test(iso)) return iso;
  const d = parseISODate(iso);
  const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return `${WEEKDAY_FULL[dayIdx]}, ${d.getDate()} de ${MONTHS_FULL[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatWeekRange(mondayISO: string): string {
  const fridayISO = addDays(mondayISO, 4);
  const start = parseISODate(mondayISO);
  const end = parseISODate(fridayISO);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} – ${end.getDate()} de ${MONTHS_FULL[end.getMonth()]} ${end.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}
