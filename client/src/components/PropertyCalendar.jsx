import React, { useMemo } from "react";
import { Box, Typography, Paper, Grid } from "@mui/material";
import dayjs from "dayjs";

export default function PropertyCalendar({ bookings = [], monthsToShow = 3 }) {
  // Generate calendar data
  const calendarData = useMemo(() => {
    const today = dayjs();
    const months = [];

    // Create a set of occupied dates for quick lookup
    const occupiedDates = new Set();
    bookings.forEach((booking) => {
      const start = dayjs(booking.startDate);
      const end = dayjs(booking.endDate);
      let current = start;
      
      while (current.isBefore(end) || current.isSame(end, "day")) {
        occupiedDates.add(current.format("YYYY-MM-DD"));
        current = current.add(1, "day");
      }
    });

    // Generate months
    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = today.add(i, "month");
      const firstDay = monthDate.startOf("month");
      const daysInMonth = monthDate.daysInMonth();
      const startDayOfWeek = firstDay.day(); // 0 = Sunday

      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let j = 0; j < startDayOfWeek; j++) {
        days.push(null);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = monthDate.date(day);
        const dateStr = date.format("YYYY-MM-DD");
        const isPast = date.isBefore(today, "day");
        const isOccupied = occupiedDates.has(dateStr);
        
        days.push({
          day,
          date: dateStr,
          isPast,
          isOccupied,
          isFree: !isPast && !isOccupied,
        });
      }

      months.push({
        name: monthDate.format("MMMM YYYY"),
        days,
      });
    }

    return months;
  }, [bookings, monthsToShow]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Availability Calendar
      </Typography>
      
      <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: "#4caf50", borderRadius: 1 }} />
          <Typography variant="caption">Free</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: "#f44336", borderRadius: 1 }} />
          <Typography variant="caption">Occupied</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: "#e0e0e0", borderRadius: 1 }} />
          <Typography variant="caption">Past</Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {calendarData.map((month, idx) => (
          <Grid item xs={12} md={6} lg={4} key={idx}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle1" align="center" gutterBottom fontWeight="bold">
                {month.name}
              </Typography>
              
              {/* Week day headers */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1 }}>
                {weekDays.map((day) => (
                  <Typography
                    key={day}
                    variant="caption"
                    align="center"
                    fontWeight="bold"
                    color="text.secondary"
                  >
                    {day}
                  </Typography>
                ))}
              </Box>

              {/* Calendar days */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
                {month.days.map((day, dayIdx) => (
                  <Box
                    key={dayIdx}
                    sx={{
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1,
                      bgcolor: day
                        ? day.isPast
                          ? "#e0e0e0"
                          : day.isOccupied
                          ? "#f44336"
                          : "#4caf50"
                        : "transparent",
                      color: day ? (day.isPast ? "#757575" : "white") : "transparent",
                      fontSize: "0.875rem",
                      fontWeight: day?.isFree ? "bold" : "normal",
                    }}
                  >
                    {day?.day || ""}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
