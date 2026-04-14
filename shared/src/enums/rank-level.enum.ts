export const RankLevels = [
  'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12',
  'M1', 'M2', 'M3', 'M4', 'M5', 'M6',
] as const;

export type RankLevel = (typeof RankLevels)[number];
