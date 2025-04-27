<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { 
  NCard, 
  NSpace, 
  NForm, 
  NFormItem, 
  NInput, 
  NButton, 
  NEmpty,
  useMessage,
  NAlert,
  NDivider
} from 'naive-ui'
import { deviceApi } from '../api'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/authStore'
import { type DeviceCommand } from '../api/types'

const props = defineProps({
  // 设备ID
  deviceId: {
    type: String,
    required: true
  },
  // 设备命令数据
  deviceCommands: {
    type: Array as () => DeviceCommand[],
    default: () => []
  },
  // 是否使用模态框模式展示
  asModal: {
    type: Boolean,
    default: false
  },
  // 是否在移动端
  isMobile: {
    type: Boolean,
    default: false
  },
  // 是否显示模态框（仅在asModal为true时有效）
  show: {
    type: Boolean,
    default: false
  },
  // 设备名称（可选，用于自定义命令模式显示）
  deviceName: {
    type: String,
    default: ''
  },
  // 保存的命令参数状态
  savedParams: {
    type: Object as () => Record<string, Record<string, string>>,
    default: () => ({})
  }
})

const emit = defineEmits([
  'update:show',  // 更新显示状态
  'command-sent', // 命令发送成功
  'close',        // 关闭模态框
  'params-change' // 参数变化
])

const message = useMessage()
const sendingCommand = ref(false)
const commandParams = ref<Record<string, Record<string, string>>>({})
const commandInput = ref('')

// 获取用户权限信息
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

// 用户权限检查
const userPermission = computed(() => user.value?.permission || 0)

// 检查用户是否有权执行命令的基本权限（至少需要权限等级2）
const hasBasicCommandPermission = computed(() => userPermission.value >= 2)

// 检查特定命令的执行权限
const canExecuteCommand = (command: DeviceCommand) => {
  // 如果用户没有基本权限，直接返回false
  if (!hasBasicCommandPermission.value) return false
  
  // 如果命令没有指定权限要求，则只需要基本权限即可
  if (command.permission === undefined) return true
  
  // 判断用户权限是否大于等于命令所需权限
  return userPermission.value >= command.permission
}

// 表单布局
const formLabelPlacement = computed(() => {
  return props.isMobile ? 'top' : 'left'
})

// 初始化命令参数
const initCommandParams = () => {
  const commands: Record<string, Record<string, string>> = {}
  
  props.deviceCommands.forEach((cmd: DeviceCommand, index: number) => {
    if (cmd.prams && Array.isArray(cmd.prams)) {
      const params: Record<string, string> = {}
      cmd.prams.forEach((param: string) => {
        // 尝试从已保存的状态中恢复参数值
        const savedValue = props.savedParams[index]?.[param]
        params[param] = savedValue !== undefined ? savedValue : ''
      })
      commands[index] = params
    } else {
      commands[index] = {}
    }
  })
  
  commandParams.value = commands
}

// 生成预览命令
const getPreviewCommand = (commandIndex: number): string => {
  const command = props.deviceCommands[commandIndex]
  if (!command || !command.template) return ''

  let finalCommand = command.template
  
  // 替换参数
  if (command.prams && Array.isArray(command.prams)) {
    command.prams.forEach((param: string) => {
      const value = commandParams.value[commandIndex]?.[param] || ''
      finalCommand = finalCommand.replace(`$${param}`, value || '___')
    })
  }
  
  return finalCommand
}

// 发送命令到设备
const sendCommand = async (commandIndex: number) => {
  if (!props.deviceId) {
    message.warning('请选择设备')
    return
  }

  const command = props.deviceCommands[commandIndex]
  if (!command) {
    message.warning('无效的命令')
    return
  }
  
  // 检查用户是否有权限执行该命令
  if (!canExecuteCommand(command)) {
    message.error('您没有权限执行此命令')
    return
  }

  let finalCommand = command.template || ''
  
  // 替换参数
  if (command.prams && Array.isArray(command.prams)) {
    command.prams.forEach((param: string) => {
      const value = commandParams.value[commandIndex]?.[param] || ''
      finalCommand = finalCommand.replace(`$${param}`, value)
    })
  }
  
  sendingCommand.value = true
  
  try {
    await deviceApi.sendCommand(props.deviceId, finalCommand)
    message.success('命令发送成功')
    
    if (props.asModal) {
      emit('update:show', false)
      emit('close')
    }
    
    emit('command-sent')
  } catch (error) {
    message.error('命令发送失败，请稍后重试')
    console.error(error)
  } finally {
    sendingCommand.value = false
  }
}

