<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/authStore';
import { 
  NCard, 
  NSpace, 
  NDescriptions,
  NDescriptionsItem,
  NButton,
  NImage,
  NBadge,
  NDivider,
  NEmpty,
  useMessage,
  NSpin,
  NResult,
  NIcon,
  NGrid,
  NGridItem,
  NText,
  NTag,
  NPageHeader,
  NModal,
  NPopconfirm,
  NStatistic,
  NAvatar,
  NTooltip,
  NEllipsis,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NInput,
  NInputGroup
} from 'naive-ui';
import { computed, onMounted, ref, onUnmounted, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { deviceApi, organizationApi, imageApi } from '../api';
import type { DeviceEntity, OrganizationEntity, DeviceDescriptionField, DeviceCommand } from '../api/types';
import { ArrowLeft } from '@vicons/fa';
import DeviceRecordsContainer from '../components/device-records/DeviceRecordsContainer.vue';
import DeviceDisplayEditor from '../components/DeviceDisplayEditor.vue';
import DeviceCommandSender from '../components/DeviceCommandSender.vue';
import DeviceControlEditor from '../components/DeviceControlEditor.vue';

// 获取消息API
const message = useMessage();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

// 获取设备ID
const deviceId = route.params.id as string;

// 数据加载状态
const loadingData = ref(false);
const deviceInfo = ref<DeviceEntity | null>(null);
const currentOrganization = ref<OrganizationEntity | null>(null);

// 添加响应式断点
const screenWidth = ref(window.innerWidth);

const handleResize = () => {
  screenWidth.value = window.innerWidth;
};

const isMobile = computed(() => {
  return screenWidth.value < 768;
});

// 计算模态框宽度
const modalWidth = computed(() => {
  return isMobile.value ? '95%' : '600px';
});

// 计算表单布局
const formLabelPlacement = computed(() => {
  return isMobile.value ? 'top' : 'left';
});

// 设备自动刷新定时器
let refreshTimer: number | null = null;

// 设备详情解析
const deviceDescription = computed(() => {
  if (!deviceInfo.value?.device_description) return {};
  
  try {
    return JSON.parse(deviceInfo.value.device_description);
  } catch (e) {
    console.error('解析设备详情JSON失败:', e);
    return {};
  }
});

// 设备命令列表
const deviceCommands = computed(() => {
  if (!deviceDescription.value?.func) return [];
  
  try {
    return deviceDescription.value.func || [];
  } catch (e) {
    console.error('解析设备命令列表失败:', e);
    return [];
  }
});

// 设备描述解析
const deviceDetailInfo = computed(() => {
  if (!deviceInfo.value?.description) return [];
  
  try {
    const fields = JSON.parse(deviceInfo.value.description) as DeviceDescriptionField[];
    return fields;
  } catch (e) {
    console.error('解析设备描述JSON失败:', e);
    return [];
  }
});

// 检查用户是否有组织
const hasOrganization = computed(() => {
  return user.value && user.value.organizationID && user.value.organizationID !== 'null';
});

// 检查用户是否有管理员权限（权限等级4）
const hasAdminPermission = computed(() => {
  return user.value && user.value.permission === 4;
});

// 删除设备相关
const showDeleteConfirm = ref(false);
const deletingDevice = ref(false);

// 设备显示数据编辑相关
const showDisplayEditor = ref(false);

// 设备控制数据编辑相关
const showControlEditor = ref(false);
interface ControlDataType {
  func: DeviceCommand[];
}
const controlData = ref<ControlDataType>({ func: [] });
const savingControlData = ref(false);

// 命令参数输入状态记录
const commandParamsState = ref<Record<string, Record<string, string>>>({});

// 命令发送后刷新设备信息
const handleCommandSent = async () => {
  await loadDeviceInfo();
};

// 保存命令参数状态
const saveCommandParamsState = (params: Record<string, Record<string, string>>) => {
  // 使用深拷贝避免引用问题
  commandParamsState.value = JSON.parse(JSON.stringify(params));
};

// 加载设备信息
async function loadDeviceInfo() {
  if (!deviceId) {
    message.error('设备ID不能为空');
    router.push('/devices');
    return;
  }
  
  loadingData.value = true;
  
  try {
    const newDeviceInfo = await deviceApi.getDeviceById(deviceId);
    // 更新设备信息，但确保不会影响到用户正在输入的命令参数
    deviceInfo.value = newDeviceInfo;
  } catch (error) {
    message.error('加载设备信息失败');
    console.error('加载设备信息失败:', error);
  } finally {
    loadingData.value = false;
  }
}

// 开启设备信息自动刷新
function startAutoRefresh() {
  // 确保不会创建多个定时器
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
  }
  
  // 创建新的定时器，每2秒刷新一次
  refreshTimer = window.setInterval(async () => {
    if (!loadingData.value) {
      // 只刷新设备信息，不显示加载状态
      try {
        const newDeviceInfo = await deviceApi.getDeviceById(deviceId);
        // 更新设备信息，但保持命令参数状态不变
        deviceInfo.value = newDeviceInfo;
      } catch (error) {
        console.error('自动刷新设备信息失败:', error);
        // 如果自动刷新失败，不显示错误消息以避免频繁打扰用户
      }
    }
  }, 2000);
}

