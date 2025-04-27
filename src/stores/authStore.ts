import {defineStore} from 'pinia'
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import { authApi, userApi } from '../api'
import config from '../config'
import type { RegisterParams, UserViewData } from '../api/types'
import { saveTokenToCookie } from '../utils/request'

// 创建并导出身份验证存储
export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()

    // 状态
    const isLoggedIn = ref(false)
    const showLoginModal = ref(false)
    const originalRoute = ref<string | null>(null)
    const user = ref<UserViewData | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)
    const canRegister = ref(false)
    const token = ref<string | null>(null)

    // 获取用户信息
    async function fetchUserInfo() {
        try {
            const userInfo = await userApi.getUserInfo();
            user.value = userInfo;
            return userInfo;
        } catch (err) {
            console.error('获取用户信息失败:', err);
            throw err;
        }
    }

    // 初始化 - 检查登录状态和注册权限
    async function init() {
        loading.value = true
        
        try {
            // 从localStorage获取token
            const savedToken = localStorage.getItem('glhmauth');
            if (savedToken) {
                token.value = savedToken;
                // 将token同步到cookie中，确保OPTIONS请求也能携带
                saveTokenToCookie(savedToken);
                console.log('已从localStorage恢复Token并同步到Cookie');
            }
            
            // 检查登录状态
            // 如果有token，先验证登录状态
            let loggedIn = false;
            
            try {
                loggedIn = await authApi.isLoggedIn();
                console.log('登录状态验证结果:', loggedIn);
            } catch (err) {
                console.error('验证登录状态失败:', err);
                // 如果验证失败且有token，清除token
                if (token.value) {
                    localStorage.removeItem('glhmauth');
                    // 同时清除cookie中的token
                    saveTokenToCookie(null);
                    token.value = null;
                }
            }
            
            isLoggedIn.value = loggedIn;
            
            // 如果API返回未登录状态但本地有token，说明token失效
            if (!loggedIn && token.value) {
                console.log('Token已失效，清除本地Token');
                localStorage.removeItem('glhmauth');
                // 同时清除cookie中的token
                saveTokenToCookie(null);
                token.value = null;
            }
            
            // 检查是否允许注册（这可以并行进行）
            try {
                canRegister.value = await authApi.canRegister();
            } catch (err) {
                console.error('检查注册权限失败:', err);
                canRegister.value = false;
            }
            
            // 如果已登录，获取用户信息
            if (loggedIn) {
                try {
                    await fetchUserInfo();
                    console.log('用户信息获取成功:', user.value);
                } catch (err) {
                    console.error('获取用户信息失败:', err)
                }
            }
            
            return isLoggedIn.value;
        } catch (err) {
            console.error('初始化失败:', err)
            isLoggedIn.value = false
            token.value = null;
            localStorage.removeItem('glhmauth');
            // 同时清除cookie中的token
            saveTokenToCookie(null);
            return false;
        } finally {
            loading.value = false
        }
    }

    // 检查是否允许注册
    async function checkCanRegister() {
        try {
            canRegister.value = await authApi.canRegister()
            return canRegister.value
        } catch (err) {
            console.error('检查注册权限失败:', err)
            canRegister.value = false
            return false
        }
    }

    // 记录原始路由
    function setOriginalRoute(route: string) {
        originalRoute.value = route
    }
    
    // 设置登录状态
    function setLoggedIn(status: boolean) {
        isLoggedIn.value = status
        
        // 如果登出，清除token
        if (!status && token.value) {
            localStorage.removeItem('glhmauth');
            // 同时清除cookie中的token
            saveTokenToCookie(null);
            token.value = null;
        }
    }

    // 登录方法
    async function login(username: string, password: string, remember: boolean = false) {
        loading.value = true
        error.value = null
        
        try {
            // 调用登录API，包括获取token和验证登录状态
            const result = await authApi.login({ username, password, remember })
            
            // 设置token
            token.value = result.token
            
            // 更新状态 - 已经通过API验证了登录状态
            isLoggedIn.value = result.isLoggedIn
            
            // 只有确认登录状态后才获取用户信息并关闭模态框
            if (result.isLoggedIn) {
                try {
                    await fetchUserInfo();
                    console.log('登录后获取用户信息成功:', user.value);
                } catch (err) {
                    console.error('登录后获取用户信息失败:', err)
                }
                
                showLoginModal.value = false
                
                // 如果有原始路由，登录成功后导航回去
                if (originalRoute.value && originalRoute.value !== '/public') {
                    router.push(originalRoute.value)
                    originalRoute.value = null
                } else {
                    router.push('/')
                }
            }
        } catch (err: any) {
            error.value = err.message || '登录失败，请重试'
            console.error('登录失败:', err)
        } finally {
            loading.value = false
        }
    }

    // 注册方法
    async function register(params: RegisterParams) {
        loading.value = true
        error.value = null
        
        try {
            // 调用注册API，包括获取token和验证登录状态
            const result = await authApi.register(params)
            
            // 设置token
            token.value = result.token
            
            // 更新状态 - 已经通过API验证了登录状态
            isLoggedIn.value = result.isLoggedIn
            
            // 只有确认登录状态后才获取用户信息并关闭模态框
            if (result.isLoggedIn) {
                try {
                    await fetchUserInfo();
                    console.log('注册后获取用户信息成功:', user.value);
                } catch (err) {
                    console.error('注册后获取用户信息失败:', err)
                }
                
                showLoginModal.value = false
                
                // 如果有原始路由，注册成功后导航回去
                if (originalRoute.value && originalRoute.value !== '/public') {
                    router.push(originalRoute.value)
                    originalRoute.value = null
                } else {
                    router.push('/')
                }
            }
        } catch (err: any) {
            error.value = err.message || '注册失败，请重试'
            console.error('注册失败:', err)
        } finally {
            loading.value = false
        }
    }

    // 注销方法
    async function logout() {
        loading.value = true
        
        try {
            // 调用注销API
            await authApi.logout()
        } catch (err) {
            console.error('注销API调用失败:', err)
            // 继续注销本地状态，即使API调用失败
        } finally {
            // 清除状态
            isLoggedIn.value = false
            token.value = null
            user.value = null
            loading.value = false
            
            // 注销后跳转到公共页面
            router.push('/public')
        }
    }

    // 显示登录模态窗
    function openLoginModal() {
        showLoginModal.value = true
    }

    // 关闭登录模态窗
    function closeLoginModal() {
        showLoginModal.value = false
    }

    return {
        isLoggedIn,
        showLoginModal,
        originalRoute,
        user,
        loading,
        error,
        canRegister,
        token,
        init,
        checkCanRegister,
        login,
        register,
        logout,
        openLoginModal,
        closeLoginModal,
        setOriginalRoute,
        setLoggedIn,
        fetchUserInfo
    }
}) 