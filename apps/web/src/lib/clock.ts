// The app's clock. In production it's the phone's. In previews the made-up scenario is set at a fixed
// moment (Sunday 18 Oct 2026, 8:40 pm), so the fake moves this clock there on load and it runs on from
// it: "Today", a manual entry's time and the near-duplicate check all agree with the made-up data.
let offset = 0;

export const now = (): Date => new Date(Date.now() + offset);
export const nowIso = (): string => now().toISOString();

/** Previews only: where the scenario says it is now. */
export function setClock(at: string) {
  offset = Date.parse(at) - Date.now();
}
