import React, { useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography } from "@mui/material";
import { fetchWithAuth, API_URL, getAccessToken } from "../utils/api";
import { useSnackbar } from "./AppSnackbar";

export default function SupportTicketDialog({
  open,
  onClose,
  subject,
  source = "support",
  contextSlug = "",
  contextTitle = "",
  onSubmitted,
}) {
  const snackbar = useSnackbar();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fixedSubject = useMemo(() => {
    if (typeof subject === "string" && subject.trim()) {
      return subject.trim();
    }
    return "Support Request";
  }, [subject]);

  const resetAndClose = () => {
    setMessage("");
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      snackbar("Please describe your issue before submitting.", "warning");
      return;
    }

    if (!getAccessToken()) {
      snackbar("Please sign in to submit a support ticket.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetchWithAuth(`${API_URL}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: fixedSubject,
          message: message.trim(),
          source,
          contextSlug,
          contextTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit support ticket");
      }

      snackbar(data?.message || "Support ticket submitted and confirmation email sent.", "success");
      onSubmitted?.(data?.ticket);
      resetAndClose();
    } catch (error) {
      snackbar(error.message || "Failed to submit support ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="sm">
      <DialogTitle>Submit Support Ticket</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <TextField
          label="Subject"
          value={fixedSubject}
          fullWidth
          disabled
          sx={{mt:1}}
        />

        <TextField
          label="Message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          multiline
          minRows={5}
          fullWidth
          placeholder="Describe what happened, what you expected, and what you already tried."
        />

        <Typography variant="caption" color="text.secondary">
          After submission, we’ll email you to confirm your request was received.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetAndClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? "Sending..." : "Send Ticket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
