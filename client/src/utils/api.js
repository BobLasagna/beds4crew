const LOCAL_DEV_API_URL = 'http://localhost:3001/api';

const isBrowserRuntime = typeof window !== 'undefined';

const stripTrailingSlashes = (value = '') => value.replace(/\/+$/, '');
const ensureApiSuffix = (value = '') => {
  if (!value) return value;
  const trimmed = stripTrailingSlashes(value.trim());
  if (!trimmed) return value;
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const isLocalhostHost = (host = '') => ['localhost', '127.0.0.1', '::1'].includes(host);

const isLanHttpApiUrl = (url = '') =>
  /^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url);

const isNativeCapacitorRuntime = () => {
  if (!isBrowserRuntime) return false;
  const capacitor = window.Capacitor;

  if (typeof capacitor?.isNativePlatform === 'function') {
    return capacitor.isNativePlatform();
  }

  if (typeof capacitor?.getPlatform === 'function') {
    return capacitor.getPlatform() !== 'web';
  }

  return false;
};

const resolveApiUrl = () => {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

  if (import.meta.env.MODE === 'production') {
    return configuredApiUrl ? ensureApiSuffix(configuredApiUrl) : '/api';
  }

  if (!configuredApiUrl) {
    return LOCAL_DEV_API_URL;
  }

  if (!isBrowserRuntime) {
    return ensureApiSuffix(configuredApiUrl);
  }

  const configuredWebApiUrl = import.meta.env.VITE_WEB_API_URL?.trim();
  const localWebHost = isLocalhostHost(window.location.hostname);
  const nativeRuntime = isNativeCapacitorRuntime();

  if (localWebHost && !nativeRuntime && isLanHttpApiUrl(configuredApiUrl)) {
    return ensureApiSuffix(configuredWebApiUrl || LOCAL_DEV_API_URL);
  }

  return ensureApiSuffix(configuredApiUrl);
};

const API_URL = resolveApiUrl();
export const BASE_URL = API_URL.replace('/api', ''); // Base URL without /api
export { API_URL };
const AUTH_COOKIE_MODE = import.meta.env.VITE_AUTH_COOKIE_MODE !== 'false';
const CSRF_STORAGE_KEY = 'csrfToken';
const AUTH_SESSION_KEY = 'authSession';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_TRANSPORT_OVERRIDE_KEY = 'authTransportModeOverride';

const isBrowser = isBrowserRuntime;

const readStorage = (key) => {
  if (!isBrowser) return null;
  return localStorage.getItem(key);
};

const writeStorage = (key, value) => {
  if (!isBrowser) return;
  localStorage.setItem(key, value);
};

const removeStorage = (key) => {
  if (!isBrowser) return;
  localStorage.removeItem(key);
};

const detectNativeAppRuntime = () => {
  if (!isBrowser) return false;
  if (import.meta.env.VITE_FORCE_APP_MODE === 'true') return true;

  return isNativeCapacitorRuntime();
};

const getAuthTransportOverride = () => {
  const envOverride = import.meta.env.VITE_AUTH_TRANSPORT_MODE;
  if (envOverride === 'app' || envOverride === 'web') {
    return envOverride;
  }

  const localOverride = readStorage(AUTH_TRANSPORT_OVERRIDE_KEY);
  if (localOverride === 'app' || localOverride === 'web') {
    return localOverride;
  }

  return null;
};

export const getAuthTransportMode = () => {
  const override = getAuthTransportOverride();
  if (override) return override;
  return detectNativeAppRuntime() ? 'app' : 'web';
};

export const setAuthTransportModeOverride = (mode) => {
  if (mode !== 'app' && mode !== 'web' && mode !== null) {
    throw new Error('Invalid auth transport mode override');
  }

  if (mode === null) {
    removeStorage(AUTH_TRANSPORT_OVERRIDE_KEY);
    return;
  }

  writeStorage(AUTH_TRANSPORT_OVERRIDE_KEY, mode);
};

export const isAppTransportMode = () => getAuthTransportMode() === 'app';

const getRequestCredentials = (useTokenTransport) => (useTokenTransport ? 'omit' : 'include');
const getAuthModeHeaders = (useAppMode) => (useAppMode ? { 'X-Auth-Mode': 'app' } : {});

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
  if (!isBrowser) return '';
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

const getCsrfToken = () => readStorage(CSRF_STORAGE_KEY) || readCookie('b4c_csrf');

