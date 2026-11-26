import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, X } from 'lucide-react';
import {
  formatDuration,
  formatMinutes,
  formatMonthYearLabel,
  formatTotalHours,
  parseISODate,
  ROOM_BY_ID,
  ROOMS,
  WEEKDAY_FULL,
} from '../constants/rooms';
import type { Meeting, RoomId } from '../types/meeting';

interface MonthlyReportModalProps {
  isOpen: boolean;
  meetings: Meeting[];
  defaultYearMonth: string; // YYYY-MM
  onClose: () => void;
}

function shiftYearMonth(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + deltaMonths, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function MonthlyReportModal({
  isOpen,
  meetings,
  defaultYearMonth,
  onClose,
}: MonthlyReportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(defaultYearMonth);
  const [roomFilter, setRoomFilter] = useState<RoomId | 'all'>('all');

  const monthMeetings = useMemo(
    () =>
      meetings
        .filter((m) => m.date.startsWith(selectedMonth))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
          return a.roomId.localeCompare(b.roomId);
        }),
    [meetings, selectedMonth]
  );

  const filteredMeetings = useMemo(
    () =>
      roomFilter === 'all'
        ? monthMeetings
        : monthMeetings.filter((m) => m.roomId === roomFilter),
    [monthMeetings, roomFilter]
  );

  const totalMinutes = useMemo(
    () => filteredMeetings.reduce((acc, m) => acc + (m.endMinutes - m.startMinutes), 0),
    [filteredMeetings]
  );

  const statsByRoom = useMemo(
    () =>
      ROOMS.map((room) => {
        const items = monthMeetings.filter((m) => m.roomId === room.id);
        const mins = items.reduce((acc, m) => acc + (m.endMinutes - m.startMinutes), 0);
        return {
          room,
          count: items.length,
          minutes: mins,
        };
      }),
    [monthMeetings]
  );

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    const headers = [
      'Fecha',
      'Día',
      'Sala',
      'Hora inicio',
      'Hora fin',
      'Duración (min)',
      'Título',
      'Responsable',
      'Notas',
    ];

    const rows = filteredMeetings.map((m) => {
      const d = parseISODate(m.date);
      const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      return [
        m.date,
        WEEKDAY_FULL[dayIdx] ?? '',
        ROOM_BY_ID[m.roomId].name,
        formatMinutes(m.startMinutes),
        formatMinutes(m.endMinutes),
        m.endMinutes - m.startMinutes,
        m.title,
        m.organizer,
        m.notes,
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const suffix = roomFilter === 'all' ? 'todas-las-salas' : roomFilter;
    link.href = url;
    link.setAttribute('download', `informe-salas-dap-${selectedMonth}-${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071426]/65 backdrop-blur-[2px] p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="monthly-report-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B1F3A] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileSpreadsheet className="w-5 h-5 text-[#F97316] shrink-0" />
            <div className="min-w-0">
              <h2 id="monthly-report-title" className="text-base sm:text-lg font-bold tracking-tight truncate">
                Informe mensual de salas
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Historial guardado automáticamente en la base de datos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#163661] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Month Selector */}
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setSelectedMonth((prev) => shiftYearMonth(prev, -1))}
              aria-label="Mes anterior"
              className="p-2 text-[#0B1F3A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-[#0B1F3A] whitespace-nowrap">
              {formatMonthYearLabel(selectedMonth)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth((prev) => shiftYearMonth(prev, 1))}
              aria-label="Mes siguiente"
              className="p-2 text-[#0B1F3A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filtrar por sala"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value as RoomId | 'all')}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
            >
              <option value="all">Todas las salas</option>
              {ROOMS.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredMeetings.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#EA580C] hover:bg-[#DC4C04] text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Descargar Excel (CSV)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-[#0B1F3A] text-white p-3.5">
              <p className="text-xs text-slate-300 font-medium">Total del período</p>
              <p className="text-xl font-extrabold font-mono tabular-nums mt-1">
                {filteredMeetings.length}{' '}
                <span className="text-xs font-sans font-medium text-slate-300">
                  {filteredMeetings.length === 1 ? 'reunión' : 'reuniones'}
                </span>
              </p>
              <p className="text-xs font-mono tabular-nums text-orange-300 mt-0.5">
                {formatTotalHours(totalMinutes)}
              </p>
            </div>

            {statsByRoom.map(({ room, count, minutes }) => (
              <div
                key={room.id}
                className={`rounded-xl border p-3.5 ${room.slotBgClass} ${room.slotHourBorderClass}`}
              >
                <p className="text-xs font-bold text-[#0B1F3A] truncate">{room.name}</p>
                <p className="text-xl font-extrabold font-mono tabular-nums text-[#0B1F3A] mt-1">
                  {count}{' '}
                  <span className="text-xs font-sans font-medium text-[#0B1F3A]/70">
                    {count === 1 ? 'reunión' : 'reuniones'}
                  </span>
                </p>
                <p className="text-xs font-mono tabular-nums font-semibold text-[#0B1F3A]/75 mt-0.5">
                  {formatTotalHours(minutes)}
                </p>
              </div>
            ))}
          </div>

          {/* Meeting Records List */}
          {filteredMeetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm font-semibold text-[#0B1F3A]">
                Sin reuniones registradas en {formatMonthYearLabel(selectedMonth)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Todas las reuniones que agendes quedan guardadas aquí automáticamente para tus informes.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile List */}
              <div className="sm:hidden space-y-2.5">
                {filteredMeetings.map((m) => {
                  const room = ROOM_BY_ID[m.roomId];
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3.5 ${room.slotBgClass} ${room.slotHourBorderClass}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono tabular-nums font-semibold text-[#0B1F3A]">
                          {m.date}
                        </span>
                        <span className="font-bold text-[#0B1F3A]">{room.name}</span>
                      </div>
                      <p className="text-sm font-bold text-[#0B1F3A] mt-1">{m.title}</p>
                      <div className="mt-1 text-xs text-[#0B1F3A]/75 flex flex-wrap gap-x-2">
                        <span className="font-mono tabular-nums">
                          {formatMinutes(m.startMinutes)} – {formatMinutes(m.endMinutes)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDuration(m.startMinutes, m.endMinutes)}</span>
                        {m.organizer && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{m.organizer}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 px-3.5">Fecha</th>
                      <th className="py-2.5 px-3.5">Sala</th>
                      <th className="py-2.5 px-3.5">Horario</th>
                      <th className="py-2.5 px-3.5">Título</th>
                      <th className="py-2.5 px-3.5">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {filteredMeetings.map((m) => {
                      const room = ROOM_BY_ID[m.roomId];
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 font-mono tabular-nums text-[#0B1F3A] whitespace-nowrap">
                            {m.date}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-[#0B1F3A] whitespace-nowrap">
                            {room.name}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {formatMinutes(m.startMinutes)} – {formatMinutes(m.endMinutes)}
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-[#0B1F3A]">
                            {m.title}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600">
                            {m.organizer || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
