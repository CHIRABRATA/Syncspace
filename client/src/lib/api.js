const API_BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? '/api' 
    : 'https://syncspace-783u.onrender.com/api');

async function request(path, options = {}) {
  const token = localStorage.getItem('syncspace_token');
  const headers = { 
    'Content-Type': 'application/json', 
    ...options.headers 
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { 
    ...options, 
    headers,
    credentials: 'include' // Pass HttpOnly cookies if set during login
  });
  
  // Handle 204 No Content (e.g., successful DELETE)
  if (res.status === 204) {
    return {};
  }

  let data = {};
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    const rawText = await res.text().catch(() => '');
    data = { error: rawText || `Request failed with status ${res.status}` };
  }

  if (!res.ok) {
    // If token is invalid or expired, clear local storage and signal auth change
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
      localStorage.removeItem('syncspace_token');
      localStorage.removeItem('syncspace_user');
      window.dispatchEvent(new CustomEvent('syncspace:logout'));
    }
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    console.error(`[API Error ${res.status}] ${path}:`, errorMsg);
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getMe: () => request('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),

  getDocuments: () => request('/documents'),

  // Safely handles both api.createDocument("My Doc") and api.createDocument({ title: "My Doc" })
  createDocument: (titleOrObj) => {
    const title = typeof titleOrObj === 'object' ? titleOrObj?.title : titleOrObj;
    return request('/documents', { 
      method: 'POST', 
      body: JSON.stringify({ title: title || 'Untitled Document' }) 
    });
  },

  getDocument: (documentId) => request(`/documents/${documentId}`),

  updateDocument: (documentId, updates) =>
    request(`/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  joinDocument: (documentIdOrObj, role) => {
    let documentId = documentIdOrObj;
    let targetRole = role;
    if (typeof documentIdOrObj === 'object' && documentIdOrObj !== null) {
      documentId = documentIdOrObj.documentId || documentIdOrObj.id;
      targetRole = documentIdOrObj.role || targetRole;
    }
    return request('/documents/join', {
      method: 'POST',
      body: JSON.stringify({ documentId, role: targetRole }),
    });
  },

  // ---- Permission management (OWNER-only) ----

  shareDocument: (documentId, email, role = 'READ') =>
    request(`/documents/${documentId}/share`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  addPermission: (documentId, email, role = 'READ') =>
    request(`/documents/${documentId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  getPermissions: (documentId) =>
    request(`/documents/${documentId}/permissions`),

  updatePermission: (documentId, userId, role) =>
    request(`/documents/${documentId}/permissions/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  revokePermission: (documentId, userId) =>
    request(`/documents/${documentId}/permissions/${userId}`, {
      method: 'DELETE',
    }),

  // ---- Document actions ----

  deleteDocument: (documentId) =>
    request(`/documents/${documentId}`, { method: 'DELETE' }),

  duplicateDocument: (documentId) =>
    request(`/documents/${documentId}/duplicate`, { method: 'POST' }),

  leaveDocument: (documentId) =>
    request(`/documents/${documentId}/leave`, { method: 'POST' }),

  renameDocument: (documentId, title) =>
    request(`/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
};
