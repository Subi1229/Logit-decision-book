import Dexie, { type Table } from 'dexie';

export interface Revisit {
  date: number;
  note: string;
  outcome: 'confirmed' | 'revised';
}

export interface Entry {
  id: string;
  title: string;
  context: string;
  decision: string;
  why: string;
  alternatives?: string;
  tradeoffs?: string;
  project?: string;
  type?: 'visual' | 'interaction' | 'ia' | 'copy' | 'technical' | 'strategic';
  confidence?: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  updatedAt: number;
  revisits?: Revisit[];
}

class LogitDatabase extends Dexie {
  entries!: Table<Entry>;

  constructor() {
    super('logit');
    this.version(1).stores({
      entries: 'id, title, project, type, confidence, createdAt, updatedAt',
    });
  }
}

export const db = new LogitDatabase();