// 直接发送简单命令
const sendSimpleCommand = async () => {
  if (!props.deviceId || !commandInput.value) {
    message.warning('请选择设备并输入命令')
    return
  }
  
  // 检查用户是否有基本的命令执行权限
  if (!hasBasicCommandPermission.value) {
    message.error('您没有权限执行命令')
    return
  }

  sendingCommand.value = true
  
  try {
    await deviceApi.sendCommand(props.deviceId, commandInput.value)
    message.success('命令发送成功')
    
    if (props.asModal) {
      emit('update:show', false)
      emit('close')
    }
    
    commandInput.value = ''
    emit('command-sent')
  } catch (error) {
    message.error('命令发送失败，请稍后重试')
    console.error(error)
  } finally {
    sendingCommand.value = false
  }
}

// 关闭模态框
const closeModal = () => {
  emit('update:show', false)
  emit('close')
}

// 手动处理输入变化
const handleParamChange = (commandIndex: number, paramName: string, value: string) => {
  if (!commandParams.value[commandIndex]) {
    commandParams.value[commandIndex] = {};
  }
  commandParams.value[commandIndex][paramName] = value;
  
  // 通知父组件参数已变化
  const paramsCopy = JSON.parse(JSON.stringify(commandParams.value));
  emit('params-change', paramsCopy);
};

// 监听设备命令变化，重新初始化参数
watch(() => props.deviceCommands, () => {
  initCommandParams();
}, { deep: true, immediate: true });

// 监听savedParams变化，更新参数
watch(() => props.savedParams, (newValue) => {
  if (Object.keys(newValue).length > 0) {
    // 仅当有保存的参数时更新，并且避免覆盖当前正在编辑的参数
    initCommandParams();
  }
}, { deep: true });
</script>

