import api from './client';

export async function listCollections() {
  const { data } = await api.get('/api/collections');
  return data;
}

export async function getCollection(id) {
  const { data } = await api.get(`/api/collections/${id}`);
  return data;
}

export async function createCollection({ name, postman_json, file }) {
  if (file) {
    const form = new FormData();
    if (name) form.append('name', name);
    form.append('file', file);
    const { data } = await api.post('/api/collections', form);
    return data;
  }

  const { data } = await api.post('/api/collections', { name, postman_json });
  return data;
}

export async function updateCollection(id, { name, postman_json, file }) {
  if (file) {
    const form = new FormData();
    if (name) form.append('name', name);
    form.append('file', file);
    const { data } = await api.put(`/api/collections/${id}`, form);
    return data;
  }

  const { data } = await api.put(`/api/collections/${id}`, { name, postman_json });
  return data;
}

export async function deleteCollection(id) {
  await api.delete(`/api/collections/${id}`);
}
