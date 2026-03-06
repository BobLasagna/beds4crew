import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const isArchivedBookingStatus = (status) => status === "cancelled" || status === "rejected";

export const getLastMessageTimestamp = (booking) => {
  const messageCount = booking.messages?.length || 0;
  if (messageCount > 0) {
    const timestamp = booking.messages[messageCount - 1]?.timestamp;
    if (timestamp) return new Date(timestamp).getTime();
  }
  return dayjs.utc(booking.startDate).valueOf();
};

export const sortBookingThreads = (list, { sortBy, sortDirection, unreadKey }) => {
  const sorted = [...list];

  sorted.sort((a, b) => {
    let compareA;
    let compareB;

    switch (sortBy) {
      case "property":
        compareA = (a.property?.title || "").toLowerCase();
        compareB = (b.property?.title || "").toLowerCase();
        break;
      case "date":
        compareA = dayjs.utc(a.startDate).valueOf();
        compareB = dayjs.utc(b.startDate).valueOf();
        break;
      case "newMessage":
      default:
        compareA = `${a[unreadKey] ? "0" : "1"}-${String(9999999999999 - getLastMessageTimestamp(a)).padStart(13, "0")}`;
        compareB = `${b[unreadKey] ? "0" : "1"}-${String(9999999999999 - getLastMessageTimestamp(b)).padStart(13, "0")}`;
        break;
    }

    if (compareA < compareB) return sortDirection === "asc" ? -1 : 1;
    if (compareA > compareB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
};
