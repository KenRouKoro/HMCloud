<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  NModal, NCard, NTabs, NTabPane, NForm, NFormItem, 
  NInput, NButton, NSpace, NCheckbox, NAlert, NSpin 
} from 'naive-ui'
import { useAuthStore } from '../stores/authStore'
import { storeToRefs } from 'pinia'

// 获取身份验证存储
const authStore = useAuthStore()
const { showLoginModal, loading, error, canRegister } = storeToRefs(authStore)

// 当前活动的标签
const activeTab = ref('login')

// 表单数据
const loginForm = ref({
  username: '',
  password: '',
  remember: false
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  email: ''
})

// 表单错误状态
const loginError = ref('')
const registerError = ref('')

// 表单验证状态
const formValid = computed(() => {
  return !!loginForm.value.username && !!loginForm.value.password
})

// 提交登录表单
function handleLoginSubmit() {
  loginError.value = ''
  
  // 表单验证
  if (!loginForm.value.username || !loginForm.value.password) {
    loginError.value = '用户名和密码不能为空'
    return
  }
  
  // 调用登录方法，传递remember参数
  authStore.login(
    loginForm.value.username, 
    loginForm.value.password,
    loginForm.value.remember
  )
}

// 提交注册表单
function handleRegisterSubmit() {
  registerError.value = ''
  
  // 表单验证
  if (!registerForm.value.username || !registerForm.value.password) {
    registerError.value = '用户名和密码不能为空'
    return
  }
  
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    registerError.value = '两次输入的密码不一致'
    return
  }
  
  // 调用注册方法
  authStore.register({
    username: registerForm.value.username,
    password: registerForm.value.password,
    email: registerForm.value.email
  })
}

// 处理标签切换
function handleTabChange(name: string) {
  activeTab.value = name
  // 清除错误信息
  loginError.value = ''
  registerError.value = ''
}

// 组件挂载时检查是否允许注册
onMounted(async () => {
  // 检查是否允许注册，以确保显示最新状态
  await authStore.checkCanRegister()
})

// 关闭模态窗
function handleClose() {
  authStore.closeLoginModal()
}
</script>

<template>
  <NModal 
    v-model:show="showLoginModal" 
    preset="card"
    style="width: 500px"
    :mask-closable="false"
    :close-on-esc="false"
    title="欢迎使用 昊明云"
    size="huge"
  >
    <NSpin :show="loading">
      <!-- 如果允许注册，显示标签切换 -->
      <NTabs v-if="canRegister" type="line" animated v-model:value="activeTab" @update:value="handleTabChange">
        <NTabPane name="login" tab="登录">
          <NForm ref="loginFormRef" :model="loginForm">
            <NAlert v-if="loginError" type="error" :title="loginError" style="margin-bottom: 16px" />
            <NAlert v-else-if="error" type="error" :title="error" style="margin-bottom: 16px" />
            
            <NFormItem label="用户名" path="username">
              <NInput v-model:value="loginForm.username" placeholder="请输入用户名" />
            </NFormItem>
            
            <NFormItem label="密码" path="password">
              <NInput
                v-model:value="loginForm.password"
                type="password"
                placeholder="请输入密码"
                show-password-on="click"
              />
            </NFormItem>
            
            <NSpace justify="space-between">
              <NCheckbox v-model:checked="loginForm.remember">
                记住我
              </NCheckbox>
              <NButton type="primary" @click="handleLoginSubmit" :disabled="loading">
                登录
              </NButton>
            </NSpace>
          </NForm>
        </NTabPane>
        
        <NTabPane name="register" tab="注册">
          <NForm ref="registerFormRef" :model="registerForm">
            <NAlert v-if="registerError" type="error" :title="registerError" style="margin-bottom: 16px" />
            <NAlert v-else-if="error" type="error" :title="error" style="margin-bottom: 16px" />
            
            <NFormItem label="用户名" path="username">
              <NInput v-model:value="registerForm.username" placeholder="请输入用户名" />
            </NFormItem>
            
            <NFormItem label="密码" path="password">
              <NInput
                v-model:value="registerForm.password"
                type="password"
                placeholder="请输入密码"
                show-password-on="click"
              />
            </NFormItem>
            
            <NFormItem label="确认密码" path="confirmPassword">
              <NInput
                v-model:value="registerForm.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                show-password-on="click"
              />
            </NFormItem>
            
            <NFormItem label="邮箱" path="email">
              <NInput v-model:value="registerForm.email" placeholder="请输入邮箱" />
            </NFormItem>
            
            <NSpace justify="end">
              <NButton type="primary" @click="handleRegisterSubmit" :disabled="loading">
                注册
              </NButton>
            </NSpace>
          </NForm>
        </NTabPane>
      </NTabs>
      
      <!-- 不允许注册时只显示登录表单 -->
      <div v-else>
        <NForm ref="loginFormRef" :model="loginForm">
          <NAlert v-if="loginError" type="error" :title="loginError" style="margin-bottom: 16px" />
          <NAlert v-else-if="error" type="error" :title="error" style="margin-bottom: 16px" />
          
          <NFormItem label="用户名" path="username">
            <NInput v-model:value="loginForm.username" placeholder="请输入用户名" />
          </NFormItem>
          
          <NFormItem label="密码" path="password">
            <NInput
              v-model:value="loginForm.password"
              type="password"
              placeholder="请输入密码"
              show-password-on="click"
            />
          </NFormItem>
          
          <NSpace justify="space-between">
            <NCheckbox v-model:checked="loginForm.remember">
              记住我
            </NCheckbox>
            <NButton type="primary" @click="handleLoginSubmit" :disabled="loading">
              登录
            </NButton>
          </NSpace>
        </NForm>
      </div>
    </NSpin>
  </NModal>
</template> 