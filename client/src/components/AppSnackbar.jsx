/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import { Snackbar, Alert, Box, IconButton, Tooltip, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import NotificationsOffOutlinedIcon from "@mui/icons-material/NotificationsOffOutlined";
import { notificationService } from "../utils/notificationService";

const SnackbarContext = createContext(null);
const DEFAULT_DURATION = 2800;
const SNACKBAR_MUTED_KEY = "snackbar_muted";
const SNACKBAR_PLACEMENT_KEY = "snackbar_placement";
const SNACKBAR_MUTED_EVENT = "app:snackbar-muted-changed";
const SNACKBAR_PLACEMENT_EVENT = "app:snackbar-placement-changed";

function getCookieValue(name) {
  if (typeof document === "undefined") return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookieValue(name, value, maxAgeSeconds = 60 * 60 * 24 * 365) {
  if (typeof document === "undefined") return;
  const securePart = window?.location?.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${securePart}`;
}

function readSnackbarMutedPreference() {
  const value = getCookieValue(SNACKBAR_MUTED_KEY);
  return value === "true";
}

function readSnackbarPlacementPreference() {
  const value = getCookieValue(SNACKBAR_PLACEMENT_KEY);
  return value === "top" ? "top" : "bottom";
}

export function setSnackbarMutedPreference(muted) {
  if (typeof window === "undefined") return;
  setCookieValue(SNACKBAR_MUTED_KEY, String(Boolean(muted)));
  window.dispatchEvent(new CustomEvent(SNACKBAR_MUTED_EVENT, { detail: { muted: Boolean(muted) } }));
}

export function setSnackbarPlacementPreference(placement) {
  if (typeof window === "undefined") return;
  const normalizedPlacement = placement === "top" ? "top" : "bottom";
  setCookieValue(SNACKBAR_PLACEMENT_KEY, normalizedPlacement);
  window.dispatchEvent(
    new CustomEvent(SNACKBAR_PLACEMENT_EVENT, { detail: { placement: normalizedPlacement } })
  );
}

export function useSnackbarPreferences() {
  const [snackbarMuted, setSnackbarMuted] = useState(() => readSnackbarMutedPreference());
  const [snackbarPlacement, setSnackbarPlacement] = useState(() => readSnackbarPlacementPreference());

  useEffect(() => {
    const handleMutedEvent = (event) => {
      setSnackbarMuted(Boolean(event.detail?.muted));
    };

    const handlePlacementEvent = (event) => {
      setSnackbarPlacement(event.detail?.placement === "top" ? "top" : "bottom");
    };

    window.addEventListener(SNACKBAR_MUTED_EVENT, handleMutedEvent);
    window.addEventListener(SNACKBAR_PLACEMENT_EVENT, handlePlacementEvent);

    return () => {
      window.removeEventListener(SNACKBAR_MUTED_EVENT, handleMutedEvent);
      window.removeEventListener(SNACKBAR_PLACEMENT_EVENT, handlePlacementEvent);
    };
  }, []);

  const updateSnackbarMuted = (muted) => {
    setSnackbarMutedPreference(muted);
    setSnackbarMuted(Boolean(muted));
  };

  const updateSnackbarPlacement = (placement) => {
    const normalizedPlacement = placement === "top" ? "top" : "bottom";
    setSnackbarPlacementPreference(normalizedPlacement);
    setSnackbarPlacement(normalizedPlacement);
  };

  return { snackbarMuted, updateSnackbarMuted, snackbarPlacement, updateSnackbarPlacement };
}


export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
}

export function SnackbarProvider({ children }) {
  const { snackbarMuted, updateSnackbarMuted, snackbarPlacement } = useSnackbarPreferences();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [severity, setSeverity] = useState("success");
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [action, setAction] = useState(null);

  // Helper function to render action elements
  const renderActionElement = (actionConfig) => {
    if (!actionConfig) return null;

    // If it's already a React element, return it
    if (React.isValidElement(actionConfig)) {
      return actionConfig;
    }

    // If it's an object with configuration
    if (typeof actionConfig === "object") {
      const { label, onClick, href, type = "button" } = actionConfig;
      if (type === "link" && href) {
        // Internal link navigation
        if (href.startsWith("/")) {
          return (
            <Button
              component={RouterLink}
              to={href}
              size="small"
              color="inherit"
              sx={{ textDecoration: "none", fontWeight: 600 }}
            >
              {label}
            </Button>
          );
        }
        // External link
        return (
          <Button
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            color="inherit"
            sx={{ fontWeight: 600 }}
          >
            {label}
          </Button>
        );
      }

      // Regular button with onClick handler
      if (type === "button" && onClick) {
        return (
          <Button
            onClick={onClick}
            size="small"
            color="inherit"
            sx={{ fontWeight: 600 }}
          >
            {label}
          </Button>
        );
      }
    }

    return null;
  };

  const triggerSnackbar = (message, sev = "success", options = {}) => {
    if (snackbarMuted && !options?.force) return;

    setMsg(message);
    setSeverity(sev);
    setDuration(options?.duration ?? DEFAULT_DURATION);
    setAction(options?.action ?? null);
    setOpen(true);
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  useEffect(() => {
    const unsubscribe = notificationService.subscribeSnackbar(({ message, severity: eventSeverity, options }) => {
      triggerSnackbar(message, eventSeverity, options);
    });

    return () => {
      unsubscribe();
    };
  }, [snackbarMuted]);

  const handleDisableSnacksClick = () => {
    const shouldDisable = window.confirm("Disable snack popups? You can re-enable them from the menu drawer.");
    if (!shouldDisable) return;
    updateSnackbarMuted(true);
    setOpen(false);
  };

  const mergedAction = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      {renderActionElement(action)}
      <Tooltip title="Disable snacks" placement="top" arrow>
        <IconButton
          size="small"
          color="inherit"
          aria-label="Disable snack popups"
          onClick={handleDisableSnacksClick}
        >
          <NotificationsOffOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  return (
    <SnackbarContext.Provider value={triggerSnackbar}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: snackbarPlacement, horizontal: "right" }}
      >
        <Alert onClose={handleClose} severity={severity} sx={{ width: "100%" }} action={mergedAction}>
          {msg}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
