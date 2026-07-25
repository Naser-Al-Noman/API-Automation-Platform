import api from './client';

export async function startExecution({ collectionId, environmentId }) {
  const { data } = await api.post('/api/executions', { collectionId, environmentId });
  return data;
}

export async function listExecutions(params = {}) {
  const { data } = await api.get('/api/executions', { params });
  return data;
}

export async function getExecution(id) {
  const { data } = await api.get(`/api/executions/${id}`);
  return data;
}

export async function getExecutionStatus(id) {
  const { data } = await api.get(`/api/executions/${id}/status`);
  return data;
}

export async function fetchExecutionReportBlob(id) {
  const { data } = await api.get(`/api/executions/${id}/report`, {
    responseType: 'blob',
  });
  return data;
}
