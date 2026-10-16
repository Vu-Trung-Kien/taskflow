export const DATABASE_PROBE = Symbol('DATABASE_PROBE');

export interface DatabaseProbe {
  check(): Promise<void>;
}
