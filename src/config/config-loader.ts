import baseConfig from './index.json'
import type { Config } from './index'

/**
 * 加载配置并合并环境变量
 */
export function loadConfig(): Config {
  const config = { ...baseConfig } as Config
  
  // 如果环境变量中有API基础URL，则覆盖配置中的值
  if (import.meta.env.VITE_API_BASE_URL) {
    config.api.baseUrl = import.meta.env.VITE_API_BASE_URL
  }
  
  // 如果环境变量中有应用名称，则覆盖配置中的值
  if (import.meta.env.VITE_APP_TITLE) {
    config.app.name = import.meta.env.VITE_APP_TITLE
  }
  
  return config
}

// 导出加载的配置
export const config = loadConfig()

// 导出环境信息
export const isDev = import.meta.env.DEV
export const isProd = import.meta.env.PROD
export const mode = import.meta.env.MODE

// 辅助函数
export function getApiUrl(path: string = ''): string {
  let baseUrl = config.api.baseUrl
  const version = config.api.version
  
  // 确保baseUrl末尾没有斜杠
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  // 确保path不以斜杠开头
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  let finalUrl = '';
  if (!normalizedPath) {
    finalUrl = baseUrl;
  } else {
    finalUrl = `${baseUrl}/${normalizedPath}`;
  }
  
  // 打印最终拼接的URL
  console.log('API请求URL:', finalUrl);
  
  return finalUrl;
} 