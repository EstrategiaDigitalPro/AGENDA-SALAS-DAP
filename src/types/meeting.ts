import type { Timestamp } from 'firebase/firestore';

export type RoomId = 'sala-piso-8-dap' | 'sala-a-opt' | 'sala-b-opt';

export type ViewMode = RoomId;

export interface RoomDefinition {
  id: RoomId;
  name: string;
  shortName: string;
  location: string;
  pageBgClass: string;
  slotBgClass: string;
  slotTodayBgClass: string;
  slotHoverBgClass: string;
  slotHourBorderClass: string;
  slotHalfBorderClass: string;
  slotHoverTextClass: string;
  timeAxisBgClass: string;
  tabUnderlineClass: string;
  cardBgClass: string;
  cardBorderClass: string;
  cardTextClass: string;
  cardSubtextClass: string;
  dotColorClass: string;
}

export interface Meeting {
  id: string;
  roomId: RoomId;
  title: string;
  organizer: string;
  notes: string;
  date: string; // YYYY-MM-DD
  startMinutes: number; // 420..1110, step 30
  endMinutes: number; // 450..1140, step 30
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface MeetingDraft {
  roomId: RoomId;
  title: string;
  organizer: string;
  notes: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
}
