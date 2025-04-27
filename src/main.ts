import {createApp} from 'vue'
import {createPinia} from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router/index'
import { useAuthStore } from './stores/authStore'
import authImage from './directives/authImage'
import { saveTokenToCookie } from './utils/request'

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)

// 注册图片认证指令
app.directive('auth-image', authImage)

// 初始化应用
const initApp = async () => {
  // 获取authStore并初始化
  const authStore = useAuthStore();
  
  // 等待authStore初始化完成
  await authStore.init();
  
  // 确保token同步到cookie
  const savedToken = localStorage.getItem('glhmauth');
  if (savedToken) {
    saveTokenToCookie(savedToken);
  }
  
  // 挂载应用
  app.mount('#app');
};

initApp();
