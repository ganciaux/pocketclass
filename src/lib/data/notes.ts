import { addDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { newestFirst } from '#lib/notes/notes.ts';
import { querySource, type Subscribe } from './sources.ts';
import { noteRef, notesCol } from './refs.ts';
import type { Note, NoteStatus, WithId } from './types.ts';
import { inBackground } from './writes.ts';

// Notes of a profile: written by the child (offline-friendly), reviewed by the parent.

/** What a note is about; every id null = a free note. */
export interface NoteTarget {
	conceptId?: string | null;
	chapterId?: string | null;
	subjectId?: string | null;
	exerciseId?: string | null;
}

export const watchNotes = (familyId: string, profileId: string): Subscribe<WithId<Note>[]> =>
	querySource(notesCol(familyId, profileId), newestFirst);

export function addNote(familyId: string, profileId: string, target: NoteTarget, text: string) {
	inBackground(
		addDoc(notesCol(familyId, profileId), {
			conceptId: target.conceptId ?? null,
			chapterId: target.chapterId ?? null,
			subjectId: target.subjectId ?? null,
			exerciseId: target.exerciseId ?? null,
			text,
			status: 'open',
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		}),
		'add note'
	);
}

/** Child edit: the note goes back to "open" for the parent. */
export function updateNoteText(familyId: string, profileId: string, noteId: string, text: string) {
	inBackground(
		updateDoc(noteRef(familyId, profileId, noteId), {
			text,
			status: 'open',
			updatedAt: serverTimestamp()
		}),
		'update note'
	);
}

export function deleteNote(familyId: string, profileId: string, noteId: string) {
	inBackground(deleteDoc(noteRef(familyId, profileId, noteId)), 'delete note');
}

/** Parent review. */
export function setNoteStatus(
	familyId: string,
	profileId: string,
	noteId: string,
	status: NoteStatus
) {
	inBackground(updateDoc(noteRef(familyId, profileId, noteId), { status }), 'note status');
}
