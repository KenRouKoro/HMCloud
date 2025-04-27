<script lang="ts" setup>
import {h, ref, computed, onMounted, watch} from 'vue'
import {NButton, NIcon, NLayoutSider, NMenu} from 'naive-ui'
import {useRouter, useRoute} from 'vue-router'
import {Home32Filled, Person32Filled, Organization32Filled, Settings32Filled, People32Filled, DeviceMeetingRoom32Filled, Image24Filled} from '@vicons/fluent'
import {useAuthStore} from '../stores/authStore'
import {useThemeStore} from '../stores/themeStore'
import {storeToRefs} from 'pinia'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const authStore = useAuthStore()
const themeStore = useThemeStore()
const {user} = storeToRefs(authStore)
const {isLight} = storeToRefs(themeStore)

// 初始菜单选中的值
const activeKey = ref(route.name as string)

// 检查用户是否有组织ID
const hasOrganization = computed(() => {
  return user.value && user.value.organizationID && user.value.organizationID !== 'null'
})

// 检查用户是否有超级管理员权限
const isSuperAdmin = computed(() => {
  return user.value && user.value.permission === 4
})

// 检查是否是移动设备
const isMobile = ref(window.innerWidth <= 768)

// 基本菜单项
const baseMenuOptions = [
  {
    label: '首页',
    key: 'index',
    icon: renderIcon(Home32Filled)
  },
  {
    label: '个人信息',
    key: 'profile',
    icon: renderIcon(Person32Filled)
  }
]

// 组织菜单项
const organizationMenuItem = {
  label: '我的组织',
  key: 'organization',
  icon: renderIcon(Organization32Filled)
}

// 组织管理菜单项
const organizationManagementMenuItem = {
  label: '组织管理',
  key: 'organization-management',
  icon: renderIcon(Settings32Filled)
}

// 用户管理菜单项
const userManagementMenuItem = {
  label: '用户管理',
  key: 'user-management',
  icon: renderIcon(People32Filled)
}

// 设备管理菜单项
const deviceManagementMenuItem = {
  label: '设备管理',
  key: 'devices',
  icon: renderIcon(DeviceMeetingRoom32Filled)
}

// 图像管理菜单项
const imageManagementMenuItem = {
  label: '图像管理',
  key: 'image-management',
  icon: renderIcon(Image24Filled)
}

// 菜单项数据，根据用户是否有组织ID和管理员权限动态生成
const menuOptions = computed(() => {
  const options = [...baseMenuOptions]
  
  // 如果用户有组织ID，添加组织菜单项和设备管理菜单项
  if (hasOrganization.value) {
    options.push(organizationMenuItem)
    options.push(deviceManagementMenuItem)
  }
  
  // 如果用户是超级管理员，添加管理菜单项
  if (isSuperAdmin.value) {
    options.push(organizationManagementMenuItem)
    options.push(userManagementMenuItem)
    options.push(imageManagementMenuItem)
  }
  
  return options
})

// 渲染图标的辅助函数
function renderIcon(icon: any) {
  return () => h(NIcon, null, {default: () => h(icon)})
}

// 切换侧边栏
function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

// 处理菜单项点击
function handleMenuClick(key: string) {
  router.push({name: key})
  // 在移动设备上点击菜单项后自动折叠侧边栏
  if (isMobile.value) {
    collapsed.value = true
  }
}

// 监听路由变化，更新菜单选中项
watch(() => route.name, (newName) => {
  if (newName) {
    activeKey.value = newName as string
  }
}, { immediate: true })

// 监听窗口大小变化
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
  // 在移动设备上默认折叠侧边栏
  if (isMobile.value) {
    collapsed.value = true
  }
}

// 组件挂载时初始化
onMounted(() => {
  // 初始化窗口大小检测
  handleResize()
  
  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)
  
  // 路由初始化时设置选中状态
  if (route.name) {
    activeKey.value = route.name as string
  }
})
</script>

<template>
  <div :class="{'sidebar-mask': !collapsed && isMobile}" @click="collapsed = true"></div>
  <NLayoutSider
      :collapsed="collapsed"
      :collapsed-width="isMobile ? 0 : 64"
      :width="240"
      bordered
      collapse-mode="width"
      show-trigger
      :show-trigger-on-mobile="false"
      @collapse="collapsed = true"
      @expand="collapsed = false"
      :style="{ 
        zIndex: isMobile ? 1000 : 1,
        position: isMobile ? 'fixed' : 'relative',
        height: isMobile ? '100%' : 'auto'
      }"
  >
    <NMenu
        :collapsed="collapsed"
        :collapsed-icon-size="22"
        :collapsed-width="isMobile ? 0 : 64"
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleMenuClick"
    />

    <div class="mobile-trigger" v-if="isMobile" @click="toggleCollapsed">
      <NButton circle :type="isLight ? 'primary' : 'default'">
        <template #icon>
          <div class="menu-trigger-icon" :class="{'open': !collapsed}"></div>
        </template>
      </NButton>
    </div>
  </NLayoutSider>
</template>

<style scoped>
.sider-toggle {
  position: absolute;
  bottom: 12px;
  right: 12px;
}

.mobile-trigger {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1001;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 50%;
}

.menu-trigger-icon {
  position: relative;
  width: 20px;
  height: 2px;
}

.menu-trigger-icon::before,
.menu-trigger-icon::after {
  content: "";
  position: absolute;
  left: 0;
  width: 20px;
  height: 2px;
  background-color: currentColor;
  transition: transform 0.3s ease;
}

.menu-trigger-icon::before {
  transform: translateY(-6px);
}

.menu-trigger-icon::after {
  transform: translateY(6px);
}

.menu-trigger-icon.open::before {
  transform: rotate(45deg);
}

.menu-trigger-icon.open::after {
  transform: rotate(-45deg);
}

.sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}
</style> 