/**
 * Fetch with a bounded wait so a stalled API request cannot leave a publishing
 * control spinning forever. A timeout is an uncertain outcome; callers should
 * check the saved item's status before retrying a mutation.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)} seconds. Check the item's status before retrying.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