<template>
  <div class="command-sender" :class="{ 'command-sender-modal': asModal }">
    <!-- 没有设备ID时显示提示 -->
    <NEmpty v-if="!deviceId" description="请选择设备" />
    
    <!-- 没有基本命令权限时显示提示 -->
    <NEmpty v-else-if="!hasBasicCommandPermission" description="您没有权限执行命令（需要权限等级2以上）" />
    
    <template v-else>
      <!-- 如果有预定义命令，显示命令列表 -->
      <div v-if="deviceCommands && deviceCommands.length > 0" class="command-container">
        <NSpace vertical size="medium">
          <template v-for="(command, index) in deviceCommands" :key="index">
            <!-- 只有当用户有权限执行该命令时才显示 -->
            <NCard 
              v-if="canExecuteCommand(command as DeviceCommand)"
              class="command-card"
              :bordered="false"
              :segmented="{ content: true }"
              size="small"
            >
              <template #header>
                <div class="command-header">
                  <span class="command-title">{{ (command as DeviceCommand).name || `命令${index + 1}` }}</span>
                  <span v-if="(command as DeviceCommand).permission === 4" class="permission-tag">
                    (需要超级管理员权限)
                  </span>
                </div>
              </template>
              
              <div class="command-content">
                <!-- 命令模板展示区 -->
                <div v-if="(command as DeviceCommand).template" class="command-info-section">
                  <div class="command-template-section">
                    <div class="section-title">命令模板</div>
                    <NAlert type="info" class="code-block preview-block">
                      {{ (command as DeviceCommand).template }}
                    </NAlert>
                  </div>
                
                  <NDivider class="compact-divider" />
                
                  <!-- 命令预览展示区 -->
                  <div class="command-preview-section">
                    <div class="section-title">预览结果</div>
                    <NAlert type="info" class="code-block preview-block">
                      {{ getPreviewCommand(index) }}
                    </NAlert>
                  </div>
                </div>
                
                <!-- 参数填写区 -->
                <div class="command-form-section">
                  <div class="section-title" v-if="(command as DeviceCommand).prams && (command as DeviceCommand).prams!.length > 0">
                    参数设置
                  </div>
                  <NForm :label-placement="formLabelPlacement" label-width="auto" size="small">
                    <div class="params-container" v-if="(command as DeviceCommand).prams && (command as DeviceCommand).prams!.length > 0">
                      <NFormItem 
                        v-for="param in (command as DeviceCommand).prams" 
                        :key="param" 
                        :label="param"
                      >
                        <NInput 
                          :value="commandParams[index]?.[param] || ''"
                          @update:value="(v) => handleParamChange(index, param, v)"
                          placeholder="请输入参数值"
                          size="small"
                        />
                      </NFormItem>
                    </div>
                    
                    <div class="action-section">
                      <NButton 
                        type="primary" 
                        @click="sendCommand(index)"
                        :loading="sendingCommand"
                        :block="isMobile"
                        size="small"
                      >
                        发送指令
                      </NButton>
                    </div>
                  </NForm>
                </div>
              </div>
            </NCard>
          </template>
        </NSpace>
        
        <!-- 当没有可执行的命令时显示提示 -->
        <NEmpty 
          v-if="deviceCommands.every(cmd => !canExecuteCommand(cmd as DeviceCommand))" 
          description="没有您可以执行的命令"
        />
      </div>
      
      <!-- 如果没有预定义命令，显示无命令提示 -->
      <div v-else class="no-commands-container">
        <NCard :bordered="false" :segmented="{ content: true }" size="small">
          <template #header>
            <div class="command-header">
              <span class="command-title">设备控制{{ deviceName ? ' - ' + deviceName : '' }}</span>
            </div>
          </template>
          
          <div class="empty-commands">
            <NEmpty description="暂无可用命令" />
            <p class="empty-tip">该设备没有预定义的可用命令</p>
          </div>
        </NCard>
      </div>
    </template>
  </div>
</template>

<style scoped>
.command-sender {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.command-sender-modal {
  width: 100%;
}

.command-container, .simple-command-container {
  width: 100%;
}

.command-card {
  margin-bottom: 0;
  transition: all 0.2s ease-in-out;
}

.command-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.command-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.command-title {
  font-weight: 600;
  font-size: 14px;
}

.permission-tag {
  font-size: 12px;
  color: #d03050;
  background-color: rgba(208, 48, 80, 0.1);
  padding: 1px 4px;
  border-radius: 4px;
}

.command-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-info-section {
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  padding: 12px;
}

.command-template-section, .command-preview-section, .command-form-section {
  margin-bottom: 10px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.code-block {
  font-family: monospace;
  border: 1px solid rgba(155, 155, 155, 0.5);
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
  line-height: 1.4;
  padding: 8px;
}

.preview-block {
  margin: 0;
}

.compact-divider {
  margin: 8px 0;
}

.params-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.action-section {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.action-button {
  min-width: 80px;
}

.command-textarea {
  resize: vertical;
  min-height: 80px;
}

/* 适配移动端 */
@media (max-width: 768px) {
  .command-sender {
    padding: 0 8px;
  }
  
  .params-container {
    grid-template-columns: 1fr;
  }
  
  .action-section {
    flex-direction: column;
  }
  
  .action-button {
    width: 100%;
    margin-bottom: 6px;
  }
  
  .command-info-section {
    padding: 8px;
  }
  
  .section-title {
    font-size: 12px;
  }
  
  .code-block {
    padding: 6px;
    font-size: 12px;
  }
}

.no-commands-container {
  width: 100%;
}

.empty-commands {
  padding: 12px 0;
  text-align: center;
}

.empty-tip {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}
</style> 