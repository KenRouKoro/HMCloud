import config, { getApiUrl } from '../config'
import type { BaseResponse, LoginParams, RegisterParams, UserViewData, OrganizationEntity, DeviceEntity, DeviceRecordEntity, DeviceSecRecordEntity, DeviceOperateEntity } from './types'
import { RsaCrypto } from '../utils/crypto'
import request from '../utils/request'
import { saveTokenToCookie } from '../utils/request'
import axios from 'axios'

/**
 * 处理基础响应结果
 * @param response 后端响应
 * @returns 响应数据
 */
async function handleBaseResponse<T>(response: any): Promise<T> {
  if (response.code !== 200) {
    throw new Error(response.message || '请求失败')
  }
  
  return response.data
}

// 认证相关API
export const authApi = {
  // 获取RSA公钥
  getPublicKey: async () => {
    const response = await request.get('auth/publicKey');
    return handleBaseResponse<string>(response);
  },
  
  // 登录
  login: async (params: LoginParams) => {
    // 复制参数，避免修改原始对象
    const encryptedParams = { ...params };
    
    // 对密码进行RSA加密
    if (encryptedParams.password) {
      encryptedParams.password = await RsaCrypto.encrypt(encryptedParams.password);
    }
    
    // 发送登录请求
    const response = await request.postForm('auth/login', encryptedParams);
    const token = await handleBaseResponse<string>(response);
    
    // 保存token到localStorage和cookie
    localStorage.setItem('glhmauth', token);
    saveTokenToCookie(token);
    
    // 验证登录状态
    const isLoggedIn = await authApi.isLoggedIn();
    if (!isLoggedIn) {
      localStorage.removeItem('glhmauth');
      saveTokenToCookie(null);
      throw new Error('登录验证失败');
    }
    
    return { token, isLoggedIn };
  },
  
  // 检查登录状态
  isLoggedIn: async () => {
    const response = await request.get('auth/isLogin');
    return handleBaseResponse<boolean>(response);
  },
  
  // 注销
  logout: async () => {
    const response = await request.get('auth/logout');
    // 移除本地存储的token和cookie
    localStorage.removeItem('glhmauth');
    saveTokenToCookie(null);
    return handleBaseResponse<boolean>(response);
  },
  
  // 检查是否允许注册
  canRegister: async () => {
    const response = await request.get('auth/can-register');
    return handleBaseResponse<boolean>(response);
  },
  
  // 注册
  register: async (params: RegisterParams) => {
    // 复制参数，避免修改原始对象
    const encryptedParams = { ...params };
    
    // 对密码进行RSA加密
    if (encryptedParams.password) {
      encryptedParams.password = await RsaCrypto.encrypt(encryptedParams.password);
    }
    
    // 发送注册请求
    const response = await request.postForm('auth/register', encryptedParams);
    const token = await handleBaseResponse<string>(response);
    
    // 保存token到localStorage和cookie
    localStorage.setItem('glhmauth', token);
    saveTokenToCookie(token);
    
    // 验证登录状态
    const isLoggedIn = await authApi.isLoggedIn();
    if (!isLoggedIn) {
      localStorage.removeItem('glhmauth');
      saveTokenToCookie(null);
      throw new Error('注册后登录验证失败');
    }
    
    return { token, isLoggedIn };
  }
}

