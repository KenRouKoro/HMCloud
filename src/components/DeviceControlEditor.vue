<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  NSpace,
  NButton,
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NEmpty,
  NInputNumber,
  NSelect
} from 'naive-ui';
import type { DeviceCommand } from '../api/types';

interface ControlDataType {
  func: DeviceCommand[];
}

// 权限级别选项
const permissionOptions = [
  { label: '普通用户', value: 0 },
  { label: '组织管理员', value: 2 },
  { label: '系统管理员', value: 4 }
];

// 属性定义
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  deviceId: {
    type: String,
    required: true
  },
  controlData: {
    type: Object as () => ControlDataType,
    default: () => ({ func: [] })
  },
  loading: {
    type: Boolean,
    default: false
  },
  isMobile: {
    type: Boolean,
    default: false
  }
});

// 事件
const emit = defineEmits<{
  'update:show': [value: boolean];
  'save': [data: ControlDataType];
}>();

// 本地控制数据
const localControlData = ref<ControlDataType>({ func: [] });

// 初始化本地数据
function initLocalData() {
  if (props.controlData && props.controlData.func) {
    // 深拷贝控制数据，避免直接修改props
    localControlData.value = JSON.parse(JSON.stringify(props.controlData));
    
    // 确保每个命令都有权限属性
    if (localControlData.value.func) {
      localControlData.value.func.forEach(cmd => {
        if (cmd.permission === undefined) {
          cmd.permission = 0; // 默认为普通用户权限
        }
      });
    }
  } else {
    // 如果没有数据，初始化为空数组
    localControlData.value = { func: [] };
  }
}

// 监听show属性变化，当打开模态框时初始化数据
watch(() => props.show, (newVal) => {
  if (newVal) {
    initLocalData();
  }
}, { immediate: true });

// 监听controlData变化，更新本地数据（仅当模态框显示时）
watch(() => props.controlData, (newVal) => {
  if (props.show && newVal) {
    initLocalData();
  }
}, { deep: true });

// 计算模态框宽度
const modalWidth = computed(() => {
  return props.isMobile ? '95%' : '600px';
});

// 计算表单布局
const formLabelPlacement = computed(() => {
  return props.isMobile ? 'top' : 'left';
});

// 处理模态框显示状态变化
const handleUpdateShow = (visible: boolean) => {
  if (visible) {
    initLocalData();
  }
  emit('update:show', visible);
};

// 添加新命令
function addCommand() {
  if (!localControlData.value.func) {
    localControlData.value.func = [];
  }
  
  localControlData.value.func.push({
    name: '新命令',
    template: '',
    prams: [],
    permission: 0
  });
}

// 删除命令
function removeCommand(index: number) {
  localControlData.value.func.splice(index, 1);
}

// 添加命令参数
function addCommandParam(commandIndex: number) {
  const cmd = localControlData.value.func[commandIndex];
  if (!cmd.prams) {
    cmd.prams = [];
  }
  
  const paramName = `p${cmd.prams.length + 1}`;
  cmd.prams.push(paramName);
}

// 删除命令参数
function removeCommandParam(commandIndex: number, paramIndex: number) {
  const cmd = localControlData.value.func[commandIndex];
  if (cmd && cmd.prams) {
    cmd.prams.splice(paramIndex, 1);
  }
}

// 保存控制数据
function saveControlData() {
  emit('save', localControlData.value);
}
</script>

<template>
  <NModal 
    :show="show" 
    preset="card" 
    title="设置设备控制数据" 
    :style="{ width: modalWidth }" 
    :class="{ 'mobile-modal': isMobile }" 
    :bordered="false" 
    :segmented="{content: true, footer: 'soft'}"
    @update:show="handleUpdateShow"
  >
    <div>
      <NSpace vertical>
        <NButton @click="addCommand" type="primary" :block="isMobile">添加命令</NButton>
        <div class="commands-container">
          <div v-for="(command, cmdIndex) in localControlData.func" :key="cmdIndex" class="command-edit-item">
            <NCard :title="`命令 ${cmdIndex + 1}`">
              <NForm :label-placement="formLabelPlacement" label-width="auto">
                <NFormItem label="命令名称">
                  <NInput v-model:value="command.name" placeholder="输入命令名称" />
                </NFormItem>
                
                <NFormItem label="命令模板">
                  <NInput v-model:value="command.template" placeholder="输入命令模板，如: command $p1 $p2" />
                </NFormItem>
                
                <NFormItem label="权限级别">
                  <NSelect 
                    v-model:value="command.permission" 
                    :options="permissionOptions"
                    placeholder="选择需要的权限级别"
                  />
                </NFormItem>
                
                <NFormItem label="命令参数">
                  <NSpace vertical>
                    <NButton size="small" @click="addCommandParam(cmdIndex)" :block="isMobile">添加参数</NButton>
                    
                    <NSpace v-if="command.prams && command.prams.length > 0" vertical size="small">
                      <NSpace v-for="(param, paramIndex) in command.prams" :key="paramIndex" :align="isMobile ? 'start' : 'center'" :vertical="isMobile">
                        <NInput v-model:value="command.prams[paramIndex]" placeholder="参数名称" />
                        <NButton size="small" type="error" @click="removeCommandParam(cmdIndex, paramIndex)" :block="isMobile">删除</NButton>
                      </NSpace>
                    </NSpace>
                    
                    <NEmpty v-else description="暂无参数" size="small" />
                  </NSpace>
                </NFormItem>
              </NForm>
              
              <template #footer>
                <NSpace :justify="isMobile ? 'center' : 'end'">
                  <NButton type="error" @click="removeCommand(cmdIndex)" :block="isMobile">删除命令</NButton>
                </NSpace>
              </template>
            </NCard>
          </div>
        </div>
        
        <NEmpty v-if="!localControlData.func || localControlData.func.length === 0" description="暂无命令，请添加" />
      </NSpace>
    </div>
    
    <template #footer>
      <NSpace :justify="isMobile ? 'center' : 'end'" :wrap="isMobile" :size="isMobile ? 'large' : 'medium'">
        <NButton @click="emit('update:show', false)" :block="isMobile">取消</NButton>
        <NButton type="primary" @click="saveControlData" :loading="loading" :block="isMobile">保存</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.command-edit-item {
  margin-bottom: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.commands-container {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
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
</style> 