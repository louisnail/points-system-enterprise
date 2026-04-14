export enum Direction {
  Plus = 1,
  Minus = -1,
}

export const DirectionLabel: Record<Direction, string> = {
  [Direction.Plus]: '加分',
  [Direction.Minus]: '扣分',
};
