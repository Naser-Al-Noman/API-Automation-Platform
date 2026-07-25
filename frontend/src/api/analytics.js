import api from './client';

function cleanParams(params = {}) {
  const cleaned = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export async function getPassRateTrend({ collectionId, days = 30 } = {}) {
  const { data } = await api.get('/api/analytics/pass-rate-trend', {
    params: cleanParams({ collectionId, days }),
  });
  return data;
}

export async function getResponseTimes({ collectionId, days = 30 } = {}) {
  const { data } = await api.get('/api/analytics/response-times', {
    params: cleanParams({ collectionId, days }),
  });
  return data;
}

export async function getEndpointReliability({ collectionId }) {
  const { data } = await api.get('/api/analytics/endpoint-reliability', {
    params: cleanParams({ collectionId }),
  });
  return data;
}

export async function getSchemaValidationSummary({ collectionId }) {
  const { data } = await api.get('/api/analytics/schema-validation-summary', {
    params: cleanParams({ collectionId }),
  });
  return data;
}
