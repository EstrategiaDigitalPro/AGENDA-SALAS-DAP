import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import {
  END_MINUTES,
  formatDuration,
  formatMinutes,
  formatSpanishFullDate,
  isWeekendISO,
  NOTES_MAX_LENGTH,
  ORGANIZER_MAX_LENGTH,
  ROOMS,
  STEP_MINUTES,
  TIME_SLOT_ENDS,
  TIME_SLOT_STARTS,
  TITLE_MAX_LENGTH,
} from '../constants/rooms';
import { findConflictingMeeting } from '../services/meetingsService';
import type { Meeting, MeetingDraft, RoomId } from '../types/meeting';

interface MeetingModalProps {
  isOpen: boolean;
  editingMeeting: Meeting | null;
  initialDraft: MeetingDraft;
  existingMeetings: Meeting[];
  onClose: () => void;
  onSave: (draft: MeetingDraft, editingId?: string) => Promise<void>;
  onDelete?: (meetingId: string) => Promise<void>;
}

export function MeetingModal({
  isOpen,
  editingMeeting,
  initialDraft,
  existingMeetings,
  onClose,
  onSave,
  onDelete,
}: MeetingModalProps) {
  const [roomId, setRoomId] = useState<RoomId>(initialDraft.roomId);
  const [date, setDate] = useState(initialDraft.date);
  const [startMinutes, setStartMinutes] = useState(initialDraft.startMinutes);
  const [endMinutes, setEndMinutes] = useState(initialDraft.endMinutes);
  const [title, setTitle] = useState(initialDraft.title);
  const [organizer, setOrganizer] = useState(initialDraft.organizer);
  const [notes, setNotes] = useState(initialDraft.notes);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRoomId(initialDraft.roomId);
    setDate(initialDraft.date);
    setStartMinutes(initialDraft.startMinutes);
    setEndMinutes(initialDraft.endMinutes);
    setTitle(initialDraft.title);
    setOrganizer(initialDraft.organizer);
    setNotes(initialDraft.notes);
    setErrorMsg(null);
    setConfirmingDelete(false);
    setSubmitting(false);
  }, [isOpen, initialDraft]);

  const availableEndTimes = useMemo(
    () => TIME_SLOT_ENDS.filter((t) => t > startMinutes && t <= END_MINUTES),
    [startMinutes]
  );

  const conflict = useMemo(
    () =>
      findConflictingMeeting(
        existingMeetings,
        { roomId, date, startMinutes, endMinutes },
        editingMeeting?.id
      ),
    [existingMeetings, roomId, date, startMinutes, endMinutes, editingMeeting?.id]
  );

  const weekendSelected = isWeekendISO(date);

  if (!isOpen) return null;

  const handleStartChange = (newStart: number) => {
    setStartMinutes(newStart);
    if (endMinutes <= newStart) {
      setEndMinutes(Math.min(newStart + STEP_MINUTES, END_MINUTES));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (weekendSelected) {
      setErrorMsg('Solo se pueden agendar reuniones de lunes a viernes.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Por favor escribe el asunto o título de la reunión.');
      return;
    }

    if (conflict) {
      setErrorMsg(
        `Choque de horario con "${conflict.title}" (${formatMinutes(conflict.startMinutes)} – ${formatMinutes(conflict.endMinutes)}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSave(
        {
          roomId,
          date,
          startMinutes,
          endMinutes,
          title: trimmedTitle,
          organizer: organizer.trim(),
          notes: notes.trim(),
        },
        editingMeeting?.id
      );
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la reunión. Verifica tus permisos e intenta de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingMeeting || !onDelete) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onDelete(editingMeeting.id);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo eliminar la reunión.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071426]/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#0B1F3A] text-white px-6 py-4 flex items-center justify-between gap-4">
          <h2 id="meeting-modal-title" className="text-lg font-bold tracking-tight">
            {editingMeeting ? 'Editar reunión' : 'Agendar reunión'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#163661] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Room Selection */}
          <div>
            <label className="block text-sm font-semibold text-[#0B1F3A] mb-1.5">
              Sala
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ROOMS.map((room) => {
                const selected = roomId === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setRoomId(room.id)}
                    className={`px-3 py-2.5 text-sm font-semibold rounded-lg border transition-colors text-center whitespace-nowrap cursor-pointer ${
                      selected
                        ? `${room.cardBgClass} ${room.cardBorderClass} text-white`
                        : `${room.slotBgClass} text-[#0B1F3A] ${room.slotHourBorderClass} ${room.slotHoverBgClass}`
                    }`}
                  >
                    {room.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="meeting-date"
              className="block text-sm font-semibold text-[#0B1F3A] mb-1.5"
            >
              Fecha (lunes a viernes)
            </label>
            <input
              id="meeting-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-[#0B1F3A] font-medium focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-[#EA580C]"
            />
            {date && (
              <p className={`mt-1 text-xs ${weekendSelected ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                {formatSpanishFullDate(date)}
                {weekendSelected ? ' · Selecciona un día entre lunes y viernes.' : ''}
              </p>
            )}
          </div>

          {/* Time Slot Selection (7:00 AM - 7:00 PM in 30-min increments) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="meeting-start"
                className="block text-sm font-semibold text-[#0B1F3A] mb-1.5"
              >
                Hora de inicio
              </label>
              <select
                id="meeting-start"
                value={startMinutes}
                onChange={(e) => handleStartChange(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono tabular-nums text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-[#EA580C]"
              >
                {TIME_SLOT_STARTS.map((mins) => (
                  <option key={mins} value={mins}>
                    {formatMinutes(mins)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="meeting-end"
                className="block text-sm font-semibold text-[#0B1F3A] mb-1.5"
              >
                Hora de fin
              </label>
              <select
                id="meeting-end"
                value={endMinutes}
                onChange={(e) => setEndMinutes(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono tabular-nums text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-[#EA580C]"
              >
                {availableEndTimes.map((mins) => (
                  <option key={mins} value={mins}>
                    {formatMinutes(mins)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-600 font-medium">
            Duración seleccionada:{' '}
            <span className="text-[#0B1F3A] font-semibold">
              {formatDuration(startMinutes, endMinutes)}
            </span>
          </div>

          {/* Conflict Warning */}
          {conflict && (
            <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-[#EA580C]/40 rounded-lg text-sm text-[#9A3412]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#EA580C]" />
              <div>
                <p className="font-semibold">Horario ocupado en esta sala</p>
                <p className="text-xs mt-0.5">
                  Ya existe &ldquo;{conflict.title}&rdquo; de{' '}
                  <span className="font-mono tabular-nums">
                    {formatMinutes(conflict.startMinutes)} – {formatMinutes(conflict.endMinutes)}
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="meeting-title"
                className="text-sm font-semibold text-[#0B1F3A]"
              >
                Título de la reunión
              </label>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {title.length}/{TITLE_MAX_LENGTH}
              </span>
            </div>
            <input
              id="meeting-title"
              type="text"
              required
              maxLength={TITLE_MAX_LENGTH}
              placeholder="Ej. Comité semanal de comunicaciones"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-[#0B1F3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-[#EA580C]"
            />
          </div>

          {/* Organizer / Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="meeting-organizer"
                className="text-sm font-semibold text-[#0B1F3A]"
              >
                Responsable <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {organizer.length}/{ORGANIZER_MAX_LENGTH}
              </span>
            </div>
            <input
              id="meeting-organizer"
              type="text"
              maxLength={ORGANIZER_MAX_LENGTH}
              placeholder="Ej. Nombre del responsable"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-[#0B1F3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-[#EA580C]"
            />
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="meeting-notes"
                className="text-sm font-semibold text-[#0B1F3A]"
              >
                Notas <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {notes.length}/{NOTES_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="meeting-notes"
              rows={2}
              maxLength={NOTES_MAX_LENGTH}
              placeholder="Detalles adicionales o requerimientos de la sala..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-[#0B1F3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-[#EA580C] resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {editingMeeting && onDelete ? (
              confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmDelete}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Confirmar eliminación
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setConfirmingDelete(false)}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-[#0B1F3A] cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#0B1F3A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || Boolean(conflict) || weekendSelected}
                className="px-5 py-2.5 bg-[#EA580C] hover:bg-[#DC4C04] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Guardando...'
                  : editingMeeting
                  ? 'Guardar cambios'
                  : 'Guardar reunión'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
