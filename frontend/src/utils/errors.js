// The backend sometimes replies with plain text and sometimes with { message } or { msg },
// so turn any of those into one readable line for the UI
export const getErrorMessage = (err) => {
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.msg) return data.msg;
  if (!err?.response) return "Can't reach the server. Please try again in a moment.";
  return "Something went wrong";
};
