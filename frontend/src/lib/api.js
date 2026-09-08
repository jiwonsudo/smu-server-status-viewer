import { URL_ROOT } from './config';

// apiGet fetches JSON from the backend and throws Error(status) on a non-2xx
// response.
export async function apiGet(path, opts) {
  const res = await fetch(`${URL_ROOT}${path}`, opts);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// apiPost sends an optional JSON body and resolves to the Response (callers
// check res.ok). No body → a plain POST.
export function apiPost(path, body) {
  return fetch(`${URL_ROOT}${path}`, {
    method: 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
