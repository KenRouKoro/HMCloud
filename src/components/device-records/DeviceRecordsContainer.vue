<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { NCard, NTabs, NTabPane, NEmpty, NSpin } from 'naive-ui';
import { deviceApi } from '../../api';
import type { DeviceEntity, DeviceDescriptionField } from '../../api/types';
import RecordAnalyzer from './RecordAnalyzer.vue';
import OperateRecords from './OperateRecords.vue';

const props = defineProps<{
  deviceId: string;
}>();

// 数据加载状态
const loadingDevice = ref(false);
const deviceInfo = ref<DeviceEntity | null>(null);

// 设备描述解析
const deviceDetailInfo = computed(() => {
  if (!deviceInfo.value?.description) return [];
  
  try {
    return JSON.parse(deviceInfo.value.description) as DeviceDescriptionField[];
  } catch (e) {
    console.error('解析设备描述JSON失败:', e);
    return [];
  }
});

// 加载设备信息
async function loadDeviceInfo() {
  if (!props.deviceId) return;
  
  loadingDevice.value = true;
  
  try {
    deviceInfo.value = await deviceApi.getDeviceById(props.deviceId);
  } catch (error) {
    console.error('加载设备信息失败:', error);
  } finally {
    loadingDevice.value = false;
  }
}

// 初始化
onMounted(() => {
  loadDeviceInfo();
});
</script>

<template>
  <div class="device-records-container">
    <NSpin :show="loadingDevice">
      <div v-if="deviceInfo">
        <NTabs type="line" animated>
          <NTabPane name="data" tab="设备数据">
            <RecordAnalyzer 
              :device-id="deviceId"
              :device-desc="deviceDetailInfo"
              :refresh-interval="5000"
            />
          </NTabPane>
          <NTabPane name="operation" tab="操作记录">
            <OperateRecords :device-id="deviceId" />
          </NTabPane>
        </NTabs>
      </div>
      
      <div v-else-if="!loadingDevice" class="empty-data">
        <NEmpty description="无法加载设备信息" />
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.device-records-container {
  width: 100%;
}
.empty-data {
  padding: 32px 0;
  text-align: center;
}
</style> 