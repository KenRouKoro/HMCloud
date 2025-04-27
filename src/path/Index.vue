<script lang="ts" setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { 
  useMessage, 
  NCard, 
  NSpin, 
  NButton, 
  NIcon, 
  NProgress, 
  NTabs, 
  NTab, 
  NEmpty, 
  NModal, 
  NTag, 
  NSpace,
  NDropdown,
  NBadge
} from 'naive-ui';
import { deviceApi, organizationApi, imageApi } from '../api';
import type { DeviceEntity, DeviceDescriptionField, OrganizationEntity } from '../api/types';
import { 
  RefreshOutline, 
  ServerOutline, 
  EyeOutline, 
  EyeOffOutline, 
  HardwareChipOutline,
  InformationCircleOutline
} from '@vicons/ionicons5';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/authStore';
import DeviceCommandSender from '../components/DeviceCommandSender.vue';

interface Device extends DeviceEntity {}

// 初始化auth store
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

// 用于解析JSON字符串的安全函数
const safeParseJson = (jsonStr: string | null | undefined) => {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON解析错误:', e);
    return null;
  }
};

const message = useMessage();
const router = useRouter();
const devices = ref<Device[]>([]);
const loading = ref(true);
const selectedDevice = ref<Device | null>(null);
const showCommandModal = ref(false);
const activeTab = ref('all');
const showDetailModal = ref(false);
const selectedDetailDevice = ref<Device | null>(null);
const autoRefreshEnabled = ref(true);
const autoRefreshInterval = ref(5); // 秒
let refreshTimer: number | null = null;

// 命令参数输入状态记录
const commandParamsState = ref<Record<string, Record<string, string>>>({});

// 保存命令参数状态
const saveCommandParamsState = (params: Record<string, Record<string, string>>) => {
  // 使用深拷贝避免引用问题
  commandParamsState.value = JSON.parse(JSON.stringify(params));
};

// 组织信息
const organizationName = ref('昊明云设备控制系统');
const loadingOrganization = ref(false);

// 检查用户是否有组织ID
const hasOrganization = computed(() => {
  return user.value && user.value.organizationID && user.value.organizationID !== 'null';
});

// 设备命令相关
const deviceCommands = computed(() => {
  if (!selectedDevice.value?.device_description) return [];
  
  try {
    const description = JSON.parse(selectedDevice.value.device_description);
    return description.func || [];
  } catch (e) {
    console.error('解析设备命令列表失败:', e);
    return [];
  }
});

// 设备描述解析
const deviceDetailInfo = computed(() => {
  if (!selectedDetailDevice.value?.description) return [];
  
  try {
    const fields = JSON.parse(selectedDetailDevice.value.description) as DeviceDescriptionField[];
    return fields;
  } catch (e) {
    console.error('解析设备描述JSON失败:', e);
    return [];
  }
});

// 设备类型
const deviceTypes = computed(() => {
  const types = new Set<string>();
  devices.value.forEach(device => {
    if (device.type) {
      types.add(device.type);
    }
  });
  return Array.from(types);
});

const filteredDevices = computed(() => {
  if (activeTab.value === 'all') {
    return devices.value;
  } else if (activeTab.value === 'online') {
    return devices.value.filter(device => device.online);
  } else if (activeTab.value === 'offline') {
    return devices.value.filter(device => !device.online);
  } else {
    return devices.value.filter(device => device.type === activeTab.value);
  }
});

const statistics = computed(() => {
  const totalDevices = devices.value.length;
  const onlineDevices = devices.value.filter(device => device.online).length;
  const offlineDevices = totalDevices - onlineDevices;
  
  return {
    total: totalDevices,
    online: onlineDevices,
    offline: offlineDevices,
    onlineRate: totalDevices ? Math.round((onlineDevices / totalDevices) * 100) : 0
  };
});

// 判断设备是否有图片
const hasDeviceImage = (device: DeviceEntity) => {
  return device.image && device.image !== 'null' && device.image !== 'undefined';
};

// 获取设备图片URL
const getDeviceImageUrl = (device: DeviceEntity) => {
  return hasDeviceImage(device) 
    ? imageApi.getImageUrl(device.image) 
    : '';
};

onMounted(async () => {
  // 初始化认证状态和用户信息
  if (!user.value) {
    await authStore.init();
  }
  
  // 加载组织信息
  if (hasOrganization.value) {
    await loadOrganizationInfo();
  }
  
  await fetchDevices();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});

const loadOrganizationInfo = async () => {
  if (!hasOrganization.value || !user.value) return;
  
  loadingOrganization.value = true;
  
  try {
    // 获取当前用户组织信息
    const orgName = await organizationApi.getOrganizationName(user.value.organizationID);
    organizationName.value = orgName ? `${orgName}` : '昊明云设备控制系统';
  } catch (error) {
    console.error('加载组织信息失败:', error);
    // 保持默认名称
  } finally {
    loadingOrganization.value = false;
  }
};

