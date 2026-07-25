import api from './client';

async function blobOrError(blob) {
  if (blob && typeof blob.type === 'string' && blob.type.includes('application/json')) {
    const text = await blob.text();
    let message = 'Request failed';
    try {
      message = JSON.parse(text).message || message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return blob;
}

export async function startExecution({ collectionId, environmentId }) {
  const { data } = await api.post('/api/executions', { collectionId, environmentId });
  return data;
}

export async function listExecutions(params = {}) {
  const cleaned = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    cleaned[key] = value;
  }
  const { data } = await api.get('/api/executions', { params: cleaned });

  // Phase 8 returns { executions, total, page, totalPages }; older servers returned a bare array
  if (Array.isArray(data)) {
    return {
      executions: data,
      total: data.length,
      page: 1,
      totalPages: 1,
    };
  }

  return {
    executions: data.executions || [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
  };
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
  return blobOrError(data);
}

export async function downloadExecutionReport(id) {
  try {
    const { data } = await api.get(`/api/executions/${id}/report/download`, {
      responseType: 'blob',
    });
    return await blobOrError(data);
  } catch (err) {
    // Fallback: same HTML via the inline report endpoint (works on older backends)
    if (err.response?.status === 404) {
      const { data } = await api.get(`/api/executions/${id}/report`, {
        responseType: 'blob',
      });
      return blobOrError(data);
    }
    if (err.response?.data instanceof Blob) {
      await blobOrError(err.response.data);
    }
    throw err;
  }
}
