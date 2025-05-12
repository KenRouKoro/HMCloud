<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/authStore';
import { 
  NCard, 
  NSpace, 
  NGrid,
  NGridItem,
  NButton,
  NDataTable,
  NImage,
  NModal,
  NEmpty,
  NTag,
  NBadge,
  useMessage,
  NSpin,
  NResult,
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  NSelect
} from 'naive-ui';
import type { DataTableColumns, FormInst, FormRules, SelectOption } from 'naive-ui';
import { computed, h, onMounted, ref, reactive, nextTick, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { deviceApi, organizationApi, imageApi } from '../api';
import type { DeviceEntity, OrganizationEntity } from '../api/types';
import DeviceDisplayEditor from '../components/DeviceDisplayEditor.vue';

const message = useMessage();
const router = useRouter();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

// 数据加载状态
const loadingData = ref(false);
const deviceList = ref<DeviceEntity[]>([]);
const currentOrganization = ref<OrganizationEntity | null>(null);

// 组织列表
const loadingOrganizations = ref(false);
const organizationList = ref<OrganizationEntity[]>([]);
const organizationOptions = computed<SelectOption[]>(() => {
  return organizationList.value.map(org => ({
    label: org.name || '未命名组织',
    value: org.id || ''
  }));
});

// 检查用户是否有组织
const hasOrganization = computed(() => {
  return user.value && user.value.organizationID && user.value.organizationID !== 'null';
});

// 检查用户是否有管理员权限（权限等级至少为2）
const hasAdminPermission = computed(() => {
  return user.value && user.value.permission >= 2;
});

// 检查用户是否有超级管理员权限（权限等级4）
const hasSuperAdminPermission = computed(() => {
  return user.value && user.value.permission === 4;
});

// 新增设备模态框
const showAddDeviceModal = ref(false);
const addDeviceFormRef = ref<FormInst | null>(null);
const addDeviceLoading = ref(false);
const newDevice = ref<DeviceEntity>({
  id: '',
  type: '',
  organization_id: null,
  online: false,
  name: '',
  image: '',
  info: '',
  device_description: '{}',
  description: '[]'
});

// 编辑设备模态框
const showEditDeviceModal = ref(false);
const editDeviceFormRef = ref<FormInst | null>(null);
const editDeviceLoading = ref(false);
const editDevice = ref<DeviceEntity>({
  id: '',
  type: '',
  organization_id: null,
  online: false,
  name: '',
  image: '',
  info: '',
  device_description: '{}',
  description: '[]'
});
const isEditMode = ref(false);

// 表单验证规则
const deviceFormRules: FormRules = {
  id: [
    { required: true, message: '请输入设备ID', trigger: 'blur' },
    { 
      validator: (rule, value) => {
        if (!value) return true;
        // 检查ID是否重复（仅在新增时检查）
        if (!isEditMode.value) {
          return !deviceList.value.some(device => device.id === value);
        }
        return true;
      }, 
      message: '设备ID已存在', 
      trigger: 'blur' 
    }
  ],
  name: [
    { required: true, message: '请输入设备名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请输入设备类型', trigger: 'blur' }
  ],
  organization_id: [
    { required: true, message: '请选择组织', trigger: 'blur' }
  ]
};

// 表格列定义
const columns = computed<DataTableColumns<DeviceEntity>>(() => {
  const cols: DataTableColumns<DeviceEntity> = [
    {
      title: 'ID',
      key: 'id',
      sorter: true,
      width: isMobile.value ? 100 : 200,
      ellipsis: {
        tooltip: true
      }
    },
    {
      title: '设备名称',
      key: 'name',
      sorter: true,
      ellipsis: {
        tooltip: true
      }
    },
    {
      title: '状态',
      key: 'online',
      width: isMobile.value ? 60 : 80,
      render(row: DeviceEntity) {
        return h(
          NBadge,
          {
            dot: true,
            color: row.online ? 'success' : 'error',
            showZero: true
          },
          { default: () => row.online ? '在线' : '离线' }
        );
      }
    }
  ];
  
  // 在非移动端显示类型列
  if (!isMobile.value) {
    cols.push({
      title: '类型',
      key: 'type',
      ellipsis: {
        tooltip: true
      }
    });
  }
  
  cols.push({
    title: '操作',
    key: 'actions',
    width: isMobile.value ? 140 : 200,
    render(row: DeviceEntity) {
      const buttons = [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'info',
            onClick: () => handleViewDevice(row)
          },
          { default: () => '查看' }
        )
      ];
      
      // 如果用户有管理员权限，添加编辑按钮
      if (hasAdminPermission.value) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              quaternary: true,
              type: 'warning',
              onClick: (e) => {
                e.stopPropagation();
                handleEditDevice(row);
              }
            },
            { default: () => '编辑' }
          )
        );
        
        // 添加设置设备展示数据按钮，在移动端简化文字
        if (hasSuperAdminPermission.value) {
          buttons.push(
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                type: 'primary',
                onClick: (e) => {
                  e.stopPropagation();
                  handleDisplayDataEdit(row);
                }
              },
              { default: () => isMobile.value ? '设置' : '设置展示数据' }
            )
          );
        }
      }
      
      return h(NSpace, { justify: 'center' }, {
        default: () => buttons
      });
    }
  });
  
  return cols;
});

