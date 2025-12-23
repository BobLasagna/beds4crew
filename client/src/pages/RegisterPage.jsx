import React, { useState } from "react";
import { TextField, Button, Typography, Box, Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { API_URL } from "../utils/api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    profileImage: null,
    role: "guest",
  });
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const handleChange = (e) => {
    if(e.target.name === "profileImage") {
      setForm({...form, profileImage: e.target.files[0]});
      setPreview(URL.createObjectURL(e.target.files[0]));
    } else {
      setForm({...form, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(form.password !== form.confirmPassword) {
      setError("Passwords do not match"); return;
    }
    form.email = form.email.toLowerCase();
    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if(key === "profileImage" && val) formData.append(key, val);
      else if(key !== "confirmPassword") formData.append(key, val);
    });

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message || "Registration failed");
      snackbar(`Registration successful, email: ${form.email}`, "success");
      navigate("/login");
    } catch (err) {
      snackbar(err.message, "error");
      setError(err.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, margin: "40px auto", p: 3 }}>
      <Typography variant="h4" mb={2}>Register</Typography>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <TextField name="firstName" label="First Name" fullWidth required margin="normal" value={form.firstName} onChange={handleChange} />
        <TextField name="lastName" label="Last Name" fullWidth required margin="normal" value={form.lastName} onChange={handleChange} />
        <TextField name="email" label="Email" type="email" fullWidth required margin="normal" value={form.email} onChange={handleChange} />
        <TextField name="password" label="Password" type="password" fullWidth required margin="normal" value={form.password} onChange={handleChange} />
        <TextField name="confirmPassword" label="Confirm Password" type="password" fullWidth required margin="normal" value={form.confirmPassword} onChange={handleChange} />
        <Button variant="contained" component="label" fullWidth sx={{ my: 2 }}>
          Upload Profile Image
          <input name="profileImage" type="file" hidden accept="image/*" onChange={handleChange} />
        </Button>
        {preview && <Avatar src={preview} sx={{ width: 56, height: 56, mx: "auto", my: 1 }} />}
        <Button type="submit" variant="contained" color="primary" fullWidth>Register</Button>
        {error && <Typography color="error" mt={2}>{error}</Typography>}
        <Typography mt={2} align="center">
          Already have an account? <a href="/login">Login</a>
        </Typography>
      </form>
    </Box>
  );
}
