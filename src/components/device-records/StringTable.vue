<script setup lang="ts">
import { computed, defineProps } from 'vue';
import { formatTimestamp, parseRecordData } from './utils';
import type { BaseDeviceRecordEntity, DeviceDescriptionField } from '../../api/types';
import { NTable, NText, NDivider,NScrollbar } from 'naive-ui';

const props = defineProps<{
  records: BaseDeviceRecordEntity[];
  fieldName: string;
  displayName?: string;
  deviceDesc?: DeviceDescriptionField[];
  title?: string;
}>();

// 获取显示名称
const displayTitle = computed(() => {
  return props.title || props.displayName || props.fieldName;
});

// 提取并格式化记录数据
const tableData = computed(() => {
  if (!props.records || props.records.length === 0) return [];
  
  // 从记录中提取指定字段的数据，按时间降序排序
  return props.records
    .filter(record => {
      const data = parseRecordData(record.data);
      return props.fieldName in data;
    })
    .map(record => {
      const data = parseRecordData(record.data);
      return {
        time: record.time,
        formattedTime: formatTimestamp(record.time),
        value: String(data[props.fieldName])
      };
    })
    .sort((a, b) => b.time - a.time); // 降序排序，最新的记录在前
});
</script>

<template>
  <div class="string-table-container">
    <NDivider v-if="title">
      <NText>{{ displayTitle }}</NText>
    </NDivider>
    
    <div v-if="tableData.length === 0" class="empty-data">
      <NText>暂无数据</NText>
    </div>
    <NScrollbar v-else striped :bordered="false" style="max-height:20rem;">
      <NTable >
        <thead>
        <tr>
          <th>时间</th>
          <th>{{ displayTitle }}</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(item, index) in tableData" :key="index">
          <td>{{ item.formattedTime }}</td>
          <td>{{ item.value }}</td>
        </tr>
        </tbody>
      </NTable>
    </NScrollbar>
  </div>
</template>

<style scoped>
.string-table-container {
  width: 100%;
  margin-bottom: 24px;
}
.empty-data {
  text-align: center;
  padding: 20px 0;
  color: #909399;
}
</style> 