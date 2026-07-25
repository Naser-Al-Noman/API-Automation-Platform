export function flattenCollectionItems(items, folderPath = []) {
  const rows = [];

  for (const item of items || []) {
    if (!item) continue;

    if (item.request) {
      const method =
        typeof item.request.method === 'string'
          ? item.request.method.toUpperCase()
          : 'REQUEST';
      rows.push({
        type: 'request',
        name: item.name || 'Untitled request',
        method,
        path: folderPath,
      });
    } else if (Array.isArray(item.item)) {
      const nextPath = [...folderPath, item.name || 'Folder'];
      rows.push({
        type: 'folder',
        name: item.name || 'Folder',
        path: folderPath,
      });
      rows.push(...flattenCollectionItems(item.item, nextPath));
    }
  }

  return rows;
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}
