<script lang="ts" setup>
import {NAvatar, NButton, NDropdown, NH1, NLayoutHeader, NSpace, NSwitch, NText  } from 'naive-ui'
import {useTitleStore} from '../stores/titleStore'
import {useAuthStore} from '../stores/authStore'
import {useThemeStore} from '../stores/themeStore'
import {storeToRefs} from 'pinia'
import {computed, ref, watch, onMounted} from 'vue'
import {Bulb, BulbOff} from '@vicons/tabler'
import {h} from 'vue'
import {useRouter} from 'vue-router'
import {imageApi} from '../api'
import {getApiUrl} from '../config'


// 获取路由器
const router = useRouter()

// 获取标题存储
const titleStore = useTitleStore()
const {title} = storeToRefs(titleStore)

// 获取身份验证存储
const authStore = useAuthStore()
const {isLoggedIn, user} = storeToRefs(authStore)

// 获取主题存储
const themeStore = useThemeStore()
const {isLight} = storeToRefs(themeStore)

// 头像URL相关
const avatarUrl = ref('')
const avatarUrlFallbackIndex = ref(0)
const maxFallbackAttempts = 3

// 计算用户显示名
const userDisplayName = computed(() => {
  return user.value?.username || '用户'
})

// 用户菜单选项
const userOptions = [
  {
    label: '个人资料',
    key: 'profile'
  },
  {
    label: '注销',
    key: 'logout'
  }
]

// 处理用户菜单选择
function handleSelect(key: string) {
  if (key === 'logout') {
    authStore.logout()
  } else if (key === 'profile') {
    router.push('/profile')
  }
  // 其他选项的处理...
}

// 打开登录模态窗
function showLogin() {
  authStore.openLoginModal()
}

// 切换主题模式
function toggleTheme(value: boolean) {
  if (!value) {
    themeStore.setDarkTheme()
  } else {
    themeStore.setLightTheme()
  }
}

// 渲染主题图标
function renderThemeIcon() {
  if (isLight.value) {
    return h(BulbOff)
  }
  return h(Bulb)
}

// 更新头像URL
function updateAvatarUrl() {
  if (user.value?.avatar) {
    // 检查头像ID是否有效
    if (user.value.avatar === 'null' || user.value.avatar === 'undefined') {
      avatarUrl.value = '';
      return;
    }
    
    // 重置备选方案索引
    avatarUrlFallbackIndex.value = 0;
    
    // 使用主要URL格式
    const url = imageApi.getImageUrl(user.value.avatar);
    avatarUrl.value = url;
    
    // 测试图片加载，以便在失败时自动切换URL格式
    testImageRequest(url);
  } else {
    avatarUrl.value = '';
  }
}

// 测试图片网络请求
function testImageRequest(url: string) {
  if (!url) return;
  
  // 创建一个测试图片元素
  const img = new Image();
  
  img.onerror = () => {
    // 尝试不同的URL格式
    tryNextAvatarUrlFormat();
  };
  
  // 添加时间戳防止缓存
  img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
}

// 尝试头像URL的备选方案
function tryNextAvatarUrlFormat() {
  if (!user.value?.avatar) return;
  
  avatarUrlFallbackIndex.value++;
  
  if (avatarUrlFallbackIndex.value > maxFallbackAttempts) {
    avatarUrl.value = '';
    return;
  }
  
  const id = user.value.avatar;
  // 根据日志，按照正确的URL优先级排序
  const formats = [
    `${getApiUrl()}/image/get?id=${id}`, // 这是正确的格式，放在第一位
    `${getApiUrl()}/image?id=${id}`,
    `${getApiUrl()}/image/${id}`,
    `/api/image/get?id=${id}`,
    `/api/image?id=${id}`
  ];
  
  const formatIndex = avatarUrlFallbackIndex.value - 1;
  if (formatIndex < formats.length) {
    const newUrl = formats[formatIndex];
    avatarUrl.value = newUrl;
    
    // 测试新的URL
    testImageRequest(newUrl);
  } else {
    avatarUrl.value = '';
  }
}

// 在组件挂载时更新头像URL
onMounted(() => {
  updateAvatarUrl();
});

// 监听用户信息变化，自动更新头像URL
watch(() => user.value?.avatar, (newAvatar, oldAvatar) => {
  if (newAvatar !== oldAvatar) {
    updateAvatarUrl();
  }
}, { immediate: true });
</script>

<template>
  <NLayoutHeader bordered class="header">
    <div class="header-content">
      <NSpace size="small">
        <n-avatar
            :size="48"
            src="/hm1.png"
            color="rgba(0,0,0,0)"
        />
        <NH1 style="margin: 0">昊明云  </NH1>
      </NSpace>

      <div class="user-area">
        <!-- 主题切换开关 -->
        <div class="theme-switch">
          <NSwitch 
            v-model:value="isLight"
            @update:value="toggleTheme"
            class="theme-toggle"
          >
            <template #checked-icon>
              <Bulb />
            </template>
            <template #unchecked-icon>
              <BulbOff />
            </template>
          </NSwitch>
        </div>
        
        <template v-if="isLoggedIn">
          <NDropdown :options="userOptions" @select="handleSelect">
            <div class="user-info">
              <NText v-if="user">{{ userDisplayName }}</NText>
              <template v-if="avatarUrl">
                <NAvatar 
                  round 
                  size="medium" 
                  :src="avatarUrl"
                >
                </NAvatar>
              </template>
              <template v-else>
                <NAvatar 
                  round 
                  size="medium"
                >
                  {{ userDisplayName.charAt(0) }}
                </NAvatar>
              </template>
            </div>
          </NDropdown>
        </template>
        <template v-else>
          <NButton type="primary" @click="showLogin">登录</NButton>
        </template>
      </div>
    </div>
  </NLayoutHeader>
</template>

<style scoped>
.header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-switch {
  display: flex;
  align-items: center;
}

.theme-toggle {
  margin-right: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
</style> 