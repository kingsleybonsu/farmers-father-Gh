const SERVER_ERROR_MESSAGE =
  "Something went wrong on our side. Please try again in a moment.";

export function getUserFriendlyErrorMessage(
  error,
  fallbackMessage = "Request failed. Please try again.",
) {
  if (!error?.response) {
    return "Can't reach the server. Check your internet connection and try again.";
  }

  if (error.response.status >= 500) {
    return SERVER_ERROR_MESSAGE;
  }

  return error.response.data?.message || fallbackMessage;
}
