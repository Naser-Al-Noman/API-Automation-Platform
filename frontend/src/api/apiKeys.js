import api from './client';

export async function listApiKeys() {
  const { data } = await api.get('/api/api-keys');
  return data;
}

export async function createApiKey({ name }) {
  const { data } = await api.post('/api/api-keys', { name });
  return data;
}

export async function deleteApiKey(id) {
  await api.delete(`/api/api-keys/${id}`);
}