// 查看设备详情
function handleViewDevice(device: DeviceEntity) {
  router.push(`/device/${device.id}`);
}

// 编辑设备
function handleEditDevice(device: DeviceEntity) {
  isEditMode.value = true;
  
  // 深拷贝设备数据
  editDevice.value = JSON.parse(JSON.stringify(device));
  
  // 打开编辑模态框
  showEditDeviceModal.value = true;
}

// 加载设备列表
async function loadDeviceList() {
  if (!hasOrganization.value) {
    return;
  }
  
  loadingData.value = true;
  
  try {
    deviceList.value = await deviceApi.getOrgDevices();
  } catch (error) {
    message.error('加载设备列表失败');
    console.error('加载设备列表失败:', error);
  } finally {
    loadingData.value = false;
  }
}

// 加载组织信息
async function loadOrganizationInfo() {
  if (!hasOrganization.value) {
    return;
  }
  
  try {
    currentOrganization.value = await organizationApi.getThisOrganization();
  } catch (error) {
    message.error('加载组织信息失败');
    console.error('加载组织信息失败:', error);
  }
}

// 加载组织列表
async function loadOrganizationList() {
  loadingOrganizations.value = true;
  
  try {
    organizationList.value = await organizationApi.getOrganizationList();
  } catch (error) {
    message.error('加载组织列表失败');
    console.error('加载组织列表失败:', error);
  } finally {
    loadingOrganizations.value = false;
  }
}

// 打开添加设备模态框
function handleOpenAddDeviceModal() {
  isEditMode.value = false;
  
  // 重置表单
  newDevice.value = {
    id: '',
    type: '',
    organization_id: null,
    online: false,
    name: '',
    image: '',
    info: '',
    device_description: '{}',
    description: '[]'
  };
  
  // 设置默认组织为当前用户的组织
  if (user.value && user.value.organizationID && user.value.organizationID !== 'null') {
    newDevice.value.organization_id = user.value.organizationID;
  }
  
  showAddDeviceModal.value = true;
}

// 添加新设备
async function handleAddDevice() {
  if (!addDeviceFormRef.value) return;
  
  await addDeviceFormRef.value.validate(async (errors) => {
    if (errors) {
      return;
    }
    
    addDeviceLoading.value = true;
    
    try {
      // 发送请求创建/更新设备
      await deviceApi.updateDevice(newDevice.value);
      
      message.success('设备添加成功');
      showAddDeviceModal.value = false;
      // 重新加载设备列表
      await loadDeviceList();
      
      // 重置表单
      newDevice.value = {
        id: '',
        type: '',
        organization_id: null,
        online: false,
        name: '',
        image: '',
        info: '',
        device_description: '{}',
        description: '[]'
      };
    } catch (error) {
      message.error('添加设备失败');
      console.error('添加设备失败:', error);
    } finally {
      addDeviceLoading.value = false;
    }
  });
}

// 更新设备
async function handleUpdateDevice() {
  if (!editDeviceFormRef.value) return;
  
  await editDeviceFormRef.value.validate(async (errors) => {
    if (errors) {
      return;
    }
    
    editDeviceLoading.value = true;
    
    try {
      // 发送请求更新设备
      await deviceApi.updateDevice(editDevice.value);
      
      message.success('设备更新成功');
      showEditDeviceModal.value = false;
      // 重新加载设备列表
      await loadDeviceList();
    } catch (error) {
      message.error('更新设备失败');
      console.error('更新设备失败:', error);
    } finally {
      editDeviceLoading.value = false;
    }
  });
}

// 设备展示数据编辑相关
const showDisplayEditor = ref(false);
const currentEditingDeviceId = ref('');

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
  return isMobile.value ? '95%' : '500px';
});

// 计算表单布局
const formLabelPlacement = computed(() => {
  return isMobile.value ? 'top' : 'left';
});

const formLabelWidth = computed(() => {
  return isMobile.value ? 'auto' : '80';
});

