/** Bounded requests that tolerate a sleeping backend. Never retry mutations. */
export async function fetchWithRecovery(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 60_000,
): Promise<Response> {
  const read = (init.method ?? "GET").toUpperCase() === "GET";
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    if (init.signal?.aborted) cancel();
    init.signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const response = await fetcher(input, {
        ...init,
        signal: controller.signal,
      });
      // Keep the deadline active until the body arrives, not just the headers.
      const bytes = await response.arrayBuffer();
      if (read && attempt === 0 && [502, 503, 504].includes(response.status))
        continue;
      return new Response(
        [204, 205, 304].includes(response.status) ? null : bytes,
        {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        },
      );
    } catch (error) {
      if (init.signal?.aborted)
        throw new DOMException("Request cancelled", "AbortError");
      if (read && attempt === 0) continue;
      if (timedOut)
        throw new DOMException("Service response timed out", "TimeoutError");
      throw error;
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", cancel);
    }
  }
}