// 加载组织信息
async function loadOrganizationInfo() {
  if (!deviceInfo.value || !deviceInfo.value.organization_id) {
    return;
  }
  
  try {
    // 从设备所属组织ID获取组织信息
    const orgName = await organizationApi.getOrganizationName(deviceInfo.value.organization_id);
    // 构造一个简单的组织信息对象
    currentOrganization.value = {
      id: deviceInfo.value.organization_id,
      name: orgName,
      phone: '',
      email: '',
      address: '',
      description: '',
      deviceEntities: ''
    };
  } catch (error) {
    message.error('加载组织信息失败');
    console.error('加载组织信息失败:', error);
  }
}

// 返回设备列表
function goBack() {
  router.push('/devices');
}

// 删除设备
async function handleDeleteDevice() {
  if (!deviceId) return;
  
  deletingDevice.value = true;
  
  try {
    await deviceApi.deleteDevice(deviceId);
    message.success('设备删除成功');
    router.push('/devices');
  } catch (error) {
    message.error('删除设备失败');
    console.error('删除设备失败:', error);
  } finally {
    deletingDevice.value = false;
    showDeleteConfirm.value = false;
  }
}

// 打开删除确认对话框
function confirmDelete() {
  showDeleteConfirm.value = true;
}

// 打开设备显示数据编辑器
function openDisplayEditor() {
  showDisplayEditor.value = true;
}

// 打开设备控制数据编辑器
function openControlEditor() {
  // 初始化控制数据
  controlData.value = {
    func: deviceCommands.value as DeviceCommand[] || []
  };
  showControlEditor.value = true;
}

// 保存设备控制数据
async function saveControlData(data: ControlDataType) {
  if (!deviceId) return;
  
  savingControlData.value = true;
  
  try {
    // 确保deviceInfo已加载
    if (!deviceInfo.value) {
      message.error('设备信息未加载');
      savingControlData.value = false;
      return;
    }
    
    const updatedDeviceInfo = { ...deviceInfo.value };
    updatedDeviceInfo.device_description = JSON.stringify(data);
    
    await deviceApi.updateDevice(updatedDeviceInfo);
    
    message.success('设备控制数据保存成功');
    await loadDeviceInfo(); // 重新加载设备信息
    showControlEditor.value = false;
  } catch (error) {
    message.error('保存设备控制数据失败');
    console.error('保存设备控制数据失败:', error);
  } finally {
    savingControlData.value = false;
  }
}

// 判断设备是否有图片
const hasDeviceImage = (device: DeviceEntity) => {
  return device.image && device.image !== 'null' && device.image !== 'undefined';
};

// 获取设备图片URL
const getDeviceImageUrl = (device: DeviceEntity) => {
  return hasDeviceImage(device) 
    ? imageApi.getImageUrl(device.image) 
    : `https://placeholder.pics/svg/300x300/DEDEDE/555555/${encodeURIComponent(device.name || '未命名设备')}`;
};

// 初始化
onMounted(async () => {
  // 添加窗口大小监听
  window.addEventListener('resize', handleResize);
  
  if (!user.value) {
    try {
      await authStore.fetchUserInfo();
    } catch (error) {
      message.error('获取用户信息失败');
    }
  }
  
  // 先加载设备信息
  await loadDeviceInfo();
  
  // 然后加载设备所属的组织信息
  if (deviceInfo.value?.organization_id) {
    await loadOrganizationInfo();
  }
  
  // 启动自动刷新
  startAutoRefresh();
});

