import React, { useState } from "react";
import { Box, TextField, Button, Typography, Avatar } from "@mui/material";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL, BASE_URL } from "../utils/api";

export default function ProfilePage() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [form, setForm] = useState({
    firstName: storedUser.firstName || "",
    lastName: storedUser.lastName || "",
  });
  const snackbar = useSnackbar();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    const res = await fetchWithAuth(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      snackbar("Failed to update profile", "error");
    }
    const data = await res.json();
    localStorage.setItem("user", JSON.stringify(data));
    snackbar("Profile updated successfully");
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 5 }}>
      <Typography variant="h5" mb={2}>My Profile</Typography>
      <Avatar src={`${BASE_URL}${storedUser.profileImagePath || ""}`} sx={{ width: 96, height: 96, mx: "auto", mb: 2 }} />
      <form onSubmit={handleSubmit}>
        <TextField label="First Name" name="firstName" fullWidth margin="normal" value={form.firstName} onChange={handleChange} />
        <TextField label="Last Name" name="lastName" fullWidth margin="normal" value={form.lastName} onChange={handleChange} />
        <Button type="submit" fullWidth variant="contained" sx={{ my: 2 }}>Save</Button>
      </form>
    </Box>
  );
}
