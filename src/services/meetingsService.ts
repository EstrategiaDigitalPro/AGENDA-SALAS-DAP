import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  DATE_REGEX,
  END_MINUTES,
  NOTES_MAX_LENGTH,
  ORGANIZER_MAX_LENGTH,
  ROOM_IDS,
  START_MINUTES,
  STEP_MINUTES,
  TITLE_MAX_LENGTH,
} from '../constants/rooms';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import type { Meeting, MeetingDraft, RoomId } from '../types/meeting';

const MEETINGS_COLLECTION = 'meetings';

function sanitizeDraft(draft: MeetingDraft): MeetingDraft {
  if (!ROOM_IDS.includes(draft.roomId)) {
    throw new Error('La sala seleccionada no es válida.');
  }

  const title = draft.title.trim().slice(0, TITLE_MAX_LENGTH);
  if (title.length === 0) {
    throw new Error('Ingresa un título para la reunión.');
  }

  const organizer = draft.organizer.trim().slice(0, ORGANIZER_MAX_LENGTH);
  const notes = draft.notes.trim().slice(0, NOTES_MAX_LENGTH);

  if (!DATE_REGEX.test(draft.date)) {
    throw new Error('La fecha seleccionada no es válida.');
  }

  const startMinutes = Math.trunc(draft.startMinutes);
  const endMinutes = Math.trunc(draft.endMinutes);

  if (
    startMinutes < START_MINUTES ||
    startMinutes > END_MINUTES - STEP_MINUTES ||
    startMinutes % STEP_MINUTES !== 0
  ) {
    throw new Error('La hora de inicio debe estar entre 7:00 AM y 6:30 PM en espacios de 30 minutos.');
  }

  if (
    endMinutes < START_MINUTES + STEP_MINUTES ||
    endMinutes > END_MINUTES ||
    endMinutes % STEP_MINUTES !== 0 ||
    endMinutes <= startMinutes
  ) {
    throw new Error('La hora de fin debe ser posterior al inicio y terminar máximo a las 7:00 PM.');
  }

  return {
    roomId: draft.roomId,
    title,
    organizer,
    notes,
    date: draft.date,
    startMinutes,
    endMinutes,
  };
}

export function findConflictingMeeting(
  meetings: Meeting[],
  draft: Pick<MeetingDraft, 'roomId' | 'date' | 'startMinutes' | 'endMinutes'>,
  excludeMeetingId?: string
): Meeting | undefined {
  return meetings.find((m) => {
    if (excludeMeetingId && m.id === excludeMeetingId) return false;
    if (m.roomId !== draft.roomId || m.date !== draft.date) return false;
    return draft.startMinutes < m.endMinutes && draft.endMinutes > m.startMinutes;
  });
}

export function subscribeMeetings(
  onData: (meetings: Meeting[]) => void,
  onError: (err: Error) => void
): () => void {
  const meetingsQuery = query(
    collection(db, MEETINGS_COLLECTION),
    where('roomId', 'in', ROOM_IDS),
    limit(2000)
  );

  return onSnapshot(
    meetingsQuery,
    (snapshot) => {
      const items: Meeting[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          roomId: data.roomId as RoomId,
          title: String(data.title ?? ''),
          organizer: String(data.organizer ?? ''),
          notes: String(data.notes ?? ''),
          date: String(data.date ?? ''),
          startMinutes: Number(data.startMinutes ?? START_MINUTES),
          endMinutes: Number(data.endMinutes ?? START_MINUTES + STEP_MINUTES),
          createdBy: String(data.createdBy ?? ''),
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });
      items.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startMinutes - b.startMinutes;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, MEETINGS_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createMeeting(draft: MeetingDraft): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Debes iniciar sesión como administradora para agendar.');
  }
  const clean = sanitizeDraft(draft);

  try {
    await addDoc(collection(db, MEETINGS_COLLECTION), {
      ...clean,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, MEETINGS_COLLECTION);
  }
}

export async function updateMeeting(meetingId: string, draft: MeetingDraft): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Debes iniciar sesión como administradora para editar.');
  }
  const clean = sanitizeDraft(draft);
  const path = `${MEETINGS_COLLECTION}/${meetingId}`;

  try {
    await updateDoc(doc(db, MEETINGS_COLLECTION, meetingId), {
      roomId: clean.roomId,
      title: clean.title,
      organizer: clean.organizer,
      notes: clean.notes,
      date: clean.date,
      startMinutes: clean.startMinutes,
      endMinutes: clean.endMinutes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Debes iniciar sesión como administradora para eliminar.');
  }
  const path = `${MEETINGS_COLLECTION}/${meetingId}`;

  try {
    await deleteDoc(doc(db, MEETINGS_COLLECTION, meetingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
