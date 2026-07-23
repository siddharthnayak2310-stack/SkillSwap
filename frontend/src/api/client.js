import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('skillswap_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const formatApiError = (err) => {
  const d = err?.response?.data?.detail;
  if (d == null) return err?.message || 'Something went wrong';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(' ');
  if (d && typeof d.msg === 'string') return d.msg;
  return String(d);
};

export default api;
