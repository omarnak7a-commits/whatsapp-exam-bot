const API_BASE_URL = '/api';
const LOGIN_ENDPOINT = '/auth/login';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const isLoginRequest = endpoint === LOGIN_ENDPOINT;

    // Read the server's real error detail so we show the actual message
    // (e.g. "wrong credentials" or "account disabled") instead of a generic one.
    let serverDetail: string | null = null;
    try {
      const errData = await response.json();
      if (errData && typeof errData.detail === 'string') {
        serverDetail = errData.detail;
      }
    } catch {
      // Non-JSON body (proxy/network error page) — fall back to defaults below.
    }

    // Login endpoint: a 401 here means bad credentials (or a disabled account),
    // never an expired session. Show the real error message as-is.
    if (isLoginRequest) {
      throw new Error(
        serverDetail || 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      );
    }

    // True session expiry: an authenticated request returned 401.
    if (token) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('admin_name');
      localStorage.removeItem('admin_email');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/exam/')) {
        window.location.href = '/admin/login';
      }
      throw new Error(serverDetail || 'جلسة العمل انتهت، يرجى إعادة التسجيل');
    }

    // Unauthenticated request that still got a 401 — surface the server's error.
    throw new Error(serverDetail || 'حدث خطأ في النظام');
  }

  if (!response.ok) {
    let errorDetail = 'حدث خطأ في النظام';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errorDetail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Public API (no auth required)
export async function publicFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'حدث خطأ';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  return response.json();
}
