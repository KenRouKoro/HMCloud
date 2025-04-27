import JSEncrypt from 'jsencrypt';
import { getApiUrl } from '../config/config-loader';

/**
 * RSA加密工具类
 */
export class RsaCrypto {
  /**
   * 获取RSA公钥
   * @returns RSA公钥
   */
  public static async getPublicKey(): Promise<string> {
    try {
      const response = await fetch(getApiUrl('auth/publicKey'));
      if (!response.ok) {
        throw new Error(`获取公钥失败: ${response.status}`);
      }
      
      // 解析JSON响应
      const result = await response.json();
      
      // 检查响应结构是否正确
      if (result.code !== 200 || !result.data) {
        throw new Error(`获取公钥失败: ${result.message || '未知错误'}`);
      }
      
      return result.data;
    } catch (error) {
      console.error('获取RSA公钥失败:', error);
      throw error;
    }
  }

  /**
   * 使用RSA加密数据
   * @param data 待加密的数据
   * @returns 加密后的数据
   */
  public static async encrypt(data: string): Promise<string> {
    const publicKey = await this.getPublicKey();
    const encryptor = new JSEncrypt();
    encryptor.setPublicKey(publicKey);
    const encrypted = encryptor.encrypt(data);
    
    if (!encrypted) {
      throw new Error('RSA加密失败');
    }
    
    return encrypted;
  }
} 