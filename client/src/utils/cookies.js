export const getCookie = (name) => {
  if (typeof document === "undefined") return null;

  const encodedName = `${encodeURIComponent(name)}=`;
  const segments = document.cookie.split(";");

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.slice(encodedName.length));
    }
  }

  return null;
};

export const setCookie = (name, value, maxAgeSeconds = 60 * 60 * 24 * 365) => {
  if (typeof document === "undefined") return;

  const encodedName = encodeURIComponent(name);
  const encodedValue = encodeURIComponent(String(value));
  document.cookie = `${encodedName}=${encodedValue};path=/;max-age=${maxAgeSeconds};SameSite=Lax`;
};

export const getBooleanCookie = (name, defaultValue) => {
  const value = getCookie(name);
  if (value === null) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
};

export const setBooleanCookie = (name, value, maxAgeSeconds) => {
  setCookie(name, value ? "true" : "false", maxAgeSeconds);
};
