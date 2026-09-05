/**
 * Capa de compatibilidad para reemplazar `firebase/firestore` Timestamp.
 * Mantiene la misma API (`.toDate()`, `.toMillis()`, `.seconds`, `Timestamp.now()`,
 * `Timestamp.fromDate()`) para no reescribir los ~40 usos de fechas en la app.
 * Supabase devuelve timestamptz como string ISO; aquí lo envolvemos.
 */
export class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  toDate(): Date {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6));
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  /** Permite comparaciones con >, <, etc. */
  valueOf(): number {
    return this.toMillis();
  }

  toString(): string {
    return this.toDate().toISOString();
  }

  toJSON(): string {
    return this.toDate().toISOString();
  }

  static now(): Timestamp {
    return Timestamp.fromDate(new Date());
  }

  static fromDate(date: Date): Timestamp {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }

  /** Convierte un ISO/valor de Supabase a Timestamp (o undefined). */
  static fromISO(value: string | Date | null | undefined): Timestamp | undefined {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return undefined;
    return Timestamp.fromDate(d);
  }
}
