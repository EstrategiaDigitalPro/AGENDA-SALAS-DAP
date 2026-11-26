import { useState } from 'react';
import { Calendar, Clock, MapPin, Pencil, Trash2, User, X } from 'lucide-react';
import {
  formatDuration,
  formatMinutes,
  formatSpanishFullDate,
  ROOM_BY_ID,
} from '../constants/rooms';
import type { Meeting } from '../types/meeting';

interface MeetingDetailModalProps {
  meeting: Meeting | null;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => Promise<void>;
}

export function MeetingDetailModal({
  meeting,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
}: MeetingDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!meeting) return null;

  const room = ROOM_BY_ID[meeting.roomId];

  const handleDelete = async () => {
    setDeleting(true);
    setErrorMsg(null);
    try {
      await onDelete(meeting.id);
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo eliminar la reunión.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071426]/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-[#0B1F3A] text-white px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-orange-300 truncate">
              {room.name}
            </p>
            <h2
              id="detail-modal-title"
              className="text-lg font-bold tracking-tight truncate mt-0.5"
            >
              {meeting.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              onClose();
            }}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#163661] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3 text-sm text-[#0B1F3A]">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{room.name}</span>
                <span className="text-slate-400 mx-1.5" aria-hidden="true">·</span>
                <span className="text-slate-600">{room.location}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
              <span className="font-medium">{formatSpanishFullDate(meeting.date)}</span>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
              <div>
                <span className="font-mono tabular-nums font-semibold">
                  {formatMinutes(meeting.startMinutes)} – {formatMinutes(meeting.endMinutes)}
                </span>
                <span className="text-slate-400 mx-1.5" aria-hidden="true">·</span>
                <span className="text-slate-600">
                  {formatDuration(meeting.startMinutes, meeting.endMinutes)}
                </span>
              </div>
            </div>

            {meeting.organizer && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                <span>{meeting.organizer}</span>
              </div>
            )}
          </div>

          {meeting.notes && (
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1">Notas</p>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {meeting.notes}
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            {isAdmin ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-[#0B1F3A] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(meeting);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1F3A] hover:bg-[#122E53] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              )
            ) : (
              <span className="text-xs text-slate-500">Vista de solo lectura</span>
            )}

            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#0B1F3A] hover:bg-slate-100 rounded-lg transition-colors ml-auto cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
