const nativeFetch: typeof fetch = (...args) => globalThis.fetch(...args);

export { nativeFetch as fetch };
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
export default nativeFetch;
