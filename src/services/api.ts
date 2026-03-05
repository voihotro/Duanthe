export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Use import.meta.env.VITE_API_BASE_URL if available, otherwise default to empty (relative path)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const headers = {
    ...options.headers,
    ...getAuthHeaders(),
  };
  
  // Ensure url starts with / if not present
  const path = url.startsWith('/') ? url : `/${url}`;
  const fullUrl = `${BASE_URL}${path}`;
  
  const response = await fetch(fullUrl, { ...options, headers });
  
  if (response.status === 401) {
    // Optional: handle unauthorized globally
    // localStorage.removeItem('token');
    // window.location.reload();
  }
  
  return response;
};
