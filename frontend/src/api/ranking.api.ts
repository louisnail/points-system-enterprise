import request from './request';

export function getMonthlyRanking(params: { belongMonth: string; rankingListId?: number }) {
  return request.get('/rankings', { params });
}

export function getSecondaryRanking(params: { belongMonth: string; rankingListId: number }) {
  return request.get('/rankings/secondary', { params });
}

export function getUserRanking(params: { userId: number; belongMonth: string }) {
  return request.get('/rankings/user', { params });
}

export function recalculateRankings(belongMonth: string) {
  return request.post('/rankings/recalculate', null, { params: { belongMonth } });
}

// Quarter Star
export function getQuarterStars(params: { quarter: string; rankingListId?: number }) {
  return request.get('/quarter-stars', { params });
}

export function getPublishedQuarterStars(params: { quarter: string; rankingListId?: number }) {
  return request.get('/quarter-stars/published', { params });
}

export function getQuarterList() {
  return request.get('/quarter-stars/quarters');
}

export function createQuarterStar(data: any) {
  return request.post('/quarter-stars', data);
}

export function batchCreateQuarterStars(data: { items: any[] }) {
  return request.post('/quarter-stars/batch', data);
}

export function updateQuarterStar(id: number, data: any) {
  return request.put(`/quarter-stars/${id}`, data);
}

export function deleteQuarterStar(id: number) {
  return request.delete(`/quarter-stars/${id}`);
}

export function publishQuarterStars(quarter: string) {
  return request.post('/quarter-stars/publish', { quarter });
}

export function unpublishQuarterStars(quarter: string) {
  return request.post('/quarter-stars/unpublish', { quarter });
}

export function importQuarterStarsFromRanking(data: { quarter: string; rankingListId: number; topN: number }) {
  return request.post('/quarter-stars/import', data);
}

export function exportRanking(params: { belongMonth: string; rankingListId?: number }) {
  return request.get('/rankings/export', { params, responseType: 'blob' });
}

export function getAnnualRanking(params: { year: string; rankingListId?: number; keyword?: string; departmentId?: number; companyBelong?: string }) {
  return request.get('/rankings/annual', { params });
}

export function exportAnnualRanking(params: { year: string; rankingListId?: number; departmentId?: number; companyBelong?: string }) {
  return request.get('/rankings/annual/export', { params, responseType: 'blob' });
}

export function getUserMonthlyTrend(params: { userId: number; year: string }) {
  return request.get('/rankings/user-trend', { params });
}

export function uploadQuarterStarAvatars(files: File[]) {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  return request.post('/quarter-stars/upload-avatars', formData);
}

export function getQuarterStarAvatars(): Promise<Record<string, string>> {
  return request.get('/quarter-stars/avatars');
}
