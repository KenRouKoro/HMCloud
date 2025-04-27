<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed, onUnmounted } from 'vue';
import { 
  NModal, 
  NForm, 
  NFormItem, 
  NInput, 
  NButton, 
  NSpace, 
  NSelect, 
  NDivider, 
  NCard, 
  NIcon, 
  NDataTable, 
  useMessage, 
  NPopconfirm
} from 'naive-ui';
import type { FormInst, SelectOption, DataTableColumns } from 'naive-ui';
import { deviceApi } from '../api';
import type { DeviceEntity, DeviceDescriptionField } from '../api/types';
import { Add24Filled, Delete24Regular, Edit24Regular } from '@vicons/fluent';
import { h } from 'vue';

// 定义组件属性
const props = defineProps<{
  show: boolean;
  deviceId: string;
}>();

// 定义事件
const emit = defineEmits(['update:show', 'saved']);

// 消息组件
const message = useMessage();

// 表单引用
const formRef = ref<FormInst | null>(null);

// 加载状态
const loading = ref(false);
const saving = ref(false);

// 设备信息
const deviceInfo = ref<DeviceEntity | null>(null);

// 设备显示字段列表
const displayFields = ref<DeviceDescriptionField[]>([]);

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
  return isMobile.value ? '95%' : '700px';
});

// 计算表单布局
const formLabelPlacement = computed(() => {
  return isMobile.value ? 'top' : 'left';
});

// 字段类型选项
const fieldTypeOptions: SelectOption[] = [
  { label: '数字', value: 'number' },
  { label: '按钮', value: 'button' },
  { label: '布尔值', value: 'bool' },
  { label: '字符串', value: 'string' }
];

// 新字段表单
const newField = reactive<DeviceDescriptionField>({
  name: '',
  type: 'string',
  str: ''
});

// 编辑模式标志
const isEditMode = ref(false);
const editingIndex = ref(-1);
const pagination = {pageSize: 5}
// 表格列定义
const columns = computed(() => {
  const cols: DataTableColumns<DeviceDescriptionField> = [
    {
      title: '字段名',
      key: 'name',
      width: isMobile.value ? 80 : 120,
    },
    {
      title: '显示名称',
      key: 'str',
      width: isMobile.value ? 100 : 150,
      render(row) {
        return row.str || '-';
      }
    },
    {
      title: '类型',
      key: 'type',
      width: isMobile.value ? 80 : 100,
      render(row) {
        const typeMap: Record<string, string> = {
          'number': '数字',
          'button': '按钮',
          'bool': '布尔值',
          'string': '字符串'
        };
        return typeMap[row.type] || row.type;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: isMobile.value ? 100 : 150,
      render(row, index) {
        return h(
          NSpace, 
          { justify: 'center' },
          {
            default: () => [
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  type: 'info',
                  onClick: () => handleEditField(row, index)
                },
                { 
                  default: () => isMobile.value ? '' : '编辑',
                  icon: () => h(NIcon, null, { default: () => h(Edit24Regular) })
                }
              ),
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  type: 'error',
                  onClick: () => handleRemoveField(index)
                },
                { 
                  default: () => isMobile.value ? '' : '删除',
                  icon: () => h(NIcon, null, { default: () => h(Delete24Regular) })
                }
              )
            ]
          }
        );
      }
    }
  ];
  
  return cols;
});

// 监听模态框显示状态
watch(() => props.show, async (newVal) => {
  if (newVal && props.deviceId) {
    await loadDeviceInfo();
    resetForm();
  }
});

// 加载设备信息
async function loadDeviceInfo() {
  loading.value = true;
  
  try {
    deviceInfo.value = await deviceApi.getDeviceById(props.deviceId);
    
    // 解析 description 字段
    try {
      if (deviceInfo.value?.description) {
        displayFields.value = JSON.parse(deviceInfo.value.description) as DeviceDescriptionField[];
        
        // 移除旧数据中可能存在的permission字段
        displayFields.value = displayFields.value.map(({ name, type, str }) => ({
          name,
          type,
          str
        }));
      } else {
        displayFields.value = [];
      }
    } catch (error) {
      console.error('解析设备显示字段失败:', error);
      displayFields.value = [];
    }
  } catch (error) {
    message.error('加载设备信息失败');
    console.error('加载设备信息失败:', error);
  } finally {
    loading.value = false;
  }
}

// 重置表单
function resetForm() {
  newField.name = '';
  newField.str = '';
  newField.type = 'string';
  isEditMode.value = false;
  editingIndex.value = -1;
}

// 添加或更新字段
function handleAddOrUpdateField() {
  if (!newField.name) {
    message.warning('字段名不能为空');
    return;
  }
  
  if (isEditMode.value && editingIndex.value >= 0) {
    // 更新模式：更新已有字段
    displayFields.value[editingIndex.value] = { ...newField };
    message.success('字段已更新');
  } else {
    // 添加模式：检查字段名是否重复
    if (displayFields.value.some(field => field.name === newField.name)) {
      message.warning('字段名已存在');
      return;
    }
    
    // 添加到字段列表
    displayFields.value.push({ ...newField });
    message.success('字段已添加');
  }
  
  // 重置表单
  resetForm();
}

