import React, { useState } from "react";
import { TextField, Button, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { setTokens, API_URL } from "../utils/api";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      // Store both tokens
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      snackbar("Login successful");
      navigate("/");
    } catch (err) {
      snackbar("Login failed", "error");
      setError(err.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, margin: "40px auto", p: 3 }}>
      <Typography variant="h4" mb={2}>
        Login
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          name="email"
          label="Email"
          fullWidth
          required
          margin="normal"
          value={form.email}
          onChange={handleChange}
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
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Login
        </Button>
        {error && (
          <Typography color="error" mt={2}>
            {error}
          </Typography>
        )}
        <Typography mt={2} align="center">
          Don't have an account? <a href="/register">Register</a>
        </Typography>
      </form>
    </Box>
  );
}
