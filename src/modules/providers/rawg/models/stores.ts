// prettier-ignore
export const RawgStore = {
  "All Stores": 0,
  "Steam": 1,
  "Xbox Store": 2,
  "PlayStation Store": 3,
  "App Store": 4,
  "GOG": 5,
  "Nintendo Store": 6,
  "Xbox 360 Store": 7,
  "Google Play": 8,
  "Itch.io": 9,
  "EPIC Games": 11,
} as const;

export type RawgStore = (typeof RawgStore)[keyof typeof RawgStore];