// 编辑字段
function handleEditField(field: DeviceDescriptionField, index: number) {
  isEditMode.value = true;
  editingIndex.value = index;
  
  // 复制字段值到表单
  newField.name = field.name;
  newField.type = field.type;
  newField.str = field.str || '';
}

// 取消编辑
function handleCancelEdit() {
  resetForm();
}

// 移除字段
function handleRemoveField(index: number) {
  displayFields.value.splice(index, 1);
  
  // 如果正在编辑此字段，重置表单
  if (isEditMode.value && editingIndex.value === index) {
    resetForm();
  } else if (isEditMode.value && editingIndex.value > index) {
    // 如果删除的是编辑索引前面的项，需要调整索引
    editingIndex.value--;
  }
}

// 保存更改
async function handleSave() {
  if (!deviceInfo.value) return;
  
  saving.value = true;
  
  try {
    // 更新 description 字段
    deviceInfo.value.description = JSON.stringify(displayFields.value);
    
    // 发送更新请求
    await deviceApi.updateDevice(deviceInfo.value);
    
    message.success('设备显示数据保存成功');
    emit('saved');
    closeModal();
  } catch (error) {
    message.error('保存设备显示数据失败');
    console.error('保存设备显示数据失败:', error);
  } finally {
    saving.value = false;
  }
}

// 关闭模态框
function closeModal() {
  resetForm();
  emit('update:show', false);
}

// 初始清空表单
onMounted(() => {
  resetForm();
  // 添加窗口大小监听
  window.addEventListener('resize', handleResize);
});

// 组件卸载时清理事件监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <NModal 
    :show="show" 
    preset="card" 
    title="设置设备展示数据" 
    :style="{ width: modalWidth }"
    :class="{ 'mobile-modal': isMobile }"
    :segmented="{ content: true, footer: 'soft' }"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <div v-if="loading" class="loading-container">
      加载中...
    </div>
    <div v-else>
      <NCard title="当前设备字段" class="fields-card">
        <NDataTable 
          :columns="columns" 
          :data="displayFields" 
          :bordered="false"
          :single-line="false"
          :pagination="pagination"
          size="small"
        />
        
        <div v-if="displayFields.length === 0" class="empty-fields">
          暂无展示字段，请添加
        </div>
      </NCard>
      
      <NDivider />
      
      <NCard :title="isEditMode ? '编辑字段' : '添加新字段'" class="add-field-card">
        <NSpace vertical>
          <NSpace :vertical="isMobile">
            <NFormItem label="字段名" :class="{ 'form-item': !isMobile, 'mobile-form-item': isMobile }">
              <NInput v-model:value="newField.name" placeholder="输入字段名" />
            </NFormItem>
            
            <NFormItem label="类型" :class="{ 'form-item': !isMobile, 'mobile-form-item': isMobile }">
              <NSelect 
                v-model:value="newField.type" 
                :options="fieldTypeOptions" 
                :style="{ width: isMobile ? '100%' : '120px' }" 
              />
            </NFormItem>
            
            <NFormItem label="显示名称" :class="{ 'form-item': !isMobile, 'mobile-form-item': isMobile }">
              <NInput v-model:value="newField.str" placeholder="输入显示名称(可选)" />
            </NFormItem>
            
            <div :style="{ marginTop: isMobile ? '8px' : '26px' }">
              <NSpace :justify="isMobile ? 'end' : 'start'">
                <NButton 
                  type="primary" 
                  @click="handleAddOrUpdateField"
                  :disabled="!newField.name"
                  :block="isMobile"
                >
                  <template #icon>
                    <NIcon><Add24Filled /></NIcon>
                  </template>
                  {{ isEditMode ? '更新' : '添加' }}
                </NButton>
                
                <NButton v-if="isEditMode" @click="handleCancelEdit" :block="isMobile">
                  取消编辑
                </NButton>
              </NSpace>
            </div>
          </NSpace>
        </NSpace>
      </NCard>
    </div>
    
    <template #footer>
      <NSpace :justify="isMobile ? 'center' : 'end'" :wrap="isMobile" :size="isMobile ? 'large' : 'medium'">
        <NButton @click="closeModal" :block="isMobile">取消</NButton>
        <NButton 
          type="primary" 
          @click="handleSave" 
          :loading="saving"
          :disabled="loading"
          :block="isMobile"
        >
          保存
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.fields-card {
  margin-bottom: 16px;
}

.form-item {
  margin-bottom: 0;
  margin-right: 16px;
}

.mobile-form-item {
  margin-bottom: 12px;
  width: 100%;
}

.empty-fields {
  text-align: center;
  padding: 20px;
  color: #999;
}

.loading-container {
  text-align: center;
  padding: 40px;
  color: #999;
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
  margin-bottom: 12px;
}

.mobile-modal :deep(.n-form-item-label) {
  padding-bottom: 4px;
}

.mobile-modal :deep(.n-button) {
  min-width: 90px;
}

@media (max-width: 768px) {
  .fields-card {
    margin-bottom: 12px;
  }

  .empty-fields {
    padding: 12px;
  }
  
  .loading-container {
    padding: 24px;
  }
}
</style> 