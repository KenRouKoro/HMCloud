<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/authStore';
import { 
  NCard, 
  NSpace, 
  NDivider,
  NText,
  useMessage,
  NEmpty,
  NSpin,
  NButton
} from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { organizationApi } from '../api';
import type { OrganizationEntity } from '../api/types';

const message = useMessage();
const router = useRouter();
const authStore = useAuthStore();
const { user, loading } = storeToRefs(authStore);
const loadingOrganization = ref(false);
const organizationData = ref<OrganizationEntity | null>(null);

// 组织ID
const organizationId = computed(() => {
  if (!user.value || !user.value.organizationID || user.value.organizationID === 'null') {
    return null;
  }
  return user.value.organizationID;
});

// 检查用户是否有组织
onMounted(async () => {
  if (!user.value) {
    try {
      await authStore.fetchUserInfo();
    } catch (error) {
      message.error('获取用户信息失败');
    }
  }

  // 如果没有组织ID，重定向到首页
  if (!organizationId.value) {
    message.warning('您没有所属组织，无法访问此页面');
    router.push('/');
    return;
  }
  
  // 加载组织信息
  await loadOrganizationInfo();
});

// 加载组织信息
async function loadOrganizationInfo() {
  loadingOrganization.value = true;
  
  try {
    // 使用API获取当前用户的组织信息
    organizationData.value = await organizationApi.getThisOrganization();
  } catch (error) {
    message.error('加载组织信息失败');
    console.error('加载组织信息失败:', error);
  } finally {
    loadingOrganization.value = false;
  }
}

// 刷新组织信息
async function refreshOrganizationInfo() {
  await loadOrganizationInfo();
  message.success('刷新成功');
}
</script>

<template>
  <div class="organization-container">
    <NSpace vertical size="large">
      <NCard title="组织信息" :bordered="true" size="large">
        <template #header-extra>
          <NButton 
            type="primary" 
            secondary
            @click="refreshOrganizationInfo"
            :loading="loadingOrganization"
          >
            刷新信息
          </NButton>
        </template>
        
        <div v-if="!organizationId" class="no-organization">
          <NEmpty description="您没有所属组织">
            <template #extra>
              <NButton @click="() => router.push('/')">返回主页</NButton>
            </template>
          </NEmpty>
        </div>
        
        <NSpin v-else-if="loadingOrganization" class="loading-spin">
          <template #description>
            正在加载组织信息...
          </template>
        </NSpin>
        
        <div v-else-if="organizationData" class="organization-content">
          <!-- 组织头部 -->
          <div class="organization-header">
            <div class="organization-title">
              <h2>{{ organizationData.name }}</h2>
              <NText depth="3">ID: {{ organizationData.id }}</NText>
            </div>
          </div>
          
          <NDivider />
          
          <!-- 组织详情 -->
          <div class="organization-details">
            <div class="detail-section">
              <h3>组织概览</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <div class="detail-label">组织名称</div>
                  <div class="detail-value">{{ organizationData.name }}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">电话</div>
                  <div class="detail-value">{{ organizationData.phone || '未设置' }}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">邮箱</div>
                  <div class="detail-value">{{ organizationData.email || '未设置' }}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">地址</div>
                  <div class="detail-value">{{ organizationData.address || '未设置' }}</div>
                </div>
                
                <div class="detail-item wide">
                  <div class="detail-label">组织描述</div>
                  <div class="detail-value">{{ organizationData.description || '无描述信息' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </NCard>
    </NSpace>
  </div>
</template>

<style scoped>
.organization-container {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.organization-content {
  width: 100%;
}

.organization-header {
  margin-bottom: 24px;
}

.organization-title {
  display: flex;
  flex-direction: column;
}

.organization-title h2 {
  margin: 0;
  font-size: 24px;
}

.detail-section {
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 16px 24px;
  margin-bottom: 24px;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--primary-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.detail-item {
  padding: 8px 0;
}

.detail-item.wide {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 14px;
  margin-bottom: 8px;
}

.detail-value {
  font-size: 16px;
}

.no-organization {
  padding: 40px 0;
  text-align: center;
}

.loading-spin {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
</style> 