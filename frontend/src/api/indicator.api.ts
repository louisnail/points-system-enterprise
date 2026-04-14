import request from './request';

export function getIndicatorCategories(params?: any) {
  return request.get('/indicator-categories', { params });
}

export function createIndicatorCategory(data: any) {
  return request.post('/indicator-categories', data);
}

export function updateIndicatorCategory(id: number, data: any) {
  return request.put(`/indicator-categories/${id}`, data);
}

export function deleteIndicatorCategory(id: number) {
  return request.delete(`/indicator-categories/${id}`);
}

export function getCategoryTemplate() {
  return request.get('/indicator-categories/template', { responseType: 'blob' });
}

export function importCategories(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/indicator-categories/import', formData);
}

export function batchDeactivateCategories(ids: number[]) {
  return request.put('/indicator-categories/batch-deactivate', { ids });
}

export function batchDeleteCategories(ids: number[]) {
  return request.post('/indicator-categories/batch-delete', { ids });
}

export function checkCategoryAssociations(ids: number[]) {
  return request.post('/indicator-categories/check-associations', { ids });
}

export function getIndicators(params?: any) {
  return request.get('/indicators', { params });
}

export function searchIndicators(params: { keyword: string; rankingListIds?: string; limit?: number }) {
  return request.get('/indicators/search', { params });
}

export function getIndicatorById(id: number) {
  return request.get(`/indicators/${id}`);
}

export function createIndicator(data: any) {
  return request.post('/indicators', data);
}

export function updateIndicator(id: number, data: any) {
  return request.put(`/indicators/${id}`, data);
}

export function deleteIndicator(id: number) {
  return request.delete(`/indicators/${id}`);
}

export function importIndicators(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/indicators/import', formData);
}

export function exportIndicators() {
  return request.get('/indicators/export', { responseType: 'blob' });
}

export function getIndicatorTemplate() {
  return request.get('/indicators/template', { responseType: 'blob' });
}

export function batchSetIndicatorRankingList(ids: number[], rankingListId: number | null) {
  return request.put('/indicators/batch-ranking-list', { ids, rankingListId });
}

export function checkIndicatorAssociations(ids: number[]) {
  return request.post('/indicators/check-associations', { ids });
}

export function batchDeleteIndicators(ids: number[]) {
  return request.post('/indicators/batch-delete', { ids });
}
