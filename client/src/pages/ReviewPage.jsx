import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL, fetchWithAuth } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function ReviewPage() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reviewMeta, setReviewMeta] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetchWithAuth(`${API_URL}/reviews/token/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data?.message || "This review link is invalid or expired.");
          return;
        }

        setReviewMeta(data);
      } catch {
        setError("Failed to load the review link.");
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, [token]);

  const handleSubmit = async () => {
    if (!rating) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetchWithAuth(`${API_URL}/reviews/token/${token}`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Failed to submit review");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const fallbackPath = currentUser.role === "host" ? "/reservations" : "/trips";

  if (loading) {
    return (
      <Box sx={{ ...commonStyles.contentContainer, display: "grid", placeItems: "center", minHeight: "40vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={commonStyles.contentContainer}>
      <Card sx={{ maxWidth: 760, mx: "auto", p: { xs: 2.5, md: 3.5 }, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Reservation Review
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!reviewMeta && !submitted && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              This review link cannot be used.
            </Typography>
            <Button variant="outlined" onClick={() => navigate(fallbackPath)}>
              Back
            </Button>
          </Stack>
        )}

        {reviewMeta && !submitted && (
          <Stack spacing={2}>
            <Alert severity="warning">
              {reviewMeta.reviewFlow === "host_to_guest"
                ? "This is your host follow-up review for the guest."
                : "Submitting this guest review archives the reservation and disables messaging."}
            </Alert>

            <Typography variant="body2" color="text.secondary">
              Property: {reviewMeta.propertyTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reviewing: {reviewMeta.reviewTargetName}
            </Typography>
            {reviewMeta.anonymous && (
              <ChipPlaceholder />
            )}

            <Box>
              <Typography variant="body2" sx={{ mb: 0.75 }}>Rating</Typography>
              <Rating
                value={rating}
                onChange={(_, value) => setRating(value || 1)}
                precision={1}
                size="large"
              />
            </Box>

            <TextField
              label="Comment (optional)"
              multiline
              minRows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting || !rating}>
                Submit Review
              </Button>
              <Button variant="outlined" onClick={() => navigate(fallbackPath)} disabled={submitting}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        )}

        {submitted && (
          <Stack spacing={2}>
            <Alert severity="success">Review submitted successfully.</Alert>
            <Button variant="contained" onClick={() => navigate(fallbackPath)}>
              Return
            </Button>
          </Stack>
        )}
      </Card>
    </Box>
  );
}

function ChipPlaceholder() {
  return (
    <Alert severity="info">
      Anonymous mode is enabled for this review.
    </Alert>
  );
}
