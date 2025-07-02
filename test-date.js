// Helper function to get current date in user's timezone
const getCurrentDateInLocalTimezone = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to get current time in user's timezone
const getCurrentTimeInLocalTimezone = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Helper function to parse date string in local timezone
const parseDateInLocalTimezone = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
};

// Test the functions
const dateStr = getCurrentDateInLocalTimezone();
const timeStr = getCurrentTimeInLocalTimezone();

console.log("Current date string:", dateStr);
console.log("Current time string:", timeStr);
console.log(
  "Parsed date:",
  parseDateInLocalTimezone(dateStr).toLocaleDateString()
);
console.log("Current date (for comparison):", new Date().toLocaleDateString());
console.log("Timezone offset:", new Date().getTimezoneOffset(), "minutes");
