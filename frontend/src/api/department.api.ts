import request from './request';

export function getDepartments() {
  return request.get('/departments');
}

export function getDepartmentTree() {
  return request.get('/departments/tree');
}

export function getDepartmentById(id: number) {
  return request.get(`/departments/${id}`);
}

export function createDepartment(data: any) {
  return request.post('/departments', data);
}

export function updateDepartment(id: number, data: any) {
  return request.put(`/departments/${id}`, data);
}

export function deleteDepartment(id: number) {
  return request.delete(`/departments/${id}`);
}

export function sortDepartments(items: { id: number; sortOrder: number; parentId?: number }[]) {
  return request.put('/departments/sort', items);
}

export function getDepartmentEmployees(deptId: number, params?: { keyword?: string; companyBelong?: string }) {
  return request.get(`/departments/${deptId}/employees`, { params });
}