const setCsrfToken = (token) => {
  if (!token) return;
  writeStorage(CSRF_STORAGE_KEY, token);
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
export const setTokens = (accessToken, refreshToken, csrfToken = null) => {
  writeStorage(AUTH_SESSION_KEY, 'true');

  if (accessToken) {
    writeStorage(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    writeStorage(REFRESH_TOKEN_KEY, refreshToken);
  }

  if (csrfToken) {
    setCsrfToken(csrfToken);
  }
};

export const setAppAuthTokens = (accessToken, refreshToken) => {
  setTokens(accessToken, refreshToken, null);
};

export const getAccessToken = () => {
  if (isAppTransportMode()) {
    return readStorage(ACCESS_TOKEN_KEY);
  }

  return readStorage(AUTH_SESSION_KEY) === 'true' ? 'cookie-session' : null;
};

export const getRefreshToken = () => readStorage(REFRESH_TOKEN_KEY);

export const getAuthSessionContext = () => ({
  mode: getAuthTransportMode(),
  hasSession: readStorage(AUTH_SESSION_KEY) === 'true',
  hasAccessToken: Boolean(readStorage(ACCESS_TOKEN_KEY)),
  hasRefreshToken: Boolean(readStorage(REFRESH_TOKEN_KEY)),
  csrfToken: getCsrfToken() || null,
});

export const getStoredUser = () => {
  try {
    return JSON.parse(readStorage("user") || "{}");
  } catch {
    return {};
  }
};

export const setStoredUser = (user) => {
  writeStorage("user", JSON.stringify(user || {}));
};

// Clear tokens on logout
export const clearTokens = () => {
  removeStorage(AUTH_SESSION_KEY);
  removeStorage(CSRF_STORAGE_KEY);
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(REFRESH_TOKEN_KEY);
  removeStorage("user");
  clearCache(); // Clear all cached data
};

// Refresh access token using refresh token
export const refreshAccessToken = async () => {
  try {
    const isAppMode = isAppTransportMode();
    const refreshToken = getRefreshToken();
    const useTokenTransport = isAppMode && Boolean(refreshToken);
    const currentAccessToken = readStorage(ACCESS_TOKEN_KEY);
    const headers = {
      "Content-Type": "application/json",
      ...getAuthModeHeaders(isAppMode),
    };

    if (useTokenTransport && currentAccessToken) {
      headers.Authorization = `Bearer ${currentAccessToken}`;
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: getRequestCredentials(useTokenTransport),
      headers,
      ...(useTokenTransport ? { body: JSON.stringify({ refreshToken }) } : {}),
    });

    if (!response.ok) {
      clearTokens();
      throw new Error("Token refresh failed");
    }

    const data = await response.json();

    if (isAppMode && (data?.accessToken || data?.refreshToken)) {
      setTokens(data?.accessToken || null, data?.refreshToken || refreshToken || null, data?.csrfToken);
    } else {
      setTokens(null, null, data?.csrfToken);
    }

    return true;
  } catch (error) {
    clearTokens();
    throw error;
  }
};

// Wrapper for fetch with automatic token refresh and caching
export const fetchWithAuth = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const skipCache = Boolean(options.skipCache);
  const requestOptions = { ...options };
  delete requestOptions.skipCache;
  const cacheKey = `${method}:${url}`;
  const appMode = isAppTransportMode();
  const accessToken = readStorage(ACCESS_TOKEN_KEY);
  const useTokenTransport = appMode && Boolean(accessToken);
  
  // Check cache for GET requests
  if ((!requestOptions.method || requestOptions.method === 'GET') && !skipCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      return { json: async () => cached, ok: true };
    }
  }
  
  if (!AUTH_COOKIE_MODE && !useTokenTransport && !getAccessToken() && !(appMode && getRefreshToken())) {
    throw new Error("No access token available");
  }

  const headers = {
    ...requestOptions.headers,
    ...getAuthModeHeaders(appMode),
  };

  if (useTokenTransport) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  
  if (AUTH_COOKIE_MODE && !useTokenTransport && isStateChangingMethod(method)) {
    const csrfToken = await ensureCsrfToken();
    headers['X-CSRF-Token'] = csrfToken;
  }

  if (!(requestOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(url, {
    ...requestOptions,
    method,
    credentials: getRequestCredentials(useTokenTransport),
    headers,
  });

  // If 401, try refreshing token and retry
  if (response.status === 401) {
    await refreshAccessToken();
    const retryHeaders = { ...headers };
    const refreshedAccessToken = readStorage(ACCESS_TOKEN_KEY);
    const shouldUseTokenTransportOnRetry = appMode && Boolean(refreshedAccessToken);

    if (AUTH_COOKIE_MODE && !shouldUseTokenTransportOnRetry && isStateChangingMethod(method)) {
      retryHeaders['X-CSRF-Token'] = await ensureCsrfToken();
    }

    if (shouldUseTokenTransportOnRetry && refreshedAccessToken) {
      retryHeaders.Authorization = `Bearer ${refreshedAccessToken}`;
    } else {
      delete retryHeaders.Authorization;
    }

    response = await fetch(url, {
      ...requestOptions,
      method,
      credentials: getRequestCredentials(shouldUseTokenTransportOnRetry),
      headers: retryHeaders,
    });
  }
  
  // Cache successful GET responses
  if (response.ok && (!requestOptions.method || requestOptions.method === 'GET') && !skipCache) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const data = await response.clone().json();
        setCache(cacheKey, data, 60); // Cache for 1 minute
      } catch {
        // Skip cache when response body cannot be parsed as JSON
      }
    }
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
    credentials: getRequestCredentials(false),
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
    const appMode = isAppTransportMode();
    const refreshToken = getRefreshToken();
    const accessToken = readStorage(ACCESS_TOKEN_KEY);
    const useTokenTransport = appMode && Boolean(accessToken || refreshToken);
    const headers = {
      "Content-Type": "application/json",
      ...getAuthModeHeaders(appMode),
    };

    if (appMode && accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: getRequestCredentials(useTokenTransport),
      headers,
      ...(appMode && refreshToken ? { body: JSON.stringify({ refreshToken }) } : {}),
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
