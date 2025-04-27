/**
 * 后端响应基础格式
 */
export interface BaseResponse<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 登录请求参数
 */
export interface LoginParams {
  username: string;
  password: string;
  remember?: boolean;
}

/**
 * 注册请求参数
 */
export interface RegisterParams {
  username: string;
  password: string;
  email?: string;
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  token: string;
}

/**
 * 用户信息详情数据
 */
export interface UserViewData {
  id: string; // UUID
  username: string;
  email: string;
  phone: string;
  organizationID: string;
  avatar: string;
  permission: number;
}

/**
 * 组织实体
 */
export interface OrganizationEntity {
  id?: string; // UUID，新建时为空
  name: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  deviceEntities: string; // JSON Array字符串
}

/**
 * 设备实体
 */
export interface DeviceEntity {
  id: string;
  type: string;
  organization_id: string | null;
  online: boolean;
  name: string;
  image: string;
  info: string;
  device_description: string; // JSON字符串
  description: string; // JSON数组字符串
}

/**
 * 设备记录基础实体
 */
export interface BaseDeviceRecordEntity {
  time: number; // 时间戳
  device_id: string;
  data: string; // JSON字符串
  type: string;
}

/**
 * 秒级设备记录实体
 */
export interface DeviceSecRecordEntity extends BaseDeviceRecordEntity {}

/**
 * 设备记录实体
 */
export interface DeviceRecordEntity extends BaseDeviceRecordEntity {}

/**
 * 设备操作记录实体
 */
export interface DeviceOperateEntity extends BaseDeviceRecordEntity {}

/**
 * 设备描述字段
 */
export interface DeviceDescriptionField {
  name: string;
  type: 'number' | 'button' | 'bool' | 'string';
  str?: string; // 字段的显示名称/翻译键
}

/**
 * 设备命令接口定义
 */
export interface DeviceCommand {
  name?: string;
  template?: string;
  prams?: string[];
  permission?: number;
  [key: string]: any;
}

/**
 * 图片投影接口
 */
export interface ImageProjection {
  id: string; // UUID格式
  name: string;
  size?: number; // 文件大小，单位字节
  createTime?: string; // 创建时间
} 