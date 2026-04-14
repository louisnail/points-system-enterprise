export enum Role {
  SuperAdmin = 'super_admin',
  DeptAdmin = 'dept_admin',
  Employee = 'employee',
}

export const RoleLabel: Record<Role, string> = {
  [Role.SuperAdmin]: '超级管理员',
  [Role.DeptAdmin]: '部门管理员',
  [Role.Employee]: '普通员工',
};
