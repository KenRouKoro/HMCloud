<script setup lang="ts">
import { computed, defineProps } from 'vue';
import { parseRecordData } from './utils';
import type { BaseDeviceRecordEntity, DeviceDescriptionField } from '../../api/types';
import { NCard, NText, NButton, NSwitch } from 'naive-ui';

const props = defineProps<{
  records: BaseDeviceRecordEntity[];
  fieldName: string;
  displayName?: string;
  deviceDesc?: DeviceDescriptionField[];
  title?: string;
  isHistoryMode?: boolean;  // 添加历史模式标志
}>();

// 获取显示名称
const displayTitle = computed(() => {
  return props.title || props.displayName || props.fieldName;
});

// 获取最新的按钮状态
const latestStatus = computed(() => {
  if (!props.records || props.records.length === 0) return false;
  
  // 按时间戳排序，获取最新的记录
  const sortedRecords = [...props.records].sort((a, b) => b.time - a.time);
  const latestRecord = sortedRecords[0];
  
  // 解析数据
  const data = parseRecordData(latestRecord.data);
  
  // 返回按钮状态，如果不存在则默认为false
  return Boolean(data[props.fieldName]);
});
</script>

<template>
  <NCard size="small" :title="displayTitle" class="button-status-card">
    <div class="button-status-container">
      <!-- 历史模式：显示开关 -->
      <NSwitch
        v-if="isHistoryMode"
        :value="latestStatus"
        disabled
        size="large"
      >
        <template #checked>开启</template>
        <template #unchecked>关闭</template>
      </NSwitch>
      
      <!-- 非历史模式：显示按钮 -->
      <NButton
        v-else
        class="status-button"
        :type="latestStatus ? 'primary' : 'default'"
        :ghost="!latestStatus"
        round
        disabled
      >
        <NText>{{ latestStatus ? '已按下' : '未按下' }}</NText>
      </NButton>
    </div>
  </NCard>
</template>

<style scoped>
.button-status-card {
  margin-bottom: 16px;
}
.button-status-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
}
.status-button {
  width: 120px;
}
</style> 