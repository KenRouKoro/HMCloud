<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { parseRecordData, getAllFieldNames, getFieldType, getFieldDisplayName } from './utils';
import type { BaseDeviceRecordEntity, DeviceDescriptionField } from '../../api/types';
import { 
  NCard, 
  NTabs, 
  NTabPane, 
  NEmpty, 
  NSpin, 
  NSpace, 
  NButton,
  NButtonGroup,
  NRadioGroup,
  NRadio,
  NText
} from 'naive-ui';
import { deviceApi } from '../../api';
import NumberChart from './NumberChart.vue';
import BoolChart from './BoolChart.vue';
import ButtonStatus from './ButtonStatus.vue';
import StringTable from './StringTable.vue';
import { onUnmounted } from 'vue';

const props = defineProps<{
  deviceId: string;
  deviceDesc: DeviceDescriptionField[];
  refreshInterval?: number; // 自动刷新间隔，单位为毫秒
}>();

// 状态变量
const loading = ref(false);
const recordType = ref<'sec' | 'normal'>('sec'); // 默认显示秒级数据
const recordSize = ref(100); // 默认获取100条记录
const secRecords = ref<BaseDeviceRecordEntity[]>([]);
const normalRecords = ref<BaseDeviceRecordEntity[]>([]);

// 计算有效的设备描述字段
const validFields = computed(() => {
  if (!props.deviceDesc || props.deviceDesc.length === 0) return [];
  
  // 过滤出有效的字段名称
  return props.deviceDesc.filter(field => field.name && field.type);
});

// 计算所有字段名称
const allFieldNames = computed(() => {
  // 当前记录类型的所有记录
  const records = recordType.value === 'sec' ? secRecords.value : normalRecords.value;
  
  // 获取记录中的所有字段名称
  const dataFields = getAllFieldNames(records);
  
  // 返回带有类型和显示名称的字段信息
  return dataFields.map(fieldName => {
    const fieldType = getFieldType(fieldName, props.deviceDesc);
    const displayName = getFieldDisplayName(fieldName, props.deviceDesc);
    return { name: fieldName, type: fieldType, displayName };
  });
});

// 获取按类型分组的字段
const fieldsByType = computed(() => {
  const fields = {
    number: allFieldNames.value.filter(field => field.type === 'number'),
    bool: allFieldNames.value.filter(field => field.type === 'bool'),
    button: allFieldNames.value.filter(field => field.type === 'button'),
    string: allFieldNames.value.filter(field => field.type === 'string')
  };
  
  return fields;
});

// 当前要显示的记录
const currentRecords = computed(() => {
  return recordType.value === 'sec' ? secRecords.value : normalRecords.value;
});

// 加载数据
async function loadData() {
  if (loading.value) return;
  
  loading.value = true;
  
  try {
    // 加载数据
    if (recordType.value === 'sec') {
      secRecords.value = await deviceApi.getDeviceSecRecords(props.deviceId, 0, recordSize.value);
    } else {
      normalRecords.value = await deviceApi.getDeviceRecords(props.deviceId, 0, recordSize.value);
    }
  } catch (error) {
    console.error(`加载${recordType.value === 'sec' ? '秒级' : ''}设备记录失败:`, error);
  } finally {
    loading.value = false;
  }
}

// 刷新数据
function refresh() {
  loadData();
}

// 切换记录类型
function handleRecordTypeChange(type: 'sec' | 'normal') {
  recordType.value = type;
  // 如果对应类型的记录为空，则加载数据
  if ((type === 'sec' && secRecords.value.length === 0) ||
      (type === 'normal' && normalRecords.value.length === 0)) {
    loadData();
  }
}

// 切换记录大小
function handleRecordSizeChange(size: number) {
  recordSize.value = size;
  loadData();
}

// 自动刷新定时器
let refreshTimer: number | null = null;

// 设置自动刷新
function setupAutoRefresh() {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
  }
  
  if (props.refreshInterval && props.refreshInterval > 0) {
    refreshTimer = window.setInterval(() => {
      if (!loading.value) {
        loadData();
      }
    }, props.refreshInterval);
  }
}

// 监听刷新间隔变化
watch(() => props.refreshInterval, () => {
  setupAutoRefresh();
});

// 初始化
onMounted(() => {
  loadData();
  setupAutoRefresh();
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});
</script>

<template>
  <div class="device-record-analyzer">
    <NCard class="record-control-card">
      <NSpace justify="space-between">
        <NRadioGroup v-model:value="recordType" @update:value="handleRecordTypeChange">
          <NRadio key="sec" value="sec">实时设备记录</NRadio>
          <NRadio key="normal" value="normal">历史设备记录</NRadio>
        </NRadioGroup>
        
        <NSpace>
          <NRadioGroup v-model:value="recordSize" @update:value="handleRecordSizeChange">
            <NRadio :key="20" :value="20">20条</NRadio>
            <NRadio :key="50" :value="50">50条</NRadio>
            <NRadio :key="100" :value="100">100条</NRadio>
            <NRadio :key="200" :value="200">200条</NRadio>
            <NRadio :key="500" :value="500">500条</NRadio>
          </NRadioGroup>
          
          <NButton @click="refresh" :loading="loading">刷新</NButton>
        </NSpace>
      </NSpace>
    </NCard>
    
    <NSpin :show="loading">
      <NSpace vertical>
        <div v-if="currentRecords.length === 0" class="empty-data">
          <NEmpty :description="`暂无${recordType === 'sec' ? '秒级' : ''}设备记录`" />
        </div>
        
        <template v-else>
          <!-- 按钮类型字段 -->
          <NCard v-if="fieldsByType.button.length > 0" title="按钮状态" class="data-card">
            <div class="button-grid">
              <ButtonStatus
                v-for="field in fieldsByType.button"
                :key="field.name"
                :records="currentRecords"
                :field-name="field.name"
                :display-name="field.displayName"
                :device-desc="deviceDesc"
                :is-history-mode="recordType === 'normal'"
              />
            </div>
          </NCard>
          
          <!-- 数值类型字段 -->
          <NCard v-if="fieldsByType.number.length > 0" title="数值趋势" class="data-card">
            <NumberChart
              v-for="field in fieldsByType.number"
              :key="field.name"
              :records="currentRecords"
              :field-name="field.name"
              :display-name="field.displayName"
              :device-desc="deviceDesc"
            />
          </NCard>
          
          <!-- 布尔类型字段 -->
          <NCard v-if="fieldsByType.bool.length > 0" title="开关状态" class="data-card">
            <BoolChart
              v-for="field in fieldsByType.bool"
              :key="field.name"
              :records="currentRecords"
              :field-name="field.name"
              :display-name="field.displayName"
              :device-desc="deviceDesc"
            />
          </NCard>
          
          <!-- 字符串类型字段 -->
          <NCard v-if="fieldsByType.string.length > 0" title="文本数据" class="data-card">
            <StringTable
              v-for="field in fieldsByType.string"
              :key="field.name"
              :records="currentRecords"
              :field-name="field.name"
              :display-name="field.displayName"
              :device-desc="deviceDesc"
            />
          </NCard>
        </template>
      </NSpace>
    </NSpin>
  </div>
</template>

<style scoped>
.device-record-analyzer {
  padding: 16px 0;
}
.record-control-card {
  margin-bottom: 16px;
}
.data-card {
  margin-bottom: 16px;
}
.empty-data {
  padding: 40px 0;
  text-align: center;
}
.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
</style> 