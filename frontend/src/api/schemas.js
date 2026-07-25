import api from './client';

export async function listSchemas(collectionId) {
  const { data } = await api.get('/api/schemas', {
    params: { collectionId },
  });
  return data;
}

export async function getSchema(id) {
  const { data } = await api.get(`/api/schemas/${id}`);
  return data;
}

export async function createSchema({ collectionId, endpoint, schema_json }) {
  const { data } = await api.post('/api/schemas', {
    collectionId,
    endpoint,
    schema_json,
  });
  return data;
}

export async function updateSchema(id, { endpoint, schema_json }) {
  const { data } = await api.put(`/api/schemas/${id}`, {
    endpoint,
    schema_json,
  });
  return data;
}

export async function deleteSchema(id) {
  await api.delete(`/api/schemas/${id}`);
}
