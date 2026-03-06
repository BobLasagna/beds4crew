// In production (Render), use relative URLs since frontend and backend are on same domain
// In development, use localhost
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api');
export const BASE_URL = API_URL.replace('/api', ''); // Base URL without /api
export { API_URL };
const AUTH_COOKIE_MODE = import.meta.env.VITE_AUTH_COOKIE_MODE !== 'false';
const CSRF_STORAGE_KEY = 'csrfToken';
const AUTH_SESSION_KEY = 'authSession';

// Simple in-memory cache for client-side requests
const clientCache = new Map();

const getCached = (key) => {
  const cached = clientCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now > cached.expiresAt) {
    clientCache.delete(key);
    return null;
  }
  
  return cached.data;
};

const setCache = (key, data, ttlSeconds = 60) => {
  clientCache.set(key, {
    data,
    expiresAt: Date.now() + (ttlSeconds * 1000)
  });
};

const clearCache = (pattern) => {
  if (!pattern) {
    clientCache.clear();
    return;
  }
  
  for (const key of clientCache.keys()) {
    if (key.includes(pattern)) {
      clientCache.delete(key);
    }
  }
};

const isStateChangingMethod = (method = 'GET') => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

const readCookie = (name) => {
  const cookieName = `${name}=`;
  const allCookies = document.cookie.split(';');
  for (const rawCookie of allCookies) {
    const cookie = rawCookie.trim();
    if (cookie.startsWith(cookieName)) {
      return decodeURIComponent(cookie.substring(cookieName.length));
    }
  }
  return '';
};

const getCsrfToken = () => localStorage.getItem(CSRF_STORAGE_KEY) || readCookie('b4c_csrf');

const setCsrfToken = (token) => {
  if (!token) return;
  localStorage.setItem(CSRF_STORAGE_KEY, token);
};

const ensureCsrfToken = async () => {
  const existing = getCsrfToken();
  if (existing) return existing;

  const response = await fetch(`${API_URL}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to initialize CSRF token');
  }

  const data = await response.json();
  setCsrfToken(data?.csrfToken);
  return data?.csrfToken;
};

// Backward-compatible auth helpers now using cookie session markers
export const setTokens = (_accessToken, _refreshToken, csrfToken = null) => {
  localStorage.setItem(AUTH_SESSION_KEY, 'true');
  if (csrfToken) {
    setCsrfToken(csrfToken);
  }
};

export const getAccessToken = () => (localStorage.getItem(AUTH_SESSION_KEY) === 'true' ? 'cookie-session' : null);
export const getRefreshToken = () => null;

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export const setStoredUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user || {}));
};

// Clear tokens on logout
export const clearTokens = () => {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(CSRF_STORAGE_KEY);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  clearCache(); // Clear all cached data
};

// Refresh access token using refresh token
export const refreshAccessToken = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      clearTokens();
      throw new Error("Token refresh failed");
    }

    const data = await response.json();
    setTokens(null, null, data?.csrfToken);
    return true;
  } catch (error) {
    clearTokens();
    throw error;
  }
};

// Wrapper for fetch with automatic token refresh and caching
export const fetchWithAuth = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `${method}:${url}`;
  
  // Check cache for GET requests
  if (!options.method || options.method === 'GET') {
    const cached = getCached(cacheKey);
    if (cached) {
      return { json: async () => cached, ok: true };
    }
  }
  
  if (!AUTH_COOKIE_MODE && !getAccessToken()) {
    throw new Error("No access token available");
  }

  const headers = {
    ...options.headers,
  };
  
  if (AUTH_COOKIE_MODE && isStateChangingMethod(method)) {
    const csrfToken = await ensureCsrfToken();
    headers['X-CSRF-Token'] = csrfToken;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(url, {
    ...options,
    method,
    credentials: 'include',
    headers,
  });

  // If 401, try refreshing token and retry
  if (response.status === 401) {
    await refreshAccessToken();
    const retryHeaders = { ...headers };

    if (AUTH_COOKIE_MODE && isStateChangingMethod(method)) {
      retryHeaders['X-CSRF-Token'] = await ensureCsrfToken();
    }

    response = await fetch(url, {
      ...options,
      method,
      credentials: 'include',
      headers: retryHeaders,
    });
  }
  
  // Cache successful GET responses
  if (response.ok && (!options.method || options.method === 'GET')) {
    const data = await response.clone().json();
    setCache(cacheKey, data, 60); // Cache for 1 minute
  }
  
  // Clear cache on mutations
  if (response.ok && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    clearCache('properties');
    clearCache('bookings');
    clearCache('tickets');
  }

  return response;
};

export const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
};

export const fetchJsonWithAuth = async (url, options = {}) => {
  const response = await fetchWithAuth(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
};

// Logout function
export const logout = async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Logout error:", error);
  }

  clearTokens();
};

// Calculate price range from rooms/beds
export const calculatePriceRange = (rooms) => {
  if (!rooms || rooms.length === 0) return null;
  
  const prices = [];
  rooms.forEach(room => {
    if (room.beds && room.beds.length > 0) {
      room.beds.forEach(bed => {
        if (bed.pricePerBed) {
          prices.push(bed.pricePerBed);
        }
      });
    }
  });

  if (prices.length === 0) return null;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    min: minPrice,
    max: maxPrice,
    hasPriceRange: minPrice !== maxPrice
  };
};

// Format price display for listings
export const formatPriceDisplay = (property) => {
  const priceRange = calculatePriceRange(property.rooms);
  
  if (!priceRange) {
    return property.pricePerNight ? `$${property.pricePerNight}` : "Call for price";
  }

  if (priceRange.hasPriceRange) {
    return `$${Math.round(priceRange.min)} - $${Math.round(priceRange.max)}/night`;
  } else {
    return `$${Math.round(priceRange.min)}/night`;
  }
};

// Debounce utility for search/filter operations
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Fetch bed availability for a property within a date range
export const fetchBedAvailability = async (propertyId, startDate, endDate) => {
  try {
    const start = typeof startDate === 'string' ? startDate : startDate.format('YYYY-MM-DD');
    const end = typeof endDate === 'string' ? endDate : endDate.format('YYYY-MM-DD');
    
    const cacheKey = `bed-availability:${propertyId}:${start}:${end}`;
    const cached = getCached(cacheKey, 30); // Cache for 30 seconds
    
    if (cached) {
      return cached;
    }
    
    const response = await fetch(
      `${API_URL}/properties/${propertyId}/bed-availability?startDate=${start}&endDate=${end}`,
      { credentials: 'include' }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch bed availability');
    }
    
    const data = await response.json();
    setCache(cacheKey, data, 30);
    return data;
  } catch (error) {
    console.error('Error fetching bed availability:', error);
    throw error;
  }
};
