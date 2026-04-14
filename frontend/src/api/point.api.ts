import request from './request';

export function getPoints(params?: any) {
  return request.get('/points', { params });
}

export function getMyPoints(params?: any) {
  return request.get('/points/my', { params });
}

export function getPointDetail(id: number) {
  return request.get(`/points/${id}`);
}

export function createPoint(data: any) {
  return request.post('/points', data);
}

export function batchCreatePoints(data: { records: any[]; belongMonth?: string }) {
  return request.post('/points/batch', data);
}

export function checkPointDuplicates(records: Array<{ userId: number; indicatorId: number; score: number; belongMonth: string }>) {
  return request.post('/points/check-duplicates', { records });
}

export function importPoints(file: File, belongMonth: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('belongMonth', belongMonth);
  return request.post('/points/import', formData);
}

export function previewImportPoints(file: File, belongMonth: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('belongMonth', belongMonth);
  return request.post('/points/import-preview', formData);
}

export function confirmImportPoints(records: Array<{ userId: number; indicatorId: number; score: number; description?: string; belongMonth: string }>) {
  return request.post('/points/import-confirm', { records });
}

export function auditPoint(id: number, data: { auditStatus: number; auditRemark?: string }) {
  return request.put(`/points/${id}/audit`, data);
}

export function updatePoint(id: number, data: { score?: number; description?: string; belongMonth?: string }) {
  return request.put(`/points/${id}`, data);
}

export function voidPoint(id: number) {
  return request.put(`/points/${id}/void`);
}

export function batchVoidPoints(ids: number[]) {
  return request.post('/points/batch-void', { ids });
}

export function batchAuditPoints(data: { ids: number[]; auditStatus: number; auditRemark?: string }) {
  return request.post('/points/batch-audit', data);
}

export function getPointTemplate() {
  return request.get('/points/template', { responseType: 'blob' });
}

export function exportPoints(params?: any) {
  return request.get('/points/export', { params, responseType: 'blob' });
}

// Process points
export function getProcessPoints(params: { belongMonth: string; userId?: number }) {
  return request.get('/process-points', { params });
}

export function getProcessPointHistory(userId: number, indicatorId: number) {
  return request.get(`/process-points/history/${userId}/${indicatorId}`);
}

export function upsertProcessPoint(data: any) {
  return request.post('/process-points', data);
}

export function importProcessPoints(file: File, belongMonth: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('belongMonth', belongMonth);
  return request.post('/process-points/import', formData);
}

export function getProcessPointTemplate() {
  return request.get('/process-points/template', { responseType: 'blob' });
}
