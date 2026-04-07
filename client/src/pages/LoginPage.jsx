import React, { useEffect, useState } from "react";
import { TextField, Button, Typography, Box, Paper, Checkbox, FormControlLabel } from "@mui/material";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { setTokens, isAppTransportMode, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

const REMEMBERED_LOGIN_EMAIL_KEY = "rememberedLoginEmail";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const snackbar = useSnackbar();
  const isIosNative = (() => {
    if (!isAppTransportMode() || typeof window === "undefined") return false;
    const getPlatform = window.Capacitor?.getPlatform;
    return typeof getPlatform === "function" && getPlatform() === "ios";
  })();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_LOGIN_EMAIL_KEY) || "";
    if (!rememberedEmail) return;

    setForm((prev) => ({ ...prev, email: rememberedEmail }));
    setRememberEmail(true);
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const appMode = isAppTransportMode();
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: appMode ? "omit" : "include",
        headers: {
          "Content-Type": "application/json",
          ...(appMode ? { "X-Auth-Mode": "app" } : {}),
        },
        body: JSON.stringify({
          ...form,
          ...(appMode ? { authMode: "app" } : {}),
        }),
      });
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json().catch(() => ({}))
        : {};

      if (!contentType.includes("application/json")) {
        throw new Error("API response was not JSON. Check VITE_API_URL and ensure it targets /api.");
      }

      if (!res.ok) throw new Error(data.message || "Login failed");

      if (appMode && (!data?.accessToken || !data?.refreshToken)) {
        throw new Error("Login succeeded but app tokens were not returned");
      }

      setTokens(
        appMode ? data?.accessToken : null,
        appMode ? data?.refreshToken : null,
        data?.csrfToken,
      );
      localStorage.setItem("user", JSON.stringify(data.user));

      if (rememberEmail && form.email.trim()) {
        localStorage.setItem(REMEMBERED_LOGIN_EMAIL_KEY, form.email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_KEY);
      }

      snackbar("Login successful");

      const queryRedirect = searchParams.get("redirect");
      const isSafeInternalRedirect =
        typeof queryRedirect === "string" && queryRedirect.startsWith("/") && !queryRedirect.startsWith("//");

      const stateFrom = location.state?.from;
      const isSafeStateFrom =
        typeof stateFrom === "string" && stateFrom.startsWith("/") && !stateFrom.startsWith("//");

      // Check if there's a redirect URL saved (from trying to book a property)
      const redirectUrl = localStorage.getItem("redirectAfterLogin");
      if (isSafeInternalRedirect) {
        navigate(queryRedirect);
      } else if (isSafeStateFrom) {
        navigate(stateFrom);
      } else if (redirectUrl) {
        localStorage.removeItem("redirectAfterLogin"); // Clear it after use
        navigate(redirectUrl);
      } else {
        navigate("/");
      }
    } catch (err) {
      snackbar("Login failed", "error");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={commonStyles.authContainer}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" sx={commonStyles.pageTitle} align="center">
          Welcome Back
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Sign in to continue to Beds4Crew
        </Typography>
        
        <form onSubmit={handleSubmit} autoComplete="on">
          <TextField
            name="email"
            label="Email"
            type="email"
            fullWidth
            required
            margin="normal"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
            autoComplete="username"
            inputProps={{ autoCapitalize: "none", autoCorrect: "off" }}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            fullWidth
            required
            margin="normal"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
            autoComplete="current-password"
          />

          <FormControlLabel
            control={(
              <Checkbox
                checked={rememberEmail}
                onChange={(event) => setRememberEmail(event.target.checked)}
              />
            )}
            label="Remember email on this device"
            sx={{ mt: 0.5 }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button
              variant="text"
              onClick={() => navigate("/forgot-password")}
              sx={{ textTransform: "none", p: 0, minWidth: "auto" }}
            >
              Forgot password?
            </Button>
          </Box>
          
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth
            disabled={loading}
            sx={commonStyles.fullWidthButton}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Don't have an account?{" "}
            <Button 
              variant="text" 
              onClick={() => navigate("/register")}
              sx={{ textTransform: "none" }}
            >
              Sign Up
            </Button>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
}
