const routes = [
    {
        path: '/',
        name: 'index',
        meta: {
            title: '首页',
            requiresAuth: true // 需要登录才能访问
        },
        component: () => import('@/path/Index.vue'), //.vue不能省略
    },
    {
        path: '/public',
        name: 'public',
        meta: {
            title: '登录',
            requiresAuth: false // 不需要登录即可访问
        },
        component: () => import('@/path/Public.vue'),
    },
    {
        path: '/profile',
        name: 'profile',
        meta: {
            title: '个人资料',
            requiresAuth: true // 需要登录才能访问
        },
        component: () => import('@/path/Profile.vue'),
    },
    {
        path: '/organization',
        name: 'organization',
        meta: {
            title: '我的组织',
            requiresAuth: true, // 需要登录才能访问
            requiresOrganization: true // 需要组织ID才能访问
        },
        component: () => import('@/path/Organization.vue'),
    },
    {
        path: '/organization-management',
        name: 'organization-management',
        meta: {
            title: '组织管理',
            requiresAuth: true, // 需要登录才能访问
            requiresAdmin: true // 需要管理员权限才能访问
        },
        component: () => import('@/path/OrganizationManagement.vue'),
    },
    {
        path: '/user-management',
        name: 'user-management',
        meta: {
            title: '用户管理',
            requiresAuth: true, // 需要登录才能访问
            requiresAdmin: true // 需要管理员权限才能访问
        },
        component: () => import('@/path/UserManagement.vue'),
    },
    {
        path: '/devices',
        name: 'devices',
        meta: {
            title: '设备管理',
            requiresAuth: true, // 需要登录才能访问
            requiresOrganization: true // 需要组织ID才能访问
        },
        component: () => import('@/path/DeviceManagement.vue'),
    },
    {
        path: '/device/:id',
        name: 'device-detail',
        meta: {
            title: '设备详情',
            requiresAuth: true, // 需要登录才能访问
            requiresOrganization: true // 需要组织ID才能访问
        },
        component: () => import('@/path/DeviceDetail.vue'),
    },
    {
        path: '/image-management',
        name: 'image-management',
        meta: {
            title: '图像管理',
            requiresAuth: true, // 需要登录才能访问
            requiresAdmin: true // 需要管理员权限才能访问
        },
        component: () => import('@/path/ImageManagement.vue'),
    }
]
export default routes
