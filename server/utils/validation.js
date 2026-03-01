// Input validation utilities

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, message: "Invalid date format" };
  }
  
  if (start >= end) {
    return { valid: false, message: "End date must be after start date" };
  }
  
  if (start < now) {
    return { valid: false, message: "Start date cannot be in the past" };
  }
  
  return { valid: true };
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove potential XSS attempts
  return input.replace(/<[^>]*>/g, '').trim();
};

module.exports = {
  validateEmail,
  validatePassword,
  validateDateRange,
  sanitizeInput
};
