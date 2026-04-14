import request from './request';

export function getSystemConfigs() {
  return request.get('/system/configs');
}

export function updateSystemConfigs(configs: { configKey: string; configValue: string }[]) {
  return request.put('/system/configs', configs);
}
