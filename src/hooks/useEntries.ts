import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Entry } from '../db/database';

export function useEntries() {
  return useLiveQuery<Entry[]>(() =>
    db.entries.orderBy('createdAt').reverse().toArray(),
    [], []
  );
}
