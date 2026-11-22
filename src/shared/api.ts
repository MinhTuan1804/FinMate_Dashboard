import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { queryClient } from './queryClient';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const ACCESS_KEY = 'finmate_token';
const REFRESH_KEY = 'finmate_refresh_token';
export type Envelope<T> = { success: boolean; data: T; error?: { code?: string; message?: string; details?: unknown }; meta?: { cursor?: string | null; total?: number; offset?: number; limit?: number } };
export type Session = { accessToken: string; refreshToken: string; expiresAt?: string };
export type Profile = { id: string; email: string; displayName: string; role: string };

export const api = axios.create({ baseURL: API_BASE_URL });
const raw = axios.create({ baseURL: API_BASE_URL });
let refreshPending: Promise<string> | null = null;

export function accessToken() { return sessionStorage.getItem(ACCESS_KEY); }
export function refreshToken() { return sessionStorage.getItem(REFRESH_KEY); }
export function saveSession(session: Session) {
  sessionStorage.setItem(ACCESS_KEY, session.accessToken);
  sessionStorage.setItem(REFRESH_KEY, session.refreshToken);
  window.dispatchEvent(new Event('finmate-auth-change'));
}
export function clearSession() {
  queryClient.clear();
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event('finmate-auth-change'));
}
export type OtpStatus = { required: boolean; verified: boolean };
export type OpsMe = Profile & { capabilities: string[] };
export const INTERNAL_ROLES = ['Staff', 'OpsManager', 'Admin'];
export const ROLE_LABEL: Record<string, string> = { User: 'Người dùng', Staff: 'Nhân viên', OpsManager: 'Quản lý vận hành', Admin: 'Quản trị viên' };
/** Cần OTP khi backend bật 2FA và phiên này chưa xác thực. */
export async function needsOtp(): Promise<boolean> {
  // TẠM (cùng tab "Thử AI Agent"): backend chưa có khu /ops (404) thì không có 2FA để đòi. Mọi lỗi khác vẫn nổi lên. Khi xóa tab thử, trả lại 2 dòng gốc bên dưới.
  let status: OtpStatus;
  try { status = await getData<OtpStatus>('/ops/auth/status'); }
  catch (error) { if (axios.isAxiosError(error) && error.response?.status === 404) return false; throw error; }
  return status.required && !status.verified;
}
export const sendOtp = () => api.post('/ops/auth/otp/send');
/** Đổi access token chưa xác thực lấy token đã xác thực; refresh token giữ nguyên nếu backend không trả mới. */
export async function verifyOtp(code: string) {
  const current = refreshToken() ?? '';
  const response = await api.post<Envelope<Session>>('/ops/auth/otp/verify', { code, refreshToken: current });
  const next = response.data.data;
  if (!next?.accessToken) throw new Error('Chưa xác nhận được phiên đăng nhập. Vui lòng đăng nhập lại.');
  saveSession({ ...next, refreshToken: next.refreshToken || current });
}
/** Tải file cần Authorization (ảnh đính kèm): `<img src>` không gửi được header nên phải lấy blob rồi tạo object URL. */
export async function fetchBlob(path: string): Promise<Blob> {
  return (await api.get<Blob>(path, { responseType: 'blob' })).data;
}
export async function logout() {
  const token = refreshToken();
  try { if (token) await api.post('/auth/logout', { refreshToken: token }); }
  finally { clearSession(); }
}

api.interceptors.request.use(config => {
  const token = accessToken();
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };
async function renewToken(): Promise<string> {
  const token = refreshToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn');
  if (!refreshPending) {
    refreshPending = raw.post<Envelope<Session>>('/auth/refresh', { refreshToken: token })
      .then(response => {
        const next = response.data.data;
        if (!next?.accessToken || !next?.refreshToken) throw new Error('Không thể làm mới phiên');
        saveSession(next);
        return next.accessToken;
      }).finally(() => { refreshPending = null; });
  }
  return refreshPending;
}
api.interceptors.response.use(response => response, async (error: AxiosError) => {
  const config = error.config as RetryConfig | undefined;
  const isAuth = config?.url?.startsWith('/auth/') || config?.url?.startsWith('/ops/auth/');
  // 403 vì hết hạn xác thực OTP (không phải thiếu quyền): đưa về màn nhập mã.
  if (error.response?.status === 403 && !isAuth && location.pathname !== '/login') {
    const expired = await needsOtp().catch(() => false);
    if (expired) location.assign('/login');   // tải lại → App thấy chưa xác thực và hiện màn OTP
    return Promise.reject(error);
  }
  if (error.response?.status !== 401 || !config || config._retry || isAuth || !refreshToken()) return Promise.reject(error);
  config._retry = true;
  try {
    config.headers.Authorization = `Bearer ${await renewToken()}`;
  } catch (refreshError) {
    if (axios.isAxiosError(refreshError) && [400,401,403].includes(refreshError.response?.status||0)) {
      clearSession();
      sessionStorage.setItem('finmate_expired', '1');
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(refreshError);
  }
  return api(config);
});

export async function getEnvelope<T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<Envelope<T>> {
  const response = await api.get<Envelope<T>>(path, { params, signal });
  if (!response.data.success) throw new Error(response.data.error?.message || 'Yêu cầu thất bại');
  return response.data;
}
export async function getData<T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  return (await getEnvelope<T>(path, params, signal)).data;
}
/**
 * Lấy hết các trang của một danh mục NHỎ cho ô chọn cần đủ lựa chọn (mẫu mục tiêu, danh mục, câu trả lời mẫu). Mỗi lần xin 100 dòng, dừng khi hết hoặc chạm `max`;
 * danh sách để người dùng đọc/tìm vẫn phải đi qua `useServerList`, không dùng hàm này.
 */
export async function getAllPages<T>(path: string, params: Record<string, unknown> = {}, max = 1000): Promise<T[]> {
  const rows: T[] = [];
  while (rows.length < max) {
    const { data, meta } = await getEnvelope<T[]>(path, { ...params, limit: 100, offset: rows.length });
    rows.push(...data);
    if (data.length < 100 || (meta?.total !== undefined && rows.length >= meta.total)) break;
  }
  return rows;
}
export function errorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.';
    if (error.response.status === 429) return 'Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.';
    if (error.response.status >= 500 && !error.response.data?.error?.message) return 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại.';
    if (error.response?.status === 403) return 'Bạn không có quyền truy cập chức năng này';
    const failure = error.response?.data?.error;
    const details: string[] = Array.isArray(failure?.details) ? failure.details.map((item: { message?: string }) => item.message).filter(Boolean) : [];
    return [failure?.message || error.message, ...details].join(' · ');
  }
  return error instanceof Error ? error.message : 'Có lỗi xảy ra';
}
