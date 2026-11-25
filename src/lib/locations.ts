// The 7 Gyro Republic locations (Toast store names). Managers are granted a subset of these.
export const LOCATIONS = [
  "Fondren",
  "Richmond",
  "Katy",
  "Sugar Land",
  "Missouri City",
  "Pearland",
  "Spring Klein",
] as const;

export type Location = (typeof LOCATIONS)[number];

export function isLocation(x: string): x is Location {
  return (LOCATIONS as readonly string[]).includes(x);
}
