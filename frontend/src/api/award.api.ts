import request from './request';

export function getAwards(params?: any) {
  return request.get('/awards', { params });
}

export function getAwardStats(params?: any) {
  return request.get('/awards/stats', { params });
}

export function createAward(data: any) {
  return request.post('/awards', data);
}

export function updateAward(id: number, data: any) {
  return request.put(`/awards/${id}`, data);
}

export function deleteAward(id: number) {
  return request.delete(`/awards/${id}`);
}

export function exportAwards(params?: any) {
  return request.get('/awards/export', { params, responseType: 'blob' });
}
