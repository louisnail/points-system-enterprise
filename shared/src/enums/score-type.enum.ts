export enum ScoreType {
  Fixed = 1,
  Range = 2,
}

export const ScoreTypeLabel: Record<ScoreType, string> = {
  [ScoreType.Fixed]: '固定分值',
  [ScoreType.Range]: '范围分值',
};
