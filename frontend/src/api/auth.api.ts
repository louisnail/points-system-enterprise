import request from './request';

export function login(data: { employeeNo: string; password: string }) {
  return request.post('/auth/login', data);
}

export function refreshToken(refreshToken: string) {
  return request.post('/auth/refresh', { refreshToken });
}

export function logout() {
  return request.post('/auth/logout');
}
