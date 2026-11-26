import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, FileSpreadsheet, LayoutGrid, LogOut } from 'lucide-react';
import { Header } from './components/Header';
import { MeetingDetailModal } from './components/MeetingDetailModal';
import { MeetingModal } from './components/MeetingModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { ScheduleGrid, type ScheduleDisplayMode } from './components/ScheduleGrid';
import {
  addDays,
  ADMIN_EMAIL,
  END_MINUTES,
  formatWeekRange,
  getDefaultWorkDateISO,
  getMondayOfWeek,
  ROOM_BY_ID,
  ROOMS,
  START_MINUTES,
  STEP_MINUTES,
  toISODate,
} from './constants/rooms';
import { auth, googleProvider } from './firebase';
import {
  createMeeting,
  deleteMeeting,
  subscribeMeetings,
  updateMeeting,
} from './services/meetingsService';
import type { Meeting, MeetingDraft, RoomId, ViewMode } from './types/meeting';

export default function App() {
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const defaultWorkDateISO = useMemo(() => getDefaultWorkDateISO(todayISO), [todayISO]);

  const [activeView, setActiveView] = useState<ViewMode>('sala-piso-8-dap');
  const [displayMode, setDisplayMode] = useState<ScheduleDisplayMode>('cards');
  const [selectedDateISO, setSelectedDateISO] = useState<string>(defaultWorkDateISO);
  const [weekMondayISO, setWeekMondayISO] = useState<string>(() =>
    getMondayOfWeek(defaultWorkDateISO)
  );

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [modalDraft, setModalDraft] = useState<MeetingDraft>({
    roomId: 'sala-piso-8-dap',
    title: '',
    organizer: '',
    notes: '',
    date: defaultWorkDateISO,
    startMinutes: 540, // 9:00 AM
    endMinutes: 600, // 10:00 AM
  });
  const [inspectingMeeting, setInspectingMeeting] = useState<Meeting | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const defaultYearMonth = useMemo(() => todayISO.slice(0, 7), [todayISO]);

  const isAdmin = Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      setAuthNotice(null);
      const nextIsAdmin = Boolean(
        currentUser &&
          currentUser.emailVerified &&
          currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      );
      if (!nextIsAdmin) {
        setIsModalOpen(false);
        setIsReportOpen(false);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time schedule updates for all 3 rooms once auth initializes
  useEffect(() => {
    if (!authReady) return;
    setMeetingsLoading(true);
    setLoadError(null);

    const unsub = subscribeMeetings(
      (items) => {
        setMeetings(items);
        setMeetingsLoading(false);
      },
      (err) => {
        setLoadError(err.message);
        setMeetingsLoading(false);
      }
    );

    return () => unsub();
  }, [authReady]);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthNotice(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      if (code === 'auth/popup-blocked') {
        setAuthNotice(
          'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes en este sitio e intenta de nuevo.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        setAuthNotice(
          `Este dominio (${currentHost}) aún no está autorizado en Firebase Authentication. Agrégalo en Firebase Console → Authentication → Settings → Authorized domains para iniciar sesión desde este enlace.`
        );
      } else {
        setAuthNotice(
          `No se pudo abrir el inicio de sesión con Google (${code || 'error desconocido'}). Intenta de nuevo o abre la vista de desarrollo en AI Studio para administrar.`
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setIsModalOpen(false);
      setIsReportOpen(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOpenNewMeeting = () => {
    if (!isAdmin) return;
    const defaultDate =
      weekMondayISO === getMondayOfWeek(defaultWorkDateISO)
        ? defaultWorkDateISO
        : weekMondayISO;

    setEditingMeeting(null);
    setModalDraft({
      roomId: activeView,
      title: '',
      organizer: '',
      notes: '',
      date: defaultDate,
      startMinutes: 540,
      endMinutes: 600,
    });
    setIsModalOpen(true);
  };

  const handleSlotClick = (roomId: RoomId, dateISO: string, startMinutes: number) => {
    if (!isAdmin) return;
    const clampedStart = Math.max(START_MINUTES, Math.min(startMinutes, END_MINUTES - STEP_MINUTES));
    const clampedEnd = Math.min(clampedStart + STEP_MINUTES * 2, END_MINUTES);
    setEditingMeeting(null);
    setModalDraft({
      roomId,
      title: '',
      organizer: '',
      notes: '',
      date: dateISO,
      startMinutes: clampedStart,
      endMinutes: clampedEnd > clampedStart ? clampedEnd : clampedStart + STEP_MINUTES,
    });
    setIsModalOpen(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    if (!isAdmin) return;
    setEditingMeeting(meeting);
    setModalDraft({
      roomId: meeting.roomId,
      title: meeting.title,
      organizer: meeting.organizer,
      notes: meeting.notes,
      date: meeting.date,
      startMinutes: meeting.startMinutes,
      endMinutes: meeting.endMinutes,
    });
    setIsModalOpen(true);
  };

  const handleSaveMeeting = async (draft: MeetingDraft, editingId?: string) => {
    if (editingId) {
      await updateMeeting(editingId, draft);
    } else {
      await createMeeting(draft);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    await deleteMeeting(meetingId);
  };

  const handlePrevPeriod = () => {
    const prevWeek = addDays(weekMondayISO, -7);
    setWeekMondayISO(prevWeek);
    setSelectedDateISO(prevWeek);
  };

  const handleNextPeriod = () => {
    const nextWeek = addDays(weekMondayISO, 7);
    setWeekMondayISO(nextWeek);
    setSelectedDateISO(nextWeek);
  };

  const handleGoToday = () => {
    setSelectedDateISO(defaultWorkDateISO);
    setWeekMondayISO(getMondayOfWeek(defaultWorkDateISO));
  };

  const handleSelectDate = (iso: string) => {
    setSelectedDateISO(iso);
    setWeekMondayISO(getMondayOfWeek(iso));
  };

  const currentRoomCount = useMemo(() => {
    const weekFridayISO = addDays(weekMondayISO, 4);
    return meetings.filter(
      (m) =>
        m.roomId === activeView &&
        m.date >= weekMondayISO &&
        m.date <= weekFridayISO
    ).length;
  }, [activeView, meetings, weekMondayISO]);

  const activeRoom = ROOM_BY_ID[activeView];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${activeRoom.pageBgClass} text-[#0B1F3A]`}>
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        isAdmin={isAdmin}
        isSignedIn={Boolean(user)}
        authLoading={authLoading}
        onOpenNewMeeting={handleOpenNewMeeting}
        onSignIn={handleSignIn}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Mobile/Tablet Touch-Friendly Room Switcher Cards */}
        <section aria-label="Elegir sala" className="lg:hidden grid grid-cols-3 gap-2">
          {ROOMS.map((room) => {
            const isActive = activeView === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setActiveView(room.id)}
                className={`min-h-[48px] px-2.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center leading-tight ${
                  isActive
                    ? `${room.cardBgClass} ${room.cardBorderClass} text-white shadow-sm`
                    : `bg-white/90 text-[#0B1F3A] ${room.slotHourBorderClass}`
                }`}
              >
                {room.name}
              </button>
            );
          })}
        </section>

        {/* Non-admin account notice or auth error */}
        {user && !isAdmin && (
          <div className="bg-white border border-orange-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-[#0B1F3A]">
              Sesión iniciada como <span className="font-semibold">{user.email}</span>. Solo la administradora autorizada puede agendar o editar reuniones.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#EA580C] hover:text-[#C2410C] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        {authNotice && (
          <div className="bg-orange-50 border border-[#EA580C]/30 rounded-2xl px-4 py-3 text-sm text-[#9A3412]">
            {authNotice}
          </div>
        )}

        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
            No se pudo sincronizar la agenda en tiempo real. Recarga la página para reintentar.
          </div>
        )}

        {/* Workspace Toolbar */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1F3A]">
              {activeRoom.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-[#0B1F3A]/75">
              <span>Lunes a Viernes</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">7:00 AM – 7:00 PM</span>
              <span aria-hidden="true">·</span>
              <span>Espacios de 30 min</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#0B1F3A] font-mono tabular-nums">
                {currentRoomCount}{' '}
                {currentRoomCount === 1 ? 'reunión' : 'reuniones'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Friendly Mini-App View Mode Toggle */}
            <div className="inline-flex items-center bg-white/90 border border-slate-200 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setDisplayMode('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  displayMode === 'cards'
                    ? 'bg-[#0B1F3A] text-white'
                    : 'text-[#0B1F3A] hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('slots')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  displayMode === 'slots'
                    ? 'bg-[#0B1F3A] text-white'
                    : 'text-[#0B1F3A] hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Horarios 30 min</span>
              </button>
            </div>

            {/* Period Navigation */}
            <div className="inline-flex items-center bg-white/90 border border-slate-200 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={handlePrevPeriod}
                aria-label="Semana anterior"
                className="p-2 text-[#0B1F3A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#EA580C] hover:bg-orange-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Hoy
              </button>
              <span className="px-2 text-xs font-semibold text-[#0B1F3A] whitespace-nowrap font-mono tabular-nums">
                {formatWeekRange(weekMondayISO)}
              </span>
              <button
                type="button"
                onClick={handleNextPeriod}
                aria-label="Siguiente semana"
                className="p-2 text-[#0B1F3A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Color Legend & Admin Session Info */}
        <section className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[#0B1F3A]/80">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                aria-hidden="true"
                className={`w-3.5 h-3.5 rounded border ${activeRoom.slotBgClass} ${activeRoom.slotHourBorderClass}`}
              />
              <span>Disponible</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                aria-hidden="true"
                className={`w-3.5 h-3.5 rounded border ${activeRoom.cardBgClass} ${activeRoom.cardBorderClass}`}
              />
              <span>Reservado</span>
            </span>
            <span className="text-[#0B1F3A]/65 hidden sm:inline">
              {isAdmin
                ? 'Toca «Agendar reunión» o un horario disponible para reservar.'
                : 'Toca cualquier reunión para ver sus detalles completos.'}
            </span>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[#0B1F3A]/80">
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white border border-slate-200 rounded-lg font-semibold text-[#0B1F3A] shadow-2xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>Informe mensual</span>
              </button>
              <span>
                Administradora:{' '}
                <strong className="font-semibold text-[#0B1F3A]">
                  {user?.email}
                </strong>
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 font-semibold text-[#EA580C] hover:text-[#C2410C] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </section>

        {/* Main Mini-App Schedule Board */}
        <ScheduleGrid
          activeView={activeView}
          displayMode={displayMode}
          weekMondayISO={weekMondayISO}
          selectedDateISO={selectedDateISO}
          todayISO={todayISO}
          meetings={meetings}
          loading={meetingsLoading}
          isAdmin={isAdmin}
          onSelectDate={handleSelectDate}
          onSlotClick={handleSlotClick}
          onMeetingClick={(meeting) => setInspectingMeeting(meeting)}
        />

        {/* Mobile Bottom Admin CTA */}
        {isAdmin && (
          <div className="sm:hidden pt-1">
            <button
              type="button"
              onClick={handleOpenNewMeeting}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#EA580C] hover:bg-[#DC4C04] text-white text-sm font-semibold rounded-2xl shadow-sm transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Agendar nueva reunión</span>
            </button>
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 mt-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>AGENDA SALAS DAP · Sala piso 8 DAP · Sala A OPT · Sala B OPT</span>
          <span>Lunes a Viernes · 7:00 AM – 7:00 PM</span>
        </div>
      </footer>

      {/* Admin Create / Edit Modal */}
      {isAdmin && (
        <MeetingModal
          isOpen={isModalOpen}
          editingMeeting={editingMeeting}
          initialDraft={modalDraft}
          existingMeetings={meetings}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveMeeting}
          onDelete={handleDeleteMeeting}
        />
      )}

      {/* Admin Monthly Report Modal */}
      {isAdmin && (
        <MonthlyReportModal
          isOpen={isReportOpen}
          meetings={meetings}
          defaultYearMonth={defaultYearMonth}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Read-Only / Inspect Detail Modal */}
      <MeetingDetailModal
        meeting={inspectingMeeting}
        isAdmin={isAdmin}
        onClose={() => setInspectingMeeting(null)}
        onEdit={handleEditMeeting}
        onDelete={handleDeleteMeeting}
      />
    </div>
  );
}
