function countCollectionRequests(items) {
  if (!Array.isArray(items)) {
    return 0;
  }

  let count = 0;
  for (const item of items) {
    if (item && item.request) {
      count += 1;
    }
    if (item && Array.isArray(item.item)) {
      count += countCollectionRequests(item.item);
    }
  }
  return count;
}

function isPostmanCollection(data) {
  return (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    data.info &&
    typeof data.info === 'object' &&
    Array.isArray(data.item)
  );
}

function normalizeEnvironmentPayload(data, fallbackName) {
  // Standard Postman environment export
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Array.isArray(data.values)
  ) {
    const values = data.values.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw Object.assign(new Error(`Environment value at index ${index} is invalid`), {
          status: 400,
        });
      }

      const key = entry.key;
      if (typeof key !== 'string' || !key.trim()) {
        throw Object.assign(new Error(`Environment value at index ${index} needs a string key`), {
          status: 400,
        });
      }

      const value =
        entry.value === undefined || entry.value === null ? '' : String(entry.value);

      return {
        key: key.trim(),
        value,
        enabled: entry.enabled !== false,
        type: entry.type || 'default',
      };
    });

    return {
      name: (fallbackName || data.name || 'Untitled Environment').trim(),
      variables_json: {
        id: data.id || undefined,
        name: (data.name || fallbackName || 'Untitled Environment').trim(),
        values,
        _postman_variable_scope: data._postman_variable_scope || 'environment',
        _postman_exported_at: data._postman_exported_at,
        _postman_exported_using: data._postman_exported_using,
      },
    };
  }

  // Plain object of string key/value pairs
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const values = Object.entries(data).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        throw Object.assign(
          new Error('Plain environment objects must map keys to string values'),
          { status: 400 }
        );
      }
      return {
        key,
        value: value === undefined || value === null ? '' : String(value),
        enabled: true,
        type: 'default',
      };
    });

    const name = (fallbackName || 'Untitled Environment').trim();
    return {
      name,
      variables_json: {
        name,
        values,
        _postman_variable_scope: 'environment',
      },
    };
  }

  throw Object.assign(
    new Error(
      'Environment must be a Postman environment export ({ name, values: [{key,value,enabled}] }) or a plain key/value object'
    ),
    { status: 400 }
  );
}

module.exports = {
  countCollectionRequests,
  isPostmanCollection,
  normalizeEnvironmentPayload,
};
