import baseConfig from './index.json'
import { config, getApiUrl, isDev, isProd, mode } from './config-loader'

// 定义配置类型
export interface ApiConfig {
  baseUrl: string
  timeout: number
  version: string
}

export interface AppConfig {
  name: string
  version: string
}

export interface AuthConfig {
  tokenKey: string
  refreshTokenKey: string
  expires: number
}

export interface UploadConfig {
  maxSize: number
  allowedTypes: string[]
}

export interface Config {
  api: ApiConfig
  app: AppConfig
  auth: AuthConfig
  upload: UploadConfig
}

// 导出动态加载的配置
export { config as default, getApiUrl, isDev, isProd, mode }

// 导出基础配置，用于参考或测试
export const baseConfiguration = baseConfig 