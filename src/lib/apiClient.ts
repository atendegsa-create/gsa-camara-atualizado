export const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';

export const apiUrl = (path: string) => {
  // If it already starts with http, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  // Ensure we don't have double slashes
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