// 组件卸载时清理定时器和事件监听
onUnmounted(() => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  
  // 移除窗口大小监听
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="device-detail-container">
    <NSpace vertical size="large">
      <NPageHeader @back="goBack" title="设备详情">
        <template #subtitle>
          <NText v-if="currentOrganization">
            {{ currentOrganization.name }}
          </NText>
        </template>
        <template #extra>
          <NSpace>
            <NButton 
              v-if="hasAdminPermission" 
              type="primary" 
              @click="openDisplayEditor"
            >
              设置设备展示数据
            </NButton>
            <NButton 
              v-if="hasAdminPermission" 
              type="info" 
              @click="openControlEditor"
            >
              设置设备控制数据
            </NButton>
            <NButton v-if="hasAdminPermission" type="error" @click="confirmDelete" :loading="deletingDevice">
              删除设备
            </NButton>
          </NSpace>
        </template>
      </NPageHeader>
      
      <!-- 删除确认对话框 -->
      <NModal v-model:show="showDeleteConfirm" preset="dialog" title="确认删除" positive-text="确认" negative-text="取消" @positive-click="handleDeleteDevice" :style="{ width: isMobile ? '90%' : 'auto' }">
        <div>确定要删除此设备吗？此操作不可恢复。</div>
      </NModal>
      
      <!-- 设备显示数据编辑器 -->
      <DeviceDisplayEditor 
        :show="showDisplayEditor"
        :device-id="deviceId || ''"
        @update:show="showDisplayEditor = $event"
        @saved="loadDeviceInfo"
      />
      
      <!-- 设备控制数据编辑器 -->
      <DeviceControlEditor
        :show="showControlEditor"
        :device-id="deviceId"
        :control-data="controlData"
        :loading="savingControlData"
        :is-mobile="isMobile"
        @update:show="showControlEditor = $event"
        @save="saveControlData"
      />
      
      <div v-if="!hasOrganization && user?.permission !== 4" class="no-organization">
        <NResult 
          status="warning" 
          title="您尚未加入任何组织" 
          description="只有加入组织后才能查看设备详情"
        >
          <template #footer>
            <NButton @click="() => router.push('/organization')">
              前往组织页面
            </NButton>
          </template>
        </NResult>
      </div>
      
      <div v-else-if="loadingData">
        <NSpin size="large" />
      </div>
      
      <div v-else-if="!deviceInfo">
        <NEmpty description="设备信息不存在或已被删除" />
      </div>
      
      <div v-else>
        <NTabs type="segment">
          <!-- 设备基本信息 -->
          <NTabPane name="basic" tab="基本信息">
            <NCard title="设备信息" class="device-info-card">
              <div class="device-basic-info">
                <NGrid :cols="hasDeviceImage(deviceInfo) ? 2 : 1" :x-gap="16">
                  <NGridItem>
                    <NDescriptions :column="isMobile ? 1 : 2" size="medium" bordered>
                      <NDescriptionsItem label="设备ID">
                        <NText code>{{ deviceInfo.id }}</NText>
                      </NDescriptionsItem>
                      
                      <NDescriptionsItem label="设备名称">
                        {{ deviceInfo.name }}
                      </NDescriptionsItem>
                      
                      <NDescriptionsItem label="设备类型">
                        <NTag type="info">{{ deviceInfo.type }}</NTag>
                      </NDescriptionsItem>
                      
                      <NDescriptionsItem label="状态">
                        <div class="device-status">
                          <div class="status-indicator" :class="deviceInfo.online ? 'status-online' : 'status-offline'"></div>
                          <span>{{ deviceInfo.online ? '在线' : '离线' }}</span>
                        </div>
                      </NDescriptionsItem>
                    </NDescriptions>
                  </NGridItem>
                  
                  <NGridItem v-if="hasDeviceImage(deviceInfo)">
                    <div class="device-image">
                      <NImage 
                        :src="getDeviceImageUrl(deviceInfo)" 
                        width="200" 
                        object-fit="contain" 
                        :preview-disabled="!hasDeviceImage(deviceInfo)"
                        alt="设备图片"
                      />
                    </div>
                  </NGridItem>
                </NGrid>
              
                
                <div v-if="deviceInfo.info" class="device-description">
                  <h3>设备描述</h3>
                  <div class="description-text">{{ deviceInfo.info }}</div>
                </div>
              </div>
            </NCard>
          </NTabPane>
          
          <!-- 设备展示数据 -->
          <NTabPane name="data" tab="设备数据">
            <NCard v-if="deviceDetailInfo.length > 0" title="设备展示数据" class="device-info-card">
              <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                <NGridItem v-for="(field, index) in deviceDetailInfo" :key="index">
                  <div class="info-item">
                    <div class="info-label">{{ field.str || field.name }}</div>
                    <div class="info-value">
                      <NTag v-if="field.type === 'button'" type="success" size="medium">按钮类型</NTag>
                      <NTag v-else-if="field.type === 'number'" type="info" size="medium">数值类型</NTag>
                      <NTag v-else-if="field.type === 'bool'" type="warning" size="medium">
                        <div class="status-text">
                          布尔类型
                        </div>
                      </NTag>
                      <NTag v-else type="default" size="medium">字符串类型</NTag>
                    </div>
                  </div>
                </NGridItem>
              </NGrid>
              
              <template v-if="deviceDetailInfo.length === 0">
                <div class="empty-data">
                  <NEmpty description="暂无设备展示数据" />
                </div>
              </template>
            </NCard>
            
            <NEmpty v-else description="暂无设备展示数据" />
            
            <!-- 设备记录 -->
            <div class="mt-16">
              <DeviceRecordsContainer :device-id="deviceId" />
            </div>
          </NTabPane>
          
          <!-- 设备控制 -->
          <NTabPane name="control" tab="设备控制">
            <NCard title="设备控制" class="device-info-card">
              <div class="control-header" v-if="hasAdminPermission">
                <NButton type="primary" size="small" @click="openControlEditor">
                  设置控制命令
                </NButton>
              </div>
              
              <div v-if="deviceCommands.length === 0" class="empty-data">
                <NEmpty description="设备未配置控制命令" />
              </div>
              
              <DeviceCommandSender 
                v-else
                :device-id="deviceId"
                :device-commands="deviceCommands"
                :is-mobile="isMobile"
                @command-sent="handleCommandSent"
                @params-change="saveCommandParamsState"
                :saved-params="commandParamsState"
              />
            </NCard>
          </NTabPane>
        </NTabs>
      </div>
    </NSpace>
  </div>
</template>

<style scoped>
.device-detail-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.device-info-card {
  overflow: hidden;
}

.info-item {
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  height: 100%;
  transition: all 0.3s ease;
}

.info-item:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
}

