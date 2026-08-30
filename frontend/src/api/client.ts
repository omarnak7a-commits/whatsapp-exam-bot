const API_BASE_URL = '/api';

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
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/exam/')) {
      window.location.href = '/admin/login';
    }
    throw new Error('جلسة العمل انتهت، يرجى إعادة التسجيل');
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