// 用户相关API
export const userApi = {
  // 获取当前用户信息
  getUserInfo: async () => {
    const response = await request.get('view/user/this');
    return handleBaseResponse<UserViewData>(response);
  },
  
  // 更新用户邮箱
  updateEmail: async (email: string) => {
    const response = await request.post(`view/user/update-email?email=${encodeURIComponent(email)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新用户名
  updateName: async (name: string) => {
    const response = await request.post(`view/user/update-name?name=${encodeURIComponent(name)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新密码
  updatePassword: async (oldPassword: string, newPassword: string) => {
    const response = await request.post(
      `view/user/update-passwd?old-password=${encodeURIComponent(oldPassword)}&password=${encodeURIComponent(newPassword)}`
    );
    return handleBaseResponse<string>(response);
  },
  
  // 更新手机号
  updatePhone: async (phone: string) => {
    const response = await request.post(`view/user/update-phone?phone=${encodeURIComponent(phone)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新用户头像
  updateAvatar: async (avatarUrl: string) => {
    const response = await request.post(`view/user/update-avatar?avatar=${encodeURIComponent(avatarUrl)}`);
    return handleBaseResponse<string>(response);
  }
}

// 组织相关API
export const organizationApi = {
  // 获取所有组织列表
  getOrganizationList: async () => {
    const response = await request.post('view/organization/list');
    return handleBaseResponse<OrganizationEntity[]>(response);
  },
  
  // 获取当前账号的组织信息
  getThisOrganization: async () => {
    const response = await request.post('view/organization/this');
    return handleBaseResponse<OrganizationEntity>(response);
  },
  
  // 获取组织名称
  getOrganizationName: async (organizationId: string) => {
    const response = await request.post(`view/organization/get-name?id=${encodeURIComponent(organizationId)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新组织信息（也用于创建新组织）
  updateOrganization: async (organization: OrganizationEntity) => {
    // 将对象转换为URL查询参数
    const params = new URLSearchParams();
    
    // 添加每个字段到查询参数
    for (const [key, value] of Object.entries(organization)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    
    const queryString = params.toString();
    const response = await request.post(`view/organization/update?${queryString}`);
    return handleBaseResponse<string>(response);
  },
  
  // 删除组织
  deleteOrganization: async (id: string) => {
    const response = await request.post(`view/organization/delete?id=${encodeURIComponent(id)}`);
    return handleBaseResponse<string>(response);
  }
}

// 超级管理员相关API
export const superAdminApi = {
  // 获取用户列表
  getUserList: async () => {
    const response = await request.get('view/su/list');
    return handleBaseResponse<UserViewData[]>(response);
  },
  
  // 创建用户
  createUser: async (username: string) => {
    const response = await request.post(`view/su/create-user?user=${encodeURIComponent(username)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新指定用户头像
  updateUserAvatar: async (userId: string, avatar: string) => {
    const response = await request.post(`view/su/update-avatar?user=${encodeURIComponent(userId)}&avatar=${encodeURIComponent(avatar)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新指定用户邮箱
  updateUserEmail: async (userId: string, email: string) => {
    const response = await request.post(`view/su/update-email?user=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新指定用户名称
  updateUserName: async (userId: string, name: string) => {
    const response = await request.post(`view/su/update-name?user=${encodeURIComponent(userId)}&name=${encodeURIComponent(name)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新指定用户组织ID
  updateUserOrganizationId: async (userId: string, organizationId: string) => {
    const response = await request.post(`view/su/update-organization-id?user=${encodeURIComponent(userId)}&organization-id=${encodeURIComponent(organizationId)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新指定用户密码
  updateUserPassword: async (userId: string, password: string) => {
    const response = await request.post(`view/su/update-passwd?user=${encodeURIComponent(userId)}&password=${encodeURIComponent(password)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 更新指定用户权限等级
  updateUserPermission: async (userId: string, permission: number) => {
    const response = await request.post(`view/su/update-permission?user=${encodeURIComponent(userId)}&permission=${permission}`);
    return handleBaseResponse<number>(response);
  },
  
  // 更新指定用户电话
  updateUserPhone: async (userId: string, phone: string) => {
    const response = await request.post(`view/su/update-phone?user=${encodeURIComponent(userId)}&phone=${encodeURIComponent(phone)}`);
    return handleBaseResponse<string>(response);
  }
}

// 设备相关API
export const deviceApi = {
  // 获取当前组织下所有设备
  getOrgDevices: async () => {
    const response = await request.post('view/device/this');
    return handleBaseResponse<DeviceEntity[]>(response);
  },
  
  // 获取指定ID的设备信息
  getDeviceById: async (deviceId: string) => {
    const response = await request.post(`view/device/get?id=${encodeURIComponent(deviceId)}`);
    return handleBaseResponse<DeviceEntity>(response);
  },
  
  // 更新或新增设备
  updateDevice: async (device: DeviceEntity) => {
    const response = await request.post('view/device/update', device);
    return handleBaseResponse<string>(response);
  },
  
  // 获取设备记录
  getDeviceRecords: async (deviceId: string, page: number = 0, size: number = 20) => {
    // 确保页码和大小在合理范围内
    page = 0; // 设备记录只允许查询第0页
    size = Math.max(20, Math.min(500, size)); // 确保大小在20-500之间

    const response = await request.post(`view/record/device?id=${encodeURIComponent(deviceId)}&page=${page}&size=${size}`);
    return handleBaseResponse<DeviceRecordEntity[]>(response);
  },
  
  // 获取秒级设备记录
  getDeviceSecRecords: async (deviceId: string, page: number = 0, size: number = 20) => {
    // 确保页码和大小在合理范围内
    page = 0; // 秒级设备记录只允许查询第0页
    size = Math.max(20, Math.min(500, size)); // 确保大小在20-500之间
    
    const response = await request.post(`view/record/sec?id=${encodeURIComponent(deviceId)}&page=${page}&size=${size}`);
    return handleBaseResponse<DeviceSecRecordEntity[]>(response);
  },
  
  // 获取设备操作记录
  getDeviceOperateRecords: async (deviceId: string, page: number = 0, size: number = 10) => {
    // 确保页码和大小在合理范围内
    size = Math.max(10, Math.min(100, size)); // 确保大小在10-100之间
    
    const response = await request.post(`view/record/operate?id=${encodeURIComponent(deviceId)}&page=${page}&size=${size}`);
    return handleBaseResponse<DeviceOperateEntity[]>(response);
  },
  
  // 删除设备
  deleteDevice: async (deviceId: string) => {
    const response = await request.post(`view/device/delete?id=${encodeURIComponent(deviceId)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 发送命令到设备
  sendCommand: async (deviceId: string, command: string) => {
    const response = await request.post('view/device/send-command', {
      deviceId,
      command
    });
    return handleBaseResponse<string>(response);
  }
}

// 图片相关API
export const imageApi = {
  // 上传图片
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('fileField', file);
    
    // 获取token并确保保存到cookie
    const token = localStorage.getItem('glhmauth') || '';
    saveTokenToCookie(token || null);
    
    // 对于FormData需要特殊处理请求头
    const response = await axios.post(`${getApiUrl()}/image/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'glhmauth': token
      },
      withCredentials: true // 确保跨域请求也携带凭证
    });
    
    return handleBaseResponse<string>(response.data);
  },
  
  // 更新图片
  updateImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('fileField', file);
    
    // 获取token并确保保存到cookie
    const token = localStorage.getItem('glhmauth') || '';
    saveTokenToCookie(token || null);
    
    const response = await axios.post(`${getApiUrl()}/image/update?id=${encodeURIComponent(id)}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'glhmauth': token
      },
      withCredentials: true // 确保跨域请求也携带凭证
    });
    
    return handleBaseResponse<string>(response.data);
  },
  
  // 删除图片
  deleteImage: async (id: string) => {
    const response = await request.post(`image/delete?id=${encodeURIComponent(id)}`);
    return handleBaseResponse<string>(response);
  },
  
  // 获取图片URL(此方法将返回URL，但实际使用时可能会遇到跨域认证问题)
  getImageUrl: (id: string) => {
    if (!id || id === 'null' || id === 'undefined') {
      return '';
    }
    
    // 获取token并确保保存到cookie，这样图片请求也能通过cookie携带token
    const token = localStorage.getItem('glhmauth') || '';
    saveTokenToCookie(token || null);
    
    // 返回图片URL
    return `${getApiUrl()}/image/get?id=${encodeURIComponent(id)}`;
  },
  
  // 获取图片Blob数据，处理跨域认证问题
  getImageBlob: async (id: string): Promise<string> => {
    if (!id || id === 'null' || id === 'undefined') {
      return '';
    }
    
    // 获取token
    const token = localStorage.getItem('glhmauth') || '';
    
    // 使用axios发起请求，添加认证头
    try {
      const response = await axios.get(`${getApiUrl()}/image/get?id=${encodeURIComponent(id)}`, {
        headers: {
          'glhmauth': token
        },
        responseType: 'blob',
        withCredentials: true
      });
      
      // 创建Blob URL
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('获取图片失败:', error);
      throw error;
    }
  }
}
