import axios from 'axios';
import { getApiUrl } from '../config';
import type { Directive, DirectiveBinding } from 'vue';

// 扩展HTMLImageElement类型，添加_cleanup属性
interface AuthImageElement extends HTMLImageElement {
  _cleanup?: () => void;
}

// 指令处理函数
const loadAuthImage = async (el: AuthImageElement, binding: DirectiveBinding) => {
  // 保存原始src，用于错误处理
  const fallbackSrc = el.getAttribute('src') || '';
  
  // 设置加载中状态
  el.setAttribute('src', ''); // 清空src以避免未认证请求
  el.style.opacity = '0.5';
  
  // 检查绑定值 - 图片ID
  const imageId = binding.value;
  if (!imageId) {
    el.setAttribute('src', fallbackSrc);
    console.error('v-auth-image指令需要提供图片ID');
    return;
  }
  
  try {
    // 获取token
    const token = localStorage.getItem('glhmauth') || '';
    
    // 使用axios发起带认证的请求
    const response = await axios.get(`${getApiUrl()}/image/get?id=${encodeURIComponent(imageId)}`, {
      headers: {
        'glhmauth': token
      },
      responseType: 'blob',
      withCredentials: true
    });
    
    // 创建对象URL
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const objectUrl = URL.createObjectURL(blob);
    
    // 使用创建的URL作为图片源
    el.setAttribute('src', objectUrl);
    el.style.opacity = '1';
    
    // 图片加载完成时重置样式
    el.onload = () => {
      el.style.opacity = '1';
    };
    
    // 清理函数，当元素被销毁时释放objectUrl
    el._cleanup = () => URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('加载认证图片失败:', error);
    el.setAttribute('src', fallbackSrc); // 错误时使用后备图片
    el.style.opacity = '1';
  }
};

/**
 * 用于加载需要认证的图片的指令
 * 使用方式：v-auth-image="imageId"
 */
const authImage: Directive = {
  mounted(el: AuthImageElement, binding: DirectiveBinding) {
    loadAuthImage(el, binding);
  },
  beforeUnmount(el: AuthImageElement) {
    // 调用清理函数释放资源
    if (el._cleanup && typeof el._cleanup === 'function') {
      el._cleanup();
    }
  },
  updated(el: AuthImageElement, binding: DirectiveBinding) {
    // 如果图片ID变更，重新加载
    if (binding.value !== binding.oldValue) {
      // 调用清理函数释放之前的资源
      if (el._cleanup && typeof el._cleanup === 'function') {
        el._cleanup();
      }
      
      // 重新调用处理函数
      loadAuthImage(el, binding);
    }
  }
};

export default authImage; 