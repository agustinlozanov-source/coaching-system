import { Timestamp } from '@/lib/firestore-compat';

export type UserRole = 'admin' | 'coach' | 'colaborador' | 'gerente';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLogin?: Timestamp;
}
