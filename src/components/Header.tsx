import { CalendarPlus, LogIn, RefreshCw } from 'lucide-react';
import { ROOMS } from '../constants/rooms';
import type { ViewMode } from '../types/meeting';

interface HeaderProps {
  activeView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  isAdmin: boolean;
  isSignedIn: boolean;
  authLoading: boolean;
  onOpenNewMeeting: () => void;
  onSignIn: () => void;
}

export function Header({
  activeView,
  onSelectView,
  isAdmin,
  isSignedIn,
  authLoading,
  onOpenNewMeeting,
  onSignIn,
}: HeaderProps) {
  return (
    <header className="bg-[#0B1F3A] text-white border-b border-[#183863] sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Title */}
        <button
          type="button"
          onClick={() => onSelectView('sala-piso-8-dap')}
          className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] rounded"
        >
          AGENDA SALAS DAP
        </button>

        {/* Zone 2: Single-line Room Navigation Links (Desktop) */}
        <nav
          aria-label="Salas de reuniones"
          className="hidden lg:flex items-center gap-7 text-sm font-medium"
        >
          {ROOMS.map((room) => {
            const isActive = activeView === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectView(room.id)}
                className={`relative py-5 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {room.name}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-[3px] ${room.tabUnderlineClass}`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          {isAdmin ? (
            <button
              type="button"
              onClick={onOpenNewMeeting}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#EA580C] hover:bg-[#F97316] text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CalendarPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Agendar reunión</span>
            </button>
          ) : isSignedIn ? (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#163661] hover:bg-[#1E477D] text-white border border-[#2A538B] text-xs sm:text-sm font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
            >
              <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Cambiar cuenta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#163661] hover:bg-[#1E477D] text-white border border-[#2A538B] text-xs sm:text-sm font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
            >
              <LogIn className="w-4 h-4 text-[#F97316] shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Acceso administradora</span>
              <span className="sm:hidden">Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
