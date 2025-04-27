<script lang="ts" setup>
import {darkTheme, NConfigProvider, NGlobalStyle, NLayout, NLayoutContent, NMessageProvider, NScrollbar} from 'naive-ui'
import {watch, onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import {useTitleStore} from './stores/titleStore'
import {useAuthStore} from './stores/authStore'
import {useThemeStore} from './stores/themeStore'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Sidebar from './components/Sidebar.vue'
import LoginModal from './components/LoginModal.vue'
import themeOverrides from './tmeme/overwrite'
import {storeToRefs} from 'pinia'

// 获取路由和标题存储
const route = useRoute()
const titleStore = useTitleStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const { isLight } = storeToRefs(themeStore)

// 检查是否是移动设备
const isMobile = ref(window.innerWidth <= 768)

// 监听路由变化，更新标题
watch(
    () => route.meta.title,
    (newTitle) => {
      if (newTitle) {
        titleStore.setTitle(newTitle.toString())
      } else if (route.name) {
        // 如果没有meta.title，尝试使用路由的name
        titleStore.setTitle(route.name.toString())
      }
    },
    {immediate: true}
)

// 监听窗口大小变化
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
}

// 在组件挂载时初始化
onMounted(() => {
  // 初始化身份验证状态
  authStore.init()
  
  // 如果未登录并且当前路由需要登录，则显示登录模态窗
  if (!authStore.isLoggedIn && route.meta.requiresAuth) {
    authStore.setOriginalRoute(route.fullPath)
    authStore.openLoginModal()
  }
  
  // 初始化窗口大小检测
  handleResize()
  
  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)
})
</script>

<template>
  <NConfigProvider :theme="isLight ? null : darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <NGlobalStyle/>
      <NLayout position="absolute" style="height: 100%">
        <Header/>
        <n-layout has-sider :class="{ 'mobile-layout': isMobile }">
          <Sidebar/>
          <NLayoutContent class="content" :class="{ 'mobile-content': isMobile }">
            <div :class="['content-container', { 'mobile-container': isMobile }]">
              <NScrollbar>
                <RouterView/>
              </NScrollbar>
            </div>
          </NLayoutContent>
        </n-layout>
        <Footer/>
      </NLayout>

      <!-- 登录/注册模态窗 -->
      <LoginModal/>
    </n-message-provider>
  </NConfigProvider>
</template>

<style scoped>
.content {
  padding: 0;
  height: calc(100vh - 112px); /* 减去Header和Footer的高度 */
  overflow: hidden; /* 防止内容溢出 */
}

.content-container {
  width: 100%;
  height: 100%;
}

.mobile-layout {
  display: flex;
  flex-direction: column;
}

.mobile-content {
  width: 100%;
  margin-left: 0;
  transition: margin-left 0.3s;
}

.mobile-container {
  padding: 12px;
}

@media (max-width: 768px) {
  .content {
    height: calc(100vh - 100px); /* 针对移动端调整高度 */
  }
}
</style>
