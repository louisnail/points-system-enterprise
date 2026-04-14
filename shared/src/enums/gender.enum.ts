export enum Gender {
  Male = 1,
  Female = 2,
}

export const GenderLabel: Record<Gender, string> = {
  [Gender.Male]: '男',
  [Gender.Female]: '女',
};
