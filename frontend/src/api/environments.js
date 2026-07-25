import api from './client';

export async function listEnvironments() {
  const { data } = await api.get('/api/environments');
  return data;
}

export async function getEnvironment(id) {
  const { data } = await api.get(`/api/environments/${id}`);
  return data;
}

export async function createEnvironment({ name, variables_json, file }) {
  if (file) {
    const form = new FormData();
    if (name) form.append('name', name);
    form.append('file', file);
    const { data } = await api.post('/api/environments', form);
    return data;
  }

  const { data } = await api.post('/api/environments', { name, variables_json });
  return data;
}

export async function updateEnvironment(id, { name, variables_json, file }) {
  if (file) {
    const form = new FormData();
    if (name) form.append('name', name);
    form.append('file', file);
    const { data } = await api.put(`/api/environments/${id}`, form);
    return data;
  }

  const { data } = await api.put(`/api/environments/${id}`, { name, variables_json });
  return data;
}

export async function deleteEnvironment(id) {
  await api.delete(`/api/environments/${id}`);
}
