import { getFirebaseDb } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Message } from '../store/useScenarioStore';

export interface PlayRecord {
  id?: string;
  userId: string;
  scenarioId: string;
  messages: Message[];
  questionCount: number;
  finished: boolean;
  timestamp: number;
}

export async function savePlayRecord(record: PlayRecord) {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, 'records'), {
    ...record,
    timestamp: Date.now(),
  });
  return ref.id;
}

export async function getUserRecords(userId: string): Promise<PlayRecord[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, 'records'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as PlayRecord));
}

export async function getRecordById(id: string): Promise<PlayRecord | null> {
  const db = getFirebaseDb();
  const ref = doc(db, 'records', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PlayRecord;
} 