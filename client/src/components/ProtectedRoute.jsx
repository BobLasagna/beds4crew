import React from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "../utils/api";

export default function ProtectedRoute({ children, requiredRole = null }) {
  const accessToken = getAccessToken();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Check if user is authenticated
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}