import request from './request';

export function getCustomFields(module: string) {
  return request.get('/custom-fields', { params: { module } });
}

export function createCustomField(data: any) {
  return request.post('/custom-fields', data);
}

export function updateCustomField(id: number, data: any) {
  return request.put(`/custom-fields/${id}`, data);
}

export function deleteCustomField(id: number) {
  return request.delete(`/custom-fields/${id}`);
}

export function sortCustomFields(items: { id: number; sortOrder: number }[]) {
  return request.put('/custom-fields/sort', items);
}
