import api from './client';

export async function getDashboardSummary() {
  const { data } = await api.get('/api/dashboard/summary');
  return data;
}
