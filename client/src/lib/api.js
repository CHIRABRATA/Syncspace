const API_BASE = '/api';

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
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getDocuments: () => request('/documents'),

  // Safely handles both api.createDocument("My Doc") and api.createDocument({ title: "My Doc" })
  createDocument: (titleOrObj) => {
    const title = typeof titleOrObj === 'object' ? titleOrObj?.title : titleOrObj;
    return request('/documents', { 
      method: 'POST', 
      body: JSON.stringify({ title: title || 'Untitled Document' }) 
    });
  },

  joinDocument: (documentId) =>
    request('/documents/join', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    }),

  shareDocument: (documentId, email, role = 'WRITE') =>
    request(`/documents/${documentId}/share`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
};
