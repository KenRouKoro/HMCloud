<script lang="ts" setup>
import { NCard, NButton, NSpace, NAvatar, NH1, NText, NBadge } from 'naive-ui'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

// 打开登录模态窗
function handleLogin() {
  authStore.openLoginModal()
}
</script>

<template>
  <div class="public-page">
    <NCard class="login-card">
      <div class="card-content">
        <div class="logo-section">
          <div class="logo-container">
            <NAvatar
              :size="80"
              src="/hm1.png"
              color="rgba(0,0,0,0)"
              class="logo"
            />
            <NH1 class="logo-text">昊明云</NH1>
          </div>
          <NBadge type="info" value="安全 · 高效 · 快速" />
        </div>

        <div class="message-section">
          <NText type="warning" class="message-title">请先登录</NText>
          <NText depth="3" class="message-description">
            您访问的页面需要登录后才能查看，请点击下方按钮登录系统
          </NText>
        </div>

        <div class="action-section">
          <NSpace vertical align="center">
            <NButton type="primary" size="large" @click="handleLogin">
              立即登录
            </NButton>
            <NText depth="3" size="small">
              如需帮助请联系业务经理
            </NText>
          </NSpace>
        </div>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.public-page {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.login-card {
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 16px;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-text {
  margin: 0;
  font-size: 28px;
}

.message-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-title {
  font-size: 24px;
  font-weight: bold;
}

.message-description {
  font-size: 16px;
  line-height: 1.6;
}

.action-section {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
</style> 