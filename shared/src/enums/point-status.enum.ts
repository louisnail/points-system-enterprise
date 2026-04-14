export enum PointStatus {
  Process = 1,
  Result = 2,
}

export const PointStatusLabel: Record<PointStatus, string> = {
  [PointStatus.Process]: '过程分',
  [PointStatus.Result]: '结果分',
};
