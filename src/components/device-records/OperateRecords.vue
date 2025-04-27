<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { formatTimestamp, parseRecordData, getAllFieldNames } from './utils';
import type { DeviceOperateEntity } from '../../api/types';
import { 
  NTable, 
  NText, 
  NCard, 
  NPagination, 
  NSpin, 
  NEmpty, 
  NSpace, 
  NButton,
  NButtonGroup
} from 'naive-ui';
import { deviceApi } from '../../api';

const props = defineProps<{
  deviceId: string;
}>();

// 状态变量
const loading = ref(false);
const operateRecords = ref<DeviceOperateEntity[]>([]);
const currentPage = ref(0);
const pageSize = ref(10);
const totalCount = ref(0);
const hasMore = ref(true);

// 计算数据表格
const tableData = computed<Array<{ time: number; formattedTime: string; [key: string]: any }>>(() => {
  if (!operateRecords.value || operateRecords.value.length === 0) {
    return [];
  }
  
  return operateRecords.value.map(record => {
    const data = parseRecordData(record.data);
    
    return {
      time: record.time,
      formattedTime: formatTimestamp(record.time),
      ...data
    } as { time: number; formattedTime: string; [key: string]: any };
  });
});

// 获取数据字段名
const dataFields = computed(() => {
  return getAllFieldNames(operateRecords.value);
});

// 加载数据
async function loadData(page = 0) {
  if (loading.value) return;
  
  loading.value = true;
  
  try {
    const records = await deviceApi.getDeviceOperateRecords(props.deviceId, page, pageSize.value);
    
    // 更新记录数据
    operateRecords.value = records;
    
    // 更新分页状态
    currentPage.value = page;
    hasMore.value = records.length === pageSize.value;
    
    // 如果是第一页且获取到的记录数量少于页大小，则更新总数
    if (page === 0 && records.length < pageSize.value) {
      totalCount.value = records.length;
    } else if (page === 0) {
      // 如果是第一页且满页，则至少有pageSize * 2的记录
      totalCount.value = pageSize.value * 2;
    } else {
      // 如果不是第一页，更新总数估算
      totalCount.value = Math.max(
        totalCount.value,
        (page + 1) * pageSize.value + (hasMore.value ? pageSize.value : 0)
      );
    }
  } catch (error) {
    console.error('加载设备操作记录失败:', error);
  } finally {
    loading.value = false;
  }
}

// 切换页码
function handlePageChange(page: number) {
  loadData(page);
}

// 刷新数据
function refresh() {
  loadData(currentPage.value);
}

// 初始化
onMounted(() => {
  loadData(0);
});
</script>

<template>
  <NCard title="设备操作记录" class="device-operate-card">
    <template #header-extra>
      <NButtonGroup>
        <NButton @click="refresh" :loading="loading" size="small">
          刷新
        </NButton>
      </NButtonGroup>
    </template>
    
    <NSpin :show="loading">
      <div v-if="tableData.length === 0" class="empty-data">
        <NEmpty description="暂无操作记录" />
      </div>
      
      <template v-else>
        <NTable striped :bordered="false">
          <thead>
            <tr>
              <th>时间</th>
              <th v-for="field in dataFields" :key="field">{{ field }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in tableData" :key="index">
              <td>{{ item.formattedTime }}</td>
              <td v-for="field in dataFields" :key="field">
                {{ item[field] !== undefined ? item[field] : '-' }}
              </td>
            </tr>
          </tbody>
        </NTable>
        
        <div class="pagination-container">
          <NPagination
            v-model:page="currentPage"
            :page-size="pageSize"
            :item-count="totalCount"
            :on-update:page="handlePageChange"
            show-size-picker
            :page-sizes="[10, 20, 50, 100]"
            @update:page-size="size => { pageSize = size; loadData(0); }"
          />
        </div>
      </template>
    </NSpin>
  </NCard>
</template>

<style scoped>
.device-operate-card {
  margin-bottom: 24px;
}
.empty-data {
  padding: 40px 0;
  text-align: center;
}
.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style> 