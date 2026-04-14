import request from './request';

export function getUsers(params?: any) {
  return request.get('/users', { params });
}

export function getUserStats() {
  return request.get('/users/stats');
}

export function getCompanyBelongs() {
  return request.get('/users/company-belongs');
}

export function getUserById(id: number) {
  return request.get(`/users/${id}`);
}

export function createUser(data: any) {
  return request.post('/users', data);
}

export function updateUser(id: number, data: any) {
  return request.put(`/users/${id}`, data);
}

export function changeUserStatus(id: number, status: number) {
  return request.put(`/users/${id}/status`, { status });
}

export function toggleRankingDisabled(id: number, disabled: boolean) {
  return request.put(`/users/${id}/ranking-disabled`, { disabled });
}

export function deleteUser(id: number) {
  return request.delete(`/users/${id}`);
}

export function importUsers(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/users/import', formData);
}

export function exportUsers(params?: any) {
  return request.get('/users/export', { params, responseType: 'blob' });
}

export function getUserTemplate() {
  return request.get('/users/template', { responseType: 'blob' });
}

export function batchUpdateDepartment(userIds: number[], departmentId: number) {
  return request.put('/users/batch-department', { userIds, departmentId });
}

export function checkUserAssociations(ids: number[]) {
  return request.post('/users/check-associations', { ids });
}

export function batchDeleteUsers(ids: number[], force = false) {
  return request.post('/users/batch-delete', { ids, force });
}
