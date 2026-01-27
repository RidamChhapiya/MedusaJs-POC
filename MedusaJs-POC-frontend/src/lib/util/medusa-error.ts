export default function medusaError(error: any): never {
  // Log full error for debugging
  console.error("[medusaError] Full error object:", {
    error,
    type: typeof error,
    keys: error ? Object.keys(error) : [],
    message: error?.message,
    response: error?.response,
    request: error?.request,
    config: error?.config,
    status: error?.status,
    statusText: error?.statusText,
  })

  // Handle axios-style errors (with response property)
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    try {
      const url = error.config?.url 
        ? new URL(error.config.url, error.config.baseURL || "http://localhost").toString()
        : "Unknown URL"
      console.error("Resource:", url)
      console.error("Response data:", error.response.data)
      console.error("Status code:", error.response.status)
      console.error("Headers:", error.response.headers)

      // Extracting the error message from the response data
      const message = error.response.data?.message || 
                     error.response.data?.error || 
                     error.response.data || 
                     error.response.statusText ||
                     `Server error (${error.response.status})`

      throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
    } catch (urlError) {
      // If URL parsing fails, still try to extract message
      const message = error.response.data?.message || 
                     error.response.data?.error || 
                     error.response.data || 
                     `Server error (${error.response.status})`
      throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
    }
  } 
  
  // Handle fetch/network errors (request made but no response)
  if (error.request) {
    throw new Error("No response received from server. Please check your connection.")
  } 
  
  // Handle Medusa SDK errors or other error types
  // SDK might throw errors with status, statusText, or message properties
  if (error.status || error.statusText) {
    const message = error.message || error.statusText || `Request failed with status ${error.status}`
    throw new Error(message)
  }
  
  // Handle standard Error objects or unknown error types
  if (error instanceof Error) {
    throw error
  }
  
  // Fallback for any other error format
  const errorMessage = error?.message || 
                      error?.toString() || 
                      String(error) || 
                      "An unknown error occurred"
  console.error("Error setting up request:", error)
  throw new Error("Error setting up the request: " + errorMessage)
}
