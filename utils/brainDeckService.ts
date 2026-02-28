import { db } from '../lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface BrainDeckAttempt {
  easy: number;
  medium: number;
  hard: number;
}

export interface QuizQuestion {
  id: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correct: 'A' | 'B' | 'C';
  explanation: string;
}

export interface SavedQuizState {
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Array<{ selected: 'A' | 'B' | 'C' | null; correct: boolean }>;
  elapsedSeconds: number;
  savedAt: string;
}

/** Returns today's date in IST as YYYY-MM-DD */
export function getISTDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

const DAILY_LIMITS: Record<string, number> = { easy: 2, medium: 2, hard: 1 };
const PASS_THRESHOLD = 0.9; // 90%

/** Get today's attempt counts for a doctor */
export async function getDailyAttempts(doctorId: string): Promise<BrainDeckAttempt> {
  if (!db) return { easy: 0, medium: 0, hard: 0 };
  const today = getISTDateString();
  try {
    const ref = doc(db, 'brainDeckData', doctorId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { easy: 0, medium: 0, hard: 0 };
    const data = snap.data();
    return data?.attempts?.[today] || { easy: 0, medium: 0, hard: 0 };
  } catch {
    return { easy: 0, medium: 0, hard: 0 };
  }
}

/** Get unlocked difficulties (easy always unlocked; medium/hard unlocked by 90% pass) */
export async function getUnlockedDifficulties(doctorId: string): Promise<Set<string>> {
  const unlocked = new Set<string>(['easy']); // easy is always available
  if (!db) return unlocked;
  try {
    const ref = doc(db, 'brainDeckData', doctorId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return unlocked;
    const data = snap.data();
    const list: string[] = data?.unlockedDifficulties || ['easy'];
    list.forEach(d => unlocked.add(d));
    return unlocked;
  } catch {
    return unlocked;
  }
}

/** Called when a doctor passes a set with 90%+ — unlocks the next difficulty */
export async function unlockNextDifficulty(
  doctorId: string,
  passedDifficulty: 'easy' | 'medium' | 'hard'
): Promise<void> {
  if (!db) return;
  const next = passedDifficulty === 'easy' ? 'medium' : passedDifficulty === 'medium' ? 'hard' : null;
  if (!next) return;
  try {
    const ref = doc(db, 'brainDeckData', doctorId);
    const snap = await getDoc(ref);
    const existing: string[] = snap.exists() ? (snap.data()?.unlockedDifficulties || ['easy']) : ['easy'];
    if (!existing.includes(next)) {
      existing.push(next);
      if (snap.exists()) {
        await updateDoc(ref, { unlockedDifficulties: existing });
      } else {
        await setDoc(ref, { unlockedDifficulties: existing, attempts: {}, seenQuestions: {} });
      }
    }
  } catch (e) {
    console.error('BrainDeck: unlockNextDifficulty error', e);
  }
}

/** Record a completed set attempt */
export async function recordAttempt(
  doctorId: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<void> {
  if (!db) return;
  const today = getISTDateString();
  try {
    const ref = doc(db, 'brainDeckData', doctorId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        attempts: { [today]: { easy: 0, medium: 0, hard: 0, [difficulty]: 1 } },
        seenQuestions: {},
        unlockedDifficulties: ['easy']
      });
      return;
    }
    const data = snap.data();
    const todayAttempts = data?.attempts?.[today] || { easy: 0, medium: 0, hard: 0 };
    todayAttempts[difficulty] = (todayAttempts[difficulty] || 0) + 1;
    await updateDoc(ref, { [`attempts.${today}`]: todayAttempts });
  } catch (e) {
    console.error('BrainDeck: recordAttempt error', e);
  }
}

/** Record seen question IDs (7-day tracking) */
export async function recordSeenQuestions(
  doctorId: string,
  questionIds: string[]
): Promise<void> {
  if (!db) return;
  const today = getISTDateString();
  try {
    const ref = doc(db, 'brainDeckData', doctorId);
    const updates: Record<string, string> = {};
    questionIds.forEach(id => { updates[`seenQuestions.${id}`] = today; });
    await updateDoc(ref, updates).catch(async () => {
      await setDoc(ref, { seenQuestions: Object.fromEntries(questionIds.map(id => [id, today])), attempts: {}, unlockedDifficulties: ['easy'] }, { merge: true });
    });
  } catch (e) {
    console.error('BrainDeck: recordSeenQuestions error', e);
  }
}

/** Get IDs seen within last 7 days */
export async function getRecentlySeenIds(doctorId: string): Promise<Set<string>> {
  if (!db) return new Set();
  try {
    const ref = doc(db, 'brainDeckData', doctorId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return new Set();
    const seenMap: Record<string, string> = snap.data()?.seenQuestions || {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const recentIds = new Set<string>();
    Object.entries(seenMap).forEach(([id, date]) => {
      if (date >= sevenDaysAgoStr) recentIds.add(id);
    });
    return recentIds;
  } catch {
    return new Set();
  }
}

/** Pick 10 questions of a difficulty, avoiding recently seen, balanced by subject */
export function pickQuestions(
  allQuestions: QuizQuestion[],
  difficulty: 'easy' | 'medium' | 'hard',
  seenIds: Set<string>,
  count = 10
): QuizQuestion[] {
  const pool = allQuestions.filter(q => q.difficulty === difficulty && !seenIds.has(q.id));
  const bySubject: Record<string, QuizQuestion[]> = {};
  pool.forEach(q => {
    if (!bySubject[q.subject]) bySubject[q.subject] = [];
    bySubject[q.subject].push(q);
  });
  Object.values(bySubject).forEach(arr => arr.sort(() => Math.random() - 0.5));
  const subjects = Object.keys(bySubject);
  const selected: QuizQuestion[] = [];
  let i = 0;
  while (selected.length < count && subjects.some(s => bySubject[s].length > 0)) {
    const sub = subjects[i % subjects.length];
    if (bySubject[sub].length > 0) selected.push(bySubject[sub].shift()!);
    i++;
  }
  if (selected.length < count) {
    const fallback = allQuestions
      .filter(q => q.difficulty === difficulty && !selected.find(s => s.id === q.id))
      .sort(() => Math.random() - 0.5);
    selected.push(...fallback.slice(0, count - selected.length));
  }
  return selected.sort(() => Math.random() - 0.5);
}

/** Save quiz progress to localStorage */
export function saveQuizState(doctorId: string, state: SavedQuizState): void {
  try {
    localStorage.setItem(`braindeck_save_${doctorId}`, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** Load saved quiz progress from localStorage */
export function loadQuizState(doctorId: string): SavedQuizState | null {
  try {
    const raw = localStorage.getItem(`braindeck_save_${doctorId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SavedQuizState;
  } catch { return null; }
}

/** Clear saved quiz progress */
export function clearQuizState(doctorId: string): void {
  try {
    localStorage.removeItem(`braindeck_save_${doctorId}`);
  } catch { /* ignore */ }
}

/** Fetch health tip from the shared Template Uploader system (braindeck-page placement) */
export async function getHealthTip(): Promise<{ title: string; body: string; emoji: string; imageUrl?: string } | null> {
  if (!db) return null;
  try {
    const ref = doc(db, 'adminProfiles', 'super_admin');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const templates: Array<{
      category: string;
      isPublished: boolean;
      placements?: string[];
      imageUrl?: string;
      name: string;
      description?: string;
    }> = snap.data()?.globalTemplates || [];
    // Pick the first published health-tip with 'braindeck-page' placement
    const tip = templates.find(
      t => t.category === 'health-tip' && t.isPublished && t.placements?.includes('braindeck-page')
    );
    if (!tip) return null;
    return {
      title: tip.name,
      body: tip.description || '',
      emoji: '💡',
      imageUrl: tip.imageUrl,
    };
  } catch {
    return null;
  }
}

export { DAILY_LIMITS, PASS_THRESHOLD };
