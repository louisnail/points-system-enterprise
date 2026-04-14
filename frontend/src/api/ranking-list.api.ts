import request from './request';

export function getRankingLists() {
  return request.get('/ranking-lists');
}

export function getRankingListById(id: number) {
  return request.get(`/ranking-lists/${id}`);
}

export function createRankingList(data: any) {
  return request.post('/ranking-lists', data);
}

export function updateRankingList(id: number, data: any) {
  return request.put(`/ranking-lists/${id}`, data);
}

export function deleteRankingList(id: number) {
  return request.delete(`/ranking-lists/${id}`);
}