const fetchDevices = async () => {
  try {
    loading.value = true;
    devices.value = await deviceApi.getOrgDevices();
  } catch (error) {
    message.error('获取设备列表失败，请检查网络连接');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const startAutoRefresh = () => {
  stopAutoRefresh(); // 先清除可能存在的定时器
  
  if (autoRefreshEnabled.value) {
    refreshTimer = window.setInterval(() => {
      if (!showCommandModal.value && !showDetailModal.value) {
        // 刷新设备列表，但不影响当前状态
        refreshDevicesWithoutDisruption();
      }
    }, autoRefreshInterval.value * 1000);
  }
};

const stopAutoRefresh = () => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

const toggleAutoRefresh = () => {
  autoRefreshEnabled.value = !autoRefreshEnabled.value;
  if (autoRefreshEnabled.value) {
    startAutoRefresh();
    message.success(`已启用自动刷新，间隔 ${autoRefreshInterval.value} 秒`);
  } else {
    stopAutoRefresh();
    message.info('已关闭自动刷新');
  }
};

const changeRefreshInterval = (interval: number) => {
  autoRefreshInterval.value = interval;
  if (autoRefreshEnabled.value) {
    startAutoRefresh();
    message.success(`已设置自动刷新间隔为 ${interval} 秒`);
  }
};

const openCommandModal = (device: Device) => {
  selectedDevice.value = device;
  showCommandModal.value = true;
};

const openDeviceDetail = (device: Device) => {
  selectedDetailDevice.value = device;
  showDetailModal.value = true;
};

const handleCommandSent = async () => {
  // 关闭模态框
  showCommandModal.value = false;
  // 刷新设备列表
  await fetchDevices();
};

const viewDeviceDetail = (device: Device) => {
  router.push(`/device/${device.id}`);
};

const getStatusColor = (online: boolean) => {
  return online ? '#18A058' : '#d03050';
};

const refreshDevices = () => {
  fetchDevices();
  message.success('刷新成功');
};

const changeTab = (tab: string) => {
  activeTab.value = tab;
};

const getDeviceDescription = (device: Device) => {
  if (!device.device_description) return '暂无描述';
  
  try {
    const description = JSON.parse(device.device_description);
    if (typeof description === 'string') {
      return description;
    } else if (typeof description === 'object') {
      return description.description || '暂无描述';
    }
    return '暂无描述';
  } catch (e) {
    return '暂无描述';
  }
};

// 刷新设备列表但不影响当前状态
const refreshDevicesWithoutDisruption = async () => {
  try {
    const newDevices = await deviceApi.getOrgDevices();
    
    // 更新设备列表，保持选中设备的状态
    if (selectedDevice.value) {
      const selectedId = selectedDevice.value.id;
      devices.value = newDevices;
      
      // 如果选中的设备仍然存在，更新引用但保持状态
      const updatedSelectedDevice = newDevices.find(d => d.id === selectedId);
      if (updatedSelectedDevice) {
        // 保留当前选中设备的引用，只更新其属性
        Object.assign(selectedDevice.value, updatedSelectedDevice);
      }
    } else {
      devices.value = newDevices;
    }
  } catch (error) {
    console.error('自动刷新设备列表失败:', error);
  }
};
</script>

<template>
  <div class="dashboard-container">
    <NCard :title="organizationName" class="main-card">
      <template #header-extra>
        <div class="header-actions">
          <NSpace>
            <NDropdown v-if="autoRefreshEnabled" trigger="click" :options="[
              { label: '5秒', key: 5 },
              { label: '10秒', key: 10 },
              { label: '30秒', key: 30 },
              { label: '60秒', key: 60 }
            ]" @select="changeRefreshInterval">
              <NButton size="small">
                {{ autoRefreshInterval }}秒
                <n-icon style="margin-left: 4px">
                  <refresh-outline />
                </n-icon>
              </NButton>
            </NDropdown>
            <NButton size="small" @click="toggleAutoRefresh" :type="autoRefreshEnabled ? 'success' : 'default'">
              {{ autoRefreshEnabled ? '自动刷新中' : '开启自动刷新' }}
            </NButton>
            <NButton @click="refreshDevices" :loading="loading">
              <template #icon>
                <n-icon><refresh-outline /></n-icon>
              </template>
              刷新
            </NButton>
          </NSpace>
        </div>
      </template>
      
      <NSpin :show="loading">
        <!-- 设备统计信息卡片 -->
        <div class="stats-container">
          <NCard class="stat-card" size="small">
            <div class="stat-content">
              <div class="stat-icon total-icon">
                <n-icon><hardware-chip-outline /></n-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.total }}</div>
                <div class="stat-label">设备总数</div>
              </div>
            </div>
          </NCard>
          
          <NCard class="stat-card" size="small">
            <div class="stat-content">
              <div class="stat-icon online-icon">
                <n-icon><eye-outline /></n-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.online }}</div>
                <div class="stat-label">在线设备</div>
              </div>
            </div>
          </NCard>
          
          <NCard class="stat-card" size="small">
            <div class="stat-content">
              <div class="stat-icon offline-icon">
                <n-icon><eye-off-outline /></n-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.offline }}</div>
                <div class="stat-label">离线设备</div>
              </div>
            </div>
          </NCard>
          
          <NCard class="stat-card" size="small">
            <div class="stat-content">
              <div class="stat-info full-width">
                <NProgress
                  type="line"
                  :percentage="statistics.onlineRate"
                  :height="15"
                  :color="statistics.onlineRate > 50 ? '#18A058' : '#d03050'"
                />
                <div class="stat-label">在线率 {{ statistics.onlineRate }}%</div>
              </div>
            </div>
          </NCard>
        </div>
        
        <!-- 设备分类导航 -->
        <div class="device-filters">
          <NTabs type="line" animated v-model:value="activeTab" @update:value="changeTab">
            <NTab name="all">全部设备</NTab>
            <NTab name="online">在线设备</NTab>
            <NTab name="offline">离线设备</NTab>
            <NTab v-for="type in deviceTypes" :key="type" :name="type">{{ type }}</NTab>
          </NTabs>
        </div>
        
        <div v-if="filteredDevices.length > 0" class="devices-grid">
          <NCard v-for="device in filteredDevices" :key="device.id" class="device-card" hoverable>
            <div class="device-header">
              <h3 class="device-name">{{ device.name }}</h3>
              <div class="status-indicator">
                <div class="status-dot" :style="{ backgroundColor: getStatusColor(device.online) }"></div>
                <NBadge 
                  :color="device.online ? 'success' : 'error'">
                  {{ device.online ? '在线' : '离线' }}
                </NBadge>
              </div>
            </div>
            
            <div class="device-image-container">
              <img 
                v-if="hasDeviceImage(device)" 
                :src="getDeviceImageUrl(device)" 
                alt="设备图片" 
                class="device-image" 
              />
              <n-icon v-else size="64" class="device-icon"><server-outline /></n-icon>
            </div>
            
            <div class="device-info">
              <div class="device-type">
                <span class="label">类型:</span> 
                <NTag size="small">{{ device.type }}</NTag>
              </div>
              <p class="device-id">ID: {{ device.id }}</p>
            </div>
            
            <div class="device-actions">
              <NButton type="info" size="small" @click="viewDeviceDetail(device)">
                <template #icon>
                  <n-icon><information-circle-outline /></n-icon>
                </template>
                详情
              </NButton>
              <NButton type="primary" size="small" @click="openCommandModal(device)" :disabled="!device.online">
                发送命令
              </NButton>
            </div>
          </NCard>
        </div>
        
        <NEmpty v-else description="暂无设备" />
      </NSpin>
    </NCard>
    
    <!-- 发送命令模态框 -->
    <NModal v-model:show="showCommandModal" preset="card" title="发送命令" style="width: 400px">
      <DeviceCommandSender 
        v-if="selectedDevice"
        :device-id="selectedDevice.id"
        :device-commands="deviceCommands"
        :device-name="selectedDevice.name"
        :as-modal="true"
        :saved-params="commandParamsState"
        @params-change="saveCommandParamsState"
        @command-sent="handleCommandSent"
        @close="showCommandModal = false"
      />
    </NModal>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
}

.total-icon {
  background-color: rgba(99, 125, 234, 0.1);
  color: #637DEA;
}

.online-icon {
  background-color: rgba(24, 160, 88, 0.1);
  color: #18A058;
}

.offline-icon {
  background-color: rgba(208, 48, 80, 0.1);
  color: #d03050;
}

.stat-info {
  flex: 1;
}

.full-width {
  width: 100%;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-top: 4px;
}

.device-filters {
  margin-bottom: 20px;
}

.devices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.device-card {
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.device-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.device-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  justify-content: space-between;
}

.device-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.device-image-container {
  height: 140px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  background-color: #f9f9f9;
  overflow: hidden;
}

.device-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.device-icon {
  color: #8899aa;
}

.device-info {
  margin-bottom: 16px;
  flex-grow: 1;
}

.device-type {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.device-type .label {
  margin-right: 4px;
}

.device-id {
  font-size: 13px;
  color: #666;
  margin: 4px 0;
  font-family: monospace;
}

.device-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
}
</style>