import { Calendar, Clock, Plus, User } from 'lucide-react';
import {
  formatDuration,
  formatMinutes,
  formatShortDayHeader,
  formatSpanishFullDate,
  getWorkWeekDates,
  ROOM_BY_ID,
  TIME_SLOT_STARTS,
  WORKDAY_FULL,
  WORKDAY_SHORT,
} from '../constants/rooms';
import type { Meeting, RoomId, ViewMode } from '../types/meeting';

export type ScheduleDisplayMode = 'cards' | 'slots';

interface ScheduleGridProps {
  activeView: ViewMode;
  displayMode: ScheduleDisplayMode;
  weekMondayISO: string;
  selectedDateISO: string;
  todayISO: string;
  meetings: Meeting[];
  loading: boolean;
  isAdmin: boolean;
  onSelectDate: (iso: string) => void;
  onSlotClick: (roomId: RoomId, dateISO: string, startMinutes: number) => void;
  onMeetingClick: (meeting: Meeting) => void;
}

export function ScheduleGrid({
  activeView,
  displayMode,
  weekMondayISO,
  selectedDateISO,
  todayISO,
  meetings,
  loading,
  isAdmin,
  onSelectDate,
  onSlotClick,
  onMeetingClick,
}: ScheduleGridProps) {
  const workWeekDates = getWorkWeekDates(weekMondayISO);
  const room = ROOM_BY_ID[activeView];
  const roomMeetings = meetings.filter((m) => m.roomId === activeView);
  const activeDayISO = workWeekDates.includes(selectedDateISO)
    ? selectedDateISO
    : workWeekDates[0];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border p-4 space-y-3 ${room.slotHourBorderClass} ${room.slotBgClass}`}
          >
            <div className="h-5 bg-white/70 rounded-lg animate-pulse w-2/3" />
            <div className="h-20 bg-white/60 rounded-xl animate-pulse" />
            <div className="h-20 bg-white/50 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Mode 2: 30-Minute Interactive Slots View (7:00 AM - 7:00 PM, Mon-Fri)
  if (displayMode === 'slots') {
    const dayMeetings = roomMeetings.filter((m) => m.date === activeDayISO);
    const morningSlots = TIME_SLOT_STARTS.filter((m) => m < 720); // 7:00 AM - 11:30 AM
    const afternoonSlots = TIME_SLOT_STARTS.filter((m) => m >= 720); // 12:00 PM - 6:30 PM

    const renderSlotCard = (slotStart: number) => {
      const slotEnd = slotStart + 30;
      const occupyingMeeting = dayMeetings.find(
        (m) => slotStart >= m.startMinutes && slotStart < m.endMinutes
      );

      if (occupyingMeeting) {
        return (
          <button
            key={slotStart}
            type="button"
            onClick={() => onMeetingClick(occupyingMeeting)}
            className={`w-full min-h-[54px] rounded-xl border px-3.5 py-2.5 text-left transition-transform active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 shadow-xs ${room.cardBgClass} ${room.cardBorderClass} ${room.cardTextClass}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono tabular-nums font-semibold ${room.cardSubtextClass}`}>
                  {formatMinutes(slotStart)} – {formatMinutes(slotEnd)}
                </span>
                <span className="text-[11px] font-medium opacity-85">
                  · Reservado
                </span>
              </div>
              <p className="text-sm font-bold truncate mt-0.5">
                {occupyingMeeting.title}
              </p>
            </div>
            {occupyingMeeting.organizer && (
              <span className="hidden sm:inline text-xs opacity-90 truncate max-w-[130px] shrink-0">
                {occupyingMeeting.organizer}
              </span>
            )}
          </button>
        );
      }

      if (isAdmin) {
        return (
          <button
            key={slotStart}
            type="button"
            onClick={() => onSlotClick(activeView, activeDayISO, slotStart)}
            className={`w-full min-h-[54px] rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${room.slotBgClass} ${room.slotHourBorderClass} ${room.slotHoverBgClass}`}
          >
            <div>
              <div className="text-xs font-mono tabular-nums font-semibold text-[#0B1F3A]">
                {formatMinutes(slotStart)} – {formatMinutes(slotEnd)}
              </div>
              <div className="text-xs text-[#0B1F3A]/65 mt-0.5">
                Espacio disponible
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${room.slotHoverTextClass}`}>
              <Plus className="w-4 h-4" />
              <span>Agendar</span>
            </span>
          </button>
        );
      }

      return (
        <div
          key={slotStart}
          className={`w-full min-h-[54px] rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 ${room.slotBgClass} ${room.slotHourBorderClass}`}
        >
          <div>
            <div className="text-xs font-mono tabular-nums font-semibold text-[#0B1F3A]">
              {formatMinutes(slotStart)} – {formatMinutes(slotEnd)}
            </div>
            <div className="text-xs text-[#0B1F3A]/65 mt-0.5">Disponible</div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {/* Touch-friendly Weekday Picker (Mon - Fri) */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {workWeekDates.map((iso, idx) => {
            const { dayNumber, monthShort } = formatShortDayHeader(iso);
            const isSelected = iso === activeDayISO;
            const isToday = iso === todayISO;
            const dayCount = roomMeetings.filter((m) => m.date === iso).length;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectDate(iso)}
                className={`min-h-[60px] rounded-2xl border px-2 py-2.5 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-[#0B1F3A] text-white border-[#0B1F3A] shadow-sm'
                    : `bg-white/90 text-[#0B1F3A] ${room.slotHourBorderClass} hover:bg-white`
                }`}
              >
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-orange-300' : 'text-slate-500'}`}>
                  <span className="sm:hidden">{WORKDAY_SHORT[idx]}</span>
                  <span className="hidden sm:inline">{WORKDAY_FULL[idx]}</span>
                </span>
                <span className="text-sm sm:text-base font-bold font-mono tabular-nums mt-0.5">
                  {dayNumber}{' '}
                  <span className="hidden sm:inline text-xs font-sans font-normal opacity-80">
                    {monthShort}
                  </span>
                </span>
                <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {isToday ? 'Hoy' : `${dayCount} reun.`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Slots Card */}
        <div className={`rounded-2xl border bg-white/80 backdrop-blur-xs p-4 sm:p-6 space-y-5 ${room.slotHourBorderClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0B1F3A]">
                {formatSpanishFullDate(activeDayISO)}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Franjas de 30 minutos de 7:00 AM a 7:00 PM
              </p>
            </div>
            <span className="text-xs font-semibold text-[#0B1F3A] font-mono tabular-nums">
              {dayMeetings.length} {dayMeetings.length === 1 ? 'reunión' : 'reuniones'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-[#0B1F3A]/80 tracking-wide">
                Mañana (7:00 AM – 12:00 PM)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {morningSlots.map(renderSlotCard)}
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-[#0B1F3A]/80 tracking-wide">
                Tarde (12:00 PM – 7:00 PM)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {afternoonSlots.map(renderSlotCard)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode 1 (Default): Friendly Mini-App Weekly Cards (Mon - Fri)
  const activeMobileMeetings = roomMeetings.filter((m) => m.date === activeDayISO);

  return (
    <div className="space-y-4">
      {/* Mobile Day Selector (Mon - Fri) */}
      <div className="lg:hidden grid grid-cols-5 gap-2">
        {workWeekDates.map((iso, idx) => {
          const { dayNumber } = formatShortDayHeader(iso);
          const isSelected = iso === activeDayISO;
          const isToday = iso === todayISO;
          const count = roomMeetings.filter((m) => m.date === iso).length;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={`min-h-[60px] rounded-2xl border px-1.5 py-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                isSelected
                  ? 'bg-[#0B1F3A] text-white border-[#0B1F3A] shadow-sm'
                  : `bg-white/90 text-[#0B1F3A] ${room.slotHourBorderClass}`
              }`}
            >
              <span className={`text-[11px] font-semibold ${isSelected ? 'text-orange-300' : 'text-slate-500'}`}>
                {WORKDAY_SHORT[idx]}
              </span>
              <span className="text-base font-bold font-mono tabular-nums leading-tight mt-0.5">
                {dayNumber}
              </span>
              <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                {isToday ? 'Hoy' : count > 0 ? `${count} reun.` : 'Libre'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Selected Day Card Feed */}
      <div className="lg:hidden">
        <div className={`rounded-2xl border p-4 space-y-3 bg-white/85 ${room.slotHourBorderClass}`}>
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
            <div>
              <h2 className="text-base font-bold text-[#0B1F3A]">
                {formatSpanishFullDate(activeDayISO)}
              </h2>
              <p className="text-xs text-slate-600">
                {activeMobileMeetings.length === 0
                  ? 'Sala disponible de 7:00 AM a 7:00 PM'
                  : `${activeMobileMeetings.length} ${
                      activeMobileMeetings.length === 1 ? 'reunión programada' : 'reuniones programadas'
                    }`}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onSlotClick(activeView, activeDayISO, 540)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EA580C] hover:bg-[#DC4C04] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar</span>
              </button>
            )}
          </div>

          {activeMobileMeetings.length === 0 ? (
            <div className={`rounded-xl border border-dashed p-6 text-center ${room.slotBgClass} ${room.slotHourBorderClass}`}>
              <Calendar className="w-6 h-6 text-[#0B1F3A]/45 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#0B1F3A]">
                Sin reuniones este día
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Todos los horarios de 7:00 AM a 7:00 PM están disponibles.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeMobileMeetings.map((meeting) => (
                <button
                  key={meeting.id}
                  type="button"
                  onClick={() => onMeetingClick(meeting)}
                  className={`w-full min-h-[72px] rounded-2xl border p-4 text-left transition-transform active:scale-[0.99] cursor-pointer shadow-xs ${room.cardBgClass} ${room.cardBorderClass} ${room.cardTextClass}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-mono tabular-nums font-semibold ${room.cardSubtextClass}`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {formatMinutes(meeting.startMinutes)} – {formatMinutes(meeting.endMinutes)}
                    </span>
                    <span className="text-[11px] opacity-85 shrink-0">
                      {formatDuration(meeting.startMinutes, meeting.endMinutes)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold leading-snug mt-1">
                    {meeting.title}
                  </h3>
                  {meeting.organizer && (
                    <p className="inline-flex items-center gap-1.5 text-xs opacity-90 mt-1.5">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>{meeting.organizer}</span>
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop 5-Column Mini-App Board (Lunes a Viernes) */}
      <div className="hidden lg:grid grid-cols-5 gap-4 items-start">
        {workWeekDates.map((iso, idx) => {
          const { dayNumber, monthShort } = formatShortDayHeader(iso);
          const dayMeetings = roomMeetings.filter((m) => m.date === iso);
          const isToday = iso === todayISO;

          return (
            <section
              key={iso}
              className={`rounded-2xl border overflow-hidden flex flex-col min-h-[380px] transition-shadow ${
                isToday
                  ? `${room.slotTodayBgClass} ${room.slotHourBorderClass} ring-2 ring-[#0B1F3A]/15`
                  : `${room.slotBgClass} ${room.slotHourBorderClass}`
              }`}
            >
              {/* Day Card Header */}
              <div
                className={`px-4 py-3.5 border-b ${
                  isToday
                    ? 'bg-[#0B1F3A] text-white border-[#183863]'
                    : 'bg-white/85 text-[#0B1F3A] border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isToday ? 'text-orange-300' : 'text-slate-500'
                    }`}
                  >
                    {WORKDAY_FULL[idx]}
                  </span>
                  {isToday ? (
                    <span className="text-[11px] font-bold text-[#F97316]">Hoy</span>
                  ) : (
                    <span className="text-[11px] font-mono tabular-nums text-slate-500">
                      {dayMeetings.length} {dayMeetings.length === 1 ? 'reun.' : 'reun.'}
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">
                  {dayNumber}{' '}
                  <span className="text-sm font-sans font-medium opacity-80">
                    {monthShort}
                  </span>
                </div>
              </div>

              {/* Day Card Body */}
              <div className="p-3 flex-1 flex flex-col gap-2.5">
                {dayMeetings.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-3 py-8">
                    <p className="text-xs font-semibold text-[#0B1F3A]/70">
                      Disponible todo el día
                    </p>
                    <p className="text-[11px] text-[#0B1F3A]/50 mt-1 font-mono tabular-nums">
                      7:00 AM – 7:00 PM
                    </p>
                  </div>
                ) : (
                  dayMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      type="button"
                      onClick={() => onMeetingClick(meeting)}
                      className={`w-full rounded-xl border p-3 text-left transition-all cursor-pointer shadow-xs hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A] ${room.cardBgClass} ${room.cardBorderClass} ${room.cardTextClass}`}
                    >
                      <div className={`text-[11px] font-mono tabular-nums font-semibold ${room.cardSubtextClass}`}>
                        {formatMinutes(meeting.startMinutes)} – {formatMinutes(meeting.endMinutes)}
                      </div>
                      <div className="text-sm font-bold leading-snug mt-1 line-clamp-2">
                        {meeting.title}
                      </div>
                      {meeting.organizer && (
                        <div className="inline-flex items-center gap-1 text-xs opacity-90 mt-1.5 max-w-full">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{meeting.organizer}</span>
                        </div>
                      )}
                    </button>
                  ))
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onSlotClick(activeView, iso, 540)}
                    className={`mt-auto w-full py-2.5 px-3 rounded-xl border border-dashed text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 bg-white/55 hover:bg-white ${room.slotHourBorderClass} ${room.slotHoverTextClass}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agendar este día</span>
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
