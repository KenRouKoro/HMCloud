// 导入router所需的方法
import {createRouter, createWebHistory} from 'vue-router'
import {useAuthStore} from '../stores/authStore'
import { useMessage } from 'naive-ui'

// 导入路由页面的配置
import routes from './routes'

// 路由参数配置
const router = createRouter({
    // 使用hash(createWebHashHistory)模式，(createWebHistory是HTML5历史模式，支持SEO)
    history: createWebHistory(),
    routes: routes,
})

// 认证状态初始化标志
let authInitialized = false;

// 全局前置守卫，这里可以加入用户登录判断
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    
    // 如果authStore尚未初始化，等待初始化完成
    if (!authInitialized) {
        try {
            await authStore.init();
            authInitialized = true;
        } catch (error) {
            console.error('认证状态初始化失败', error);
            // 如果初始化失败，则视为未登录状态
            authInitialized = true;
        }
    }

    // 如果路由需要认证但用户未登录
    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
        // 记录原始访问路由
        authStore.setOriginalRoute(to.fullPath)

        // 显示登录模态窗
        authStore.openLoginModal()

        // 如果目标不是公共页面，则强制导航到公共页面
        if (to.path !== '/public') {
            next({path: '/public'})
            return
        }
    }
    
    // 检查是否需要组织ID
    if (to.meta.requiresOrganization && authStore.isLoggedIn) {
        const user = authStore.user;
        if (!user || !user.organizationID || user.organizationID === 'null') {
            // 用户没有组织ID，重定向到首页
            console.log('用户没有组织ID，无法访问该页面');
            next({ path: '/' });
            return;
        }
    }
    
    // 检查是否需要管理员权限
    if (to.meta.requiresAdmin && authStore.isLoggedIn) {
        const user = authStore.user;
        if (!user || user.permission !== 4) {
            // 用户没有管理员权限，重定向到首页
            console.log('用户没有管理员权限，无法访问该页面');
            next({ path: '/' });
            return;
        }
    }

    // 继续前进
    next()
})

// 全局后置钩子，这里可以加入改变页面标题等操作
router.afterEach((to, from) => {
    const _title = to.meta.title
    if (_title) {
        window.document.title = _title.toString();
    }
})

// 导出默认值
export default router