.info-label {
  font-size: 14px;
  margin-bottom: 8px;
}

.info-value {
  font-size: 16px;
  word-break: break-all;
}

.status-text {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
}

.status-online {
  background-color: #18a058;
  box-shadow: 0 0 8px rgba(24, 160, 88, 0.5);
}

.status-offline {
  background-color: #d03050;
  box-shadow: 0 0 8px rgba(208, 48, 80, 0.5);
}

.description-text {
  line-height: 1.6;
  white-space: pre-wrap;
}

.device-description {
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin-top: 16px;
}

.no-organization, .no-device {
  padding: 40px 0;
  text-align: center;
}

.device-image {
  text-align: center;
  margin-bottom: 16px;
}

.device-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.text-center {
  text-align: center;
}

.empty-data {
  padding: 32px 0;
}

.detail-item {
  margin-bottom: 16px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.command-edit-item {
  margin-bottom: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.control-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 移动端样式 */
.mobile-modal :deep(.n-card-header) {
  padding: 16px 16px 0;
}

.mobile-modal :deep(.n-card__content),
.mobile-modal :deep(.n-card__footer) {
  padding: 16px;
}

.mobile-modal :deep(.n-form-item) {
  margin-bottom: 16px;
}

.mobile-modal :deep(.n-form-item-label) {
  padding-bottom: 8px;
}

.mobile-modal :deep(.n-button) {
  min-width: 100px;
}

.mt-16 {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .device-detail-container {
    padding: 12px;
  }
  
  .info-item {
    padding: 12px;
  }
  
  .device-description {
    padding: 12px;
  }
}
</style> 