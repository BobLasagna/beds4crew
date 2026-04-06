import { Box, Button, Typography, Paper } from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";

const APP_STORE_URL = "https://apps.apple.com/us/app/beds4crew/id6760955475";

export default function UpdateRequiredScreen({ storeUrl, message }) {
  const url = storeUrl || APP_STORE_URL;

  const handleUpdate = () => {
    // _system tells Capacitor to open in the native OS handler (App Store app)
    window.open(url, "_system");
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 380,
          width: "100%",
          p: 4,
          borderRadius: 3,
          textAlign: "center",
          border: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 3,
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 3,
          }}
        >
          <SystemUpdateAltIcon sx={{ fontSize: 36, color: "#fff" }} />
        </Box>

        <Typography variant="h6" fontWeight={700} gutterBottom>
          Update Available
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          {message ||
            "A new version of Beds4Crew is available. Please update to continue."}
        </Typography>

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleUpdate}
          sx={{ borderRadius: 2, py: 1.5, fontWeight: 600 }}
        >
          Update Now
        </Button>
      </Paper>
    </Box>
  );
}