// 打开设备展示数据编辑
function handleDisplayDataEdit(device: DeviceEntity) {
  currentEditingDeviceId.value = device.id;
  showDisplayEditor.value = true;
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
  window.addEventListener('resize', handleResize);
  
  if (!user.value) {
    try {
      await authStore.fetchUserInfo();
    } catch (error) {
      message.error('获取用户信息失败');
    }
  }
  
  // 加载数据
  await Promise.all([loadDeviceList(), loadOrganizationInfo(), loadOrganizationList()]);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="device-management-container">
    <NSpace vertical size="large">
      <NCard title="设备管理" :bordered="true" size="large">
        <template #header-extra>
          <NSpace>
            <NButton 
              v-if="hasAdminPermission"
              type="primary"
              @click="handleOpenAddDeviceModal"
            >
              新增设备
            </NButton>
            <NButton 
              type="primary" 
              secondary
              @click="loadDeviceList"
              :loading="loadingData"
            >
              刷新列表
            </NButton>
          </NSpace>
        </template>
        
        <div v-if="!hasOrganization" class="no-organization">
          <NResult 
            status="warning" 
            title="您尚未加入任何组织" 
            description="只有加入组织后才能查看和管理设备"
          >
            <template #footer>
              <NButton @click="() => router.push('/organization')">
                前往组织页面
              </NButton>
            </template>
          </NResult>
        </div>
        
        <NSpin :show="loadingData">
          <div v-if="hasOrganization">
            <div v-if="currentOrganization" class="organization-info">
              <p>当前组织: {{ currentOrganization.name }}</p>
            </div>
            
            <div v-if="deviceList.length === 0 && !loadingData" class="no-devices">
              <NEmpty description="暂无设备数据">
                <template #extra>
                  <p>您的组织下暂无设备</p>
                </template>
              </NEmpty>
            </div>
            
            <div v-else>
              <NDataTable
                :columns="columns"
                :data="deviceList"
                :loading="loadingData"
                striped
                :row-key="(row) => row.id"
                :pagination="{
                  pageSize: 10,
                  showSizePicker: !isMobile,
                  pageSizes: [10, 20, 30, 40],
                  size: isMobile ? 'small' : 'medium'
                }"
                :scroll-x="isMobile ? 500 : ''"
                size="small"
              />
            </div>
          </div>
        </NSpin>
      </NCard>
      
      <NCard title="设备列表" :bordered="true" size="large" v-if="hasOrganization && deviceList.length > 0">
        <NGrid :cols="isMobile ? 1 : 3" :x-gap="16" :y-gap="16" responsive="screen">
          <NGridItem v-for="device in deviceList" :key="device.id">
            <NCard hoverable @click="handleViewDevice(device)">
              <template #cover>
                <div class="device-cover">
                  <NImage
                    :src="getDeviceImageUrl(device)"
                    :fallback-src="getDeviceImageUrl(device)"
                    object-fit="cover"
                    :preview-disabled="!hasDeviceImage(device)"
                    class="w-full h-full"
                  />
                  <div class="device-status">
                    <NBadge :type="device.online ? 'success' : 'error'" dot />
                    <span style="color: rgba(0,0,0,0.4)">{{ device.online ? '在线' : '离线' }}</span>
                  </div>
                </div>
              </template>
              
              <div class="device-info">
                <h3 class="device-name">{{ device.name || `未命名设备 (${device.id.substring(0, 8)})` }}</h3>
                <p class="device-type">类型: {{ device.type || '未指定' }}</p>
                <div class="device-actions">
                  <NSpace>
                    <NButton size="small" type="primary" @click.stop="handleViewDevice(device)">
                      查看详情
                    </NButton>
                    <NButton 
                      v-if="hasAdminPermission" 
                      size="small" 
                      type="warning" 
                      @click.stop="handleEditDevice(device)"
                    >
                      编辑
                    </NButton>
                  </NSpace>
                </div>
              </div>
            </NCard>
          </NGridItem>
        </NGrid>
      </NCard>
    </NSpace>
    
    <!-- 新增设备模态框 -->
    <NModal 
      v-model:show="showAddDeviceModal" 
      preset="card" 
      title="新增设备" 
      :style="{ width: modalWidth }"
      :class="{ 'mobile-modal': isMobile }"
      display-directive="show"
    >
      <NForm
        ref="addDeviceFormRef"
        :model="newDevice"
        :rules="deviceFormRules"
        :label-placement="formLabelPlacement"
        :label-width="formLabelWidth"
        require-mark-placement="right-hanging"
        style="max-width: 120vw;"
      >
        <NFormItem style="max-width: 120vw;" label="设备ID" path="id">
          <NInput v-model:value="newDevice.id" placeholder="请输入唯一的设备ID" />
        </NFormItem>
        <NFormItem style="max-width: 120vw;" label="设备名称" path="name">
          <NInput v-model:value="newDevice.name" placeholder="请输入设备名称" />
        </NFormItem>
        <NFormItem  style="max-width: 120vw;"label="设备类型" path="type">
          <NInput v-model:value="newDevice.type" placeholder="请输入设备类型" />
        </NFormItem>
        <NFormItem style="max-width: 120vw;" label="所属组织" path="organization_id">
          <NSelect 
            v-model:value="newDevice.organization_id" 
            :options="organizationOptions"
            :loading="loadingOrganizations"
            placeholder="请选择设备所属组织"
            filterable
          />
        </NFormItem>
        <NFormItem label="设备图片" path="image">
          <NInput v-model:value="newDevice.image" placeholder="请输入设备图片ID (可选)" />
        </NFormItem>
        <NFormItem label="在线状态" path="online">
          <NSwitch v-model:value="newDevice.online" />
        </NFormItem>
        <NFormItem label="设备信息" path="info">
          <NInput v-model:value="newDevice.info" type="textarea" placeholder="请输入设备其他信息 (可选)" />
        </NFormItem>
      </NForm>
      
      <template #footer>
        <NSpace :justify="isMobile ? 'center' : 'end'" :wrap="isMobile" :size="isMobile ? 'large' : 'medium'">
          <NButton 
            @click="showAddDeviceModal = false"
            :block="isMobile"
          >
            取消
          </NButton>
          <NButton 
            type="primary" 
            @click="handleAddDevice" 
            :loading="addDeviceLoading"
            :block="isMobile"
          >
            确认
          </NButton>
        </NSpace>
      </template>
    </NModal>
    
    <!-- 编辑设备模态框 -->
    <NModal 
      v-model:show="showEditDeviceModal" 
      preset="card" 
      title="编辑设备" 
      :style="{ width: modalWidth }"
      :class="{ 'mobile-modal': isMobile }"
      display-directive="show"
    >
      <NForm
        ref="editDeviceFormRef"
        :model="editDevice"
        :rules="deviceFormRules"
        :label-placement="formLabelPlacement"
        :label-width="formLabelWidth"
        require-mark-placement="right-hanging"
      >
        <NFormItem label="设备ID" path="id">
          <NInput v-model:value="editDevice.id" placeholder="请输入设备ID" disabled />
        </NFormItem>
        <NFormItem label="设备名称" path="name">
          <NInput v-model:value="editDevice.name" placeholder="请输入设备名称" />
        </NFormItem>
        <NFormItem label="设备类型" path="type">
          <NInput v-model:value="editDevice.type" placeholder="请输入设备类型" />
        </NFormItem>
        <NFormItem label="所属组织" path="organization_id">
          <NSelect 
            v-model:value="editDevice.organization_id" 
            :options="organizationOptions"
            :loading="loadingOrganizations"
            placeholder="请选择设备所属组织"
            filterable
          />
        </NFormItem>
        <NFormItem label="设备图片" path="image">
          <NInput v-model:value="editDevice.image" placeholder="请输入设备图片ID (可选)" />
        </NFormItem>
        <NFormItem label="在线状态" path="online">
          <NSwitch v-model:value="editDevice.online" />
        </NFormItem>
        <NFormItem label="设备信息" path="info">
          <NInput v-model:value="editDevice.info" type="textarea" placeholder="请输入设备其他信息 (可选)" />
        </NFormItem>
      </NForm>
      
      <template #footer>
        <NSpace :justify="isMobile ? 'center' : 'end'" :wrap="isMobile" :size="isMobile ? 'large' : 'medium'">
          <NButton 
            @click="showEditDeviceModal = false"
            :block="isMobile"
          >
            取消
          </NButton>
          <NButton 
            type="primary" 
            @click="handleUpdateDevice" 
            :loading="editDeviceLoading"
            :block="isMobile"
          >
            确认
          </NButton>
        </NSpace>
      </template>
    </NModal>
    
    <!-- 设备展示数据编辑器 -->
    <DeviceDisplayEditor 
      :show="showDisplayEditor"
      :device-id="currentEditingDeviceId"
      @update:show="showDisplayEditor = $event"
      @saved="loadDeviceList"
    />
  </div>
</template>

<style scoped>
.device-management-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
td{
  max-width: 120vw;
}
.no-image {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f3f3;
  color: #999;
  font-size: 12px;
}

.no-organization, .no-devices {
  padding: 40px 0;
  text-align: center;
}

.organization-info {
  margin-bottom: 16px;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.device-cover {
  position: relative;
  height: 150px;
  overflow: hidden;
}

.device-status {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.5);
  padding: 2px 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.device-info {
  padding: 8px 0;
}

.device-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-type {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.device-actions {
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

@media (max-width: 768px) {
  .device-management-container {
    padding: 12px;
  }
  
  .device-cover {
    height: 120px;
  }
}
</style> 