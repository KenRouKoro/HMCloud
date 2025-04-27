import axios from 'axios';
import config, { getApiUrl } from '@/config';
import { useAuthStore } from '@/stores/authStore.ts';

/**
 * 将对象转换为URLSearchParams
 */
function objectToUrlSearchParams(obj: Record<string, any>): URLSearchParams {
  const params = new URLSearchParams();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  return params;
}

/**
 * 将token保存到cookie中，确保所有请求（包括OPTIONS预检请求）都能自动携带凭证
 * @param token 认证token
 */
export function saveTokenToCookie(token: string | null) {
  if (token) {
    // 设置同域cookie，过期时间设置为1天
    document.cookie = `glhmauth=${token}; path=/; max-age=86400; SameSite=Lax`;
  } else {
    // 清除cookie
    document.cookie = 'glhmauth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

// 创建axios实例
const axiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
  },
  // 启用跨域请求时发送凭证
  withCredentials: true
});

// 移除默认设置，它们对浏览器自动生成的OPTIONS预检请求不生效
// axios.defaults.withCredentials = true;
// axios.defaults.headers.common['glhmauth'] = localStorage.getItem('glhmauth') || '';

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('glhmauth');
    
    // 如果有token，添加到请求头
    if (token) {
      config.headers['glhmauth'] = token;
      // 同时确保token也保存在cookie中
      saveTokenToCookie(token);
    }
    
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    // 如果返回的状态码为200，说明接口请求成功，可以正常返回数据
    if (response.status === 200) {
      return response.data;
    }
    
    // 其他状态码处理
    console.error('响应异常:', response);
    return Promise.reject(new Error('请求失败'));
  },
  async (error) => {
    if (error.response) {
      // 如果响应状态码为401，说明token过期或无效
      if (error.response.status === 401) {
        // 清除本地token
        localStorage.removeItem('glhmauth');
        // 清除cookie中的token
        saveTokenToCookie(null);
        
        // 使用auth store处理登出状态
        const authStore = useAuthStore();
        authStore.setLoggedIn(false);
        
        // 重定向到登录页面
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// 封装请求方法
const request = {
  get: <T = any>(url: string, config = {}) => {
    return axiosInstance.get<T>(url, config);
  },
  
  post: <T = any>(url: string, data?: any, config = {}) => {
    return axiosInstance.post<T>(url, data, config);
  },
  
  put: <T = any>(url: string, data?: any, config = {}) => {
    return axiosInstance.put<T>(url, data, config);
  },
  
  delete: <T = any>(url: string, config = {}) => {
    return axiosInstance.delete<T>(url, config);
  },
  
  /**
   * 发送表单数据 - POST请求
   * @param url 请求地址
   * @param data 表单数据对象
   * @param config 请求配置
   * @returns 请求响应
   */
  postForm: <T = any>(url: string, data?: Record<string, any>, config = {}) => {
    const formData = objectToUrlSearchParams(data || {});
    return axiosInstance.post<T>(url, formData, config);
  }
};

export default request; 