import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken } from "../utils/api";

export default function ProtectedRoute({ children, requiredRole = null }) {
  const location = useLocation();
  const accessToken = getAccessToken();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Check if user is authenticated
  if (!accessToken) {
    const requestedPath = `${location.pathname}${location.search || ""}${location.hash || ""}`;
    const redirectQuery = encodeURIComponent(requestedPath || "/");
    return <Navigate to={`/login?redirect=${redirectQuery}`} replace />;
  }

  // Check if user has the required role
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}