import request from './request';

// 获取所有画像模板
export function getScoreProfileTemplates() {
  return request.get('/score-profiles/templates');
}

// 获取模板详情
export function getScoreProfileTemplate(id: number) {
  return request.get(`/score-profiles/templates/${id}`);
}

// 新增模板
export function createScoreProfileTemplate(data: any) {
  return request.post('/score-profiles/templates', data);
}

// 编辑模板
export function updateScoreProfileTemplate(id: number, data: any) {
  return request.put(`/score-profiles/templates/${id}`, data);
}

// 删除模板
export function deleteScoreProfileTemplate(id: number) {
  return request.delete(`/score-profiles/templates/${id}`);
}

// 获取用户积分画像数据
export function getUserScoreProfile(userId: number) {
  return request.get(`/score-profiles/user/${userId}`);
}
