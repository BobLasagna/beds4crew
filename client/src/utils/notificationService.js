import { API_URL, fetchWithAuth } from "./api";

const MIN_POLL_INTERVAL = 5000;
const MAX_POLL_INTERVAL = 30000;
const POLL_STEP = 5000;

let unreadCount = 0;
let previousUnreadCount = 0;
let pollInterval = MIN_POLL_INTERVAL;
let timerId = null;
let isPolling = false;
let currentUserId = null;

const unreadSubscribers = new Set();
const snackbarSubscribers = new Set();

const notifyUnreadSubscribers = () => {
  unreadSubscribers.forEach((callback) => {
    try {
      callback(unreadCount);
    } catch (error) {
      console.error("Unread subscriber failed:", error);
    }
  });
};

const emitSnackbarEvent = (message, severity = "info", options = {}) => {
  snackbarSubscribers.forEach((callback) => {
    try {
      callback({ message, severity, options });
    } catch (error) {
      console.error("Snackbar subscriber failed:", error);
    }
  });
};

const setUnreadCount = (newCount) => {
  unreadCount = newCount;
  notifyUnreadSubscribers();
};

const clearTimer = () => {
  if (!timerId) return;
  clearTimeout(timerId);
  timerId = null;
};

const scheduleNextPoll = () => {
  clearTimer();
  timerId = setTimeout(() => {
    void pollUnreadCount();
  }, pollInterval);
};

const pollUnreadCount = async () => {
  if (!isPolling || !currentUserId) {
    return;
  }

  try {
    const response = await fetchWithAuth(`${API_URL}/bookings/unread/count`);

    if (response.status === 401) {
      previousUnreadCount = 0;
      setUnreadCount(0);
      scheduleNextPoll();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const nextUnreadCount = data?.unreadCount || 0;

    if (nextUnreadCount > previousUnreadCount && previousUnreadCount !== 0) {
      const suffix = nextUnreadCount > 1 ? "s" : "";
      emitSnackbarEvent(`You have ${nextUnreadCount} new message${suffix}!`, "info");
      pollInterval = MIN_POLL_INTERVAL;
    }

    previousUnreadCount = nextUnreadCount;
    setUnreadCount(nextUnreadCount);
    pollInterval = Math.min(pollInterval + POLL_STEP, MAX_POLL_INTERVAL);
  } catch (error) {
    if (error.message !== "HTTP 401") {
      console.error("Failed to fetch unread count:", error);
    }
  } finally {
    scheduleNextPoll();
  }
};

export const notificationService = {
  getUnreadCount() {
    return unreadCount;
  },

  subscribeUnread(callback) {
    if (typeof callback !== "function") {
      throw new Error("subscribeUnread callback must be a function");
    }

    unreadSubscribers.add(callback);
    callback(unreadCount);

    return () => {
      unreadSubscribers.delete(callback);
    };
  },

  subscribeSnackbar(callback) {
    if (typeof callback !== "function") {
      throw new Error("subscribeSnackbar callback must be a function");
    }

    snackbarSubscribers.add(callback);

    return () => {
      snackbarSubscribers.delete(callback);
    };
  },

  resetPollingInterval() {
    pollInterval = MIN_POLL_INTERVAL;
    if (isPolling) {
      scheduleNextPoll();
    }
  },

  startPolling(userId) {
    if (!userId) {
      this.stopPolling();
      return;
    }

    const userChanged = currentUserId !== userId;
    currentUserId = userId;

    if (userChanged) {
      previousUnreadCount = 0;
      setUnreadCount(0);
      pollInterval = MIN_POLL_INTERVAL;
    }

    if (isPolling && !userChanged) {
      return;
    }

    isPolling = true;
    clearTimer();
    void pollUnreadCount();
  },

  stopPolling() {
    isPolling = false;
    currentUserId = null;
    previousUnreadCount = 0;
    pollInterval = MIN_POLL_INTERVAL;
    clearTimer();
    setUnreadCount(0);
  },
};
