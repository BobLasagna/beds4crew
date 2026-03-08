import React, { useState } from "react";
import { TextField, Button, Typography, Box, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { setTokens, isAppTransportMode, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const snackbar = useSnackbar();

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

      snackbar("Login successful");
      
      // Check if there's a redirect URL saved (from trying to book a property)
      const redirectUrl = localStorage.getItem("redirectAfterLogin");
      if (redirectUrl) {
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
        
        <form onSubmit={handleSubmit}>
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
