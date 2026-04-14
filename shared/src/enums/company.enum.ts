export enum CompanyBelong {
  TD = 'TD',
  XD = 'XD',
  TY = 'TY',
  WB = 'WB',
}

export const CompanyBelongLabel: Record<CompanyBelong, string> = {
  [CompanyBelong.TD]: '同盾',
  [CompanyBelong.XD]: '小盾',
  [CompanyBelong.TY]: '同彦',
  [CompanyBelong.WB]: '万宝',
};
