export enum UserStatus {
  Active = 1,
  Frozen = 2,
  Resigned = 3,
  Standby = 4,
  Suspended = 5,
}

export const UserStatusLabel: Record<UserStatus, string> = {
  [UserStatus.Active]: '在职',
  [UserStatus.Frozen]: '冻结',
  [UserStatus.Resigned]: '离职',
  [UserStatus.Standby]: '待岗',
  [UserStatus.Suspended]: '停薪留职',
};
