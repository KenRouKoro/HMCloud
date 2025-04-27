<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/authStore';
import { 
  NCard, 
  NSpace, 
  NTable,
  NButton,
  NDataTable,
  NPopconfirm,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSwitch,
  NTabs,
  NTabPane,
  NDivider,
  useMessage,
  NEmpty,
  NText
} from 'naive-ui';
import type { 
  FormInst, 
  FormRules, 
  FormItemRule,
  DataTableColumns,
  SelectOption
} from 'naive-ui';
import { computed, h, onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { superAdminApi, organizationApi } from '../api';
import type { UserViewData, OrganizationEntity } from '../api/types';

const message = useMessage();
const router = useRouter();
const authStore = useAuthStore();
const { user, loading } = storeToRefs(authStore);

// 数据加载状态
const loadingData = ref(false);
const userList = ref<UserViewData[]>([]);

// 组织列表
const loadingOrganizations = ref(false);
const organizationList = ref<OrganizationEntity[]>([]);
const organizationOptions = computed<SelectOption[]>(() => {
  const options: SelectOption[] = [
    {
      label: '无组织',
      value: 'null'
    }
  ];
  
  organizationList.value.forEach(org => {
    if (org.id) {
      options.push({
        label: org.name || '未命名组织',
        value: org.id
      });
    }
  });
  
  return options;
});

// 组织搜索关键词
const orgSearchValue = ref('');
// 组织过滤函数
const filteredOrgOptions = computed(() => {
  const searchText = orgSearchValue.value.toLowerCase().trim();
  if (!searchText) return organizationOptions.value;
  
  return organizationOptions.value.filter(option => 
    String(option.label).toLowerCase().includes(searchText)
  );
});

// 权限等级选项
const permissionOptions = [
  {
    label: '普通用户',
    value: 0
  },
  {
    label: '组织管理员',
    value: 2
  },
  {
    label: '超级管理员',
    value: 4
  }
];

// 表单引用和模态框状态
const formRef = ref<FormInst | null>(null);
const showEditModal = ref(false);
const passwordFormRef = ref<FormInst | null>(null);
const showPasswordModal = ref(false);
const isLoading = ref(false);
const currentTab = ref('basic');

// 添加用户模态框状态和表单
const showAddUserModal = ref(false);
const addUserFormRef = ref<FormInst | null>(null);
const newUsername = ref('');
const addUserLoading = ref(false);

// 当前编辑的用户
const currentUser = reactive<{
  id: string;
  username: string;
  email: string;
  phone: string;
  organizationID: string;
  permission: number;
}>({
  id: '',
  username: '',
  email: '',
  phone: '',
  organizationID: '',
  permission: 0
});

// 存储原始用户数据（用于比较变更）
const originalUserData = ref<{
  id: string;
  username: string;
  email: string;
  phone: string;
  organizationID: string;
  permission: number;
}>({
  id: '',
  username: '',
  email: '',
  phone: '',
  organizationID: '',
  permission: 0
});

// 密码表单
const passwordForm = reactive({
  password: '',
  confirmPassword: ''
});

// 表单验证规则
const basicRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在2到20个字符之间', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
  ]
};

const passwordRules: FormRules = {
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule: FormItemRule, value: string) => {
        return value === passwordForm.password;
      },
      message: '两次输入的密码不一致',
      trigger: 'blur'
    }
  ]
};

// 添加用户表单验证规则
const addUserRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在2到20个字符之间', trigger: 'blur' }
  ]
};

// 检查用户是否有管理权限
const hasSuperAdminPermission = computed(() => {
  return user.value && user.value.permission === 4;
});

// 权限文本
function getPermissionText(permission: number): string {
  switch (permission) {
    case 0:
      return '普通用户';
    case 2:
      return '组织管理员';
    case 4:
      return '超级管理员';
    default:
      return `权限级别 ${permission}`;
  }
}

// 表格列定义
const columns = computed<DataTableColumns<UserViewData>>(() => [
  {
    title: '用户名',
    key: 'username',
    sorter: 'default'
  },
  {
    title: '邮箱',
    key: 'email',
  },
  {
    title: '电话',
    key: 'phone',
    render(row) {
      return row.phone || '未设置';
    }
  },
  {
    title: '权限',
    key: 'permission',
    render(row) {
      return getPermissionText(row.permission);
    }
  },
  {
    title: '所属组织',
    key: 'organizationID',
    render(row) {
      if (!row.organizationID || row.organizationID === 'null') {
        return '未设置组织归属';
      }
      
      const org = organizationList.value.find(org => org.id === row.organizationID);
      return org ? org.name : row.organizationID;
    }
  },
  {
    title: '操作',
    key: 'actions',
    render(row) {
      return h(NSpace, { justify: 'center' }, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              quaternary: true,
              type: 'info',
              onClick: () => handleEdit(row)
            },
            { default: () => '编辑' }
          ),
          h(
            NButton,
            {
              size: 'small',
              quaternary: true,
              type: 'warning',
              onClick: () => handleResetPassword(row)
            },
            { default: () => '重置密码' }
          )
        ]
      });
    }
  }
]);

// 加载用户列表数据
async function loadUserList() {
  loadingData.value = true;
  
  try {
    userList.value = await superAdminApi.getUserList();
  } catch (error) {
    message.error('加载用户列表失败');
    console.error('加载用户列表失败:', error);
  } finally {
    loadingData.value = false;
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

// 检查权限并初始化
onMounted(async () => {
  if (!user.value) {
    try {
      await authStore.fetchUserInfo();
    } catch (error) {
      message.error('获取用户信息失败');
    }
  }

  // 如果没有超级管理员权限，重定向到首页
  if (!hasSuperAdminPermission.value) {
    message.warning('您没有用户管理权限');
    router.push('/');
    return;
  }
  
  // 加载数据
  await Promise.all([loadUserList(), loadOrganizationList()]);
});

// 打开编辑用户模态框
function handleEdit(row: UserViewData) {
  // 填充表单数据
  const userData = {
    id: row.id,
    username: row.username,
    email: row.email || '',
    phone: row.phone || '',
    organizationID: row.organizationID || 'null',
    permission: row.permission
  };
  
  // 更新当前用户数据
  Object.assign(currentUser, userData);
  
  // 保存原始数据副本
  originalUserData.value = { ...userData };
  
  currentTab.value = 'basic';
  showEditModal.value = true;
}

// 打开重置密码模态框
function handleResetPassword(row: UserViewData) {
  // 设置当前用户ID
  currentUser.id = row.id;
  currentUser.username = row.username;
  
  // 重置密码表单
  passwordForm.password = '';
  passwordForm.confirmPassword = '';
  
  showPasswordModal.value = true;
}

// 计算是否有变更
const hasUsernameChanged = computed(() => 
  currentUser.username !== originalUserData.value.username
);
const hasEmailChanged = computed(() => 
  currentUser.email !== originalUserData.value.email
);
const hasPhoneChanged = computed(() => 
  currentUser.phone !== originalUserData.value.phone
);
const hasOrganizationChanged = computed(() => 
  currentUser.organizationID !== originalUserData.value.organizationID
);
const hasPermissionChanged = computed(() => 
  currentUser.permission !== originalUserData.value.permission
);

// 计算是否有任何变更
const hasAnyChanges = computed(() => 
  hasUsernameChanged.value || 
  hasEmailChanged.value || 
  hasPhoneChanged.value || 
  hasOrganizationChanged.value || 
  hasPermissionChanged.value
);

// 提交基本信息表单
async function handleSubmitBasic() {
  if (!formRef.value) return;
  
  isLoading.value = true;
  
  try {
    // 表单验证
    await new Promise<void>((resolve, reject) => {
      formRef.value!.validate(errors => {
        if (errors) {
          reject(new Error('表单验证失败'));
        } else {
          resolve();
        }
      });
    });
    
    // 提交数据
    const updatePromises = [];
    let hasChanges = false;
    
    // 更新用户名（如果已更改）
    if (hasUsernameChanged.value) {
      updatePromises.push(
        superAdminApi.updateUserName(currentUser.id, currentUser.username)
          .catch(err => {
            console.error('更新用户名失败:', err);
            throw new Error('更新用户名失败');
          })
      );
      hasChanges = true;
    }
    
    // 更新邮箱（如果已更改）
    if (hasEmailChanged.value) {
      updatePromises.push(
        superAdminApi.updateUserEmail(currentUser.id, currentUser.email)
          .catch(err => {
            console.error('更新邮箱失败:', err);
            throw new Error('更新邮箱失败');
          })
      );
      hasChanges = true;
    }
    
    // 更新电话（如果已更改）
    if (hasPhoneChanged.value) {
      updatePromises.push(
        superAdminApi.updateUserPhone(currentUser.id, currentUser.phone)
          .catch(err => {
            console.error('更新电话失败:', err);
            throw new Error('更新电话失败');
          })
      );
      hasChanges = true;
    }
    
    // 更新组织ID（如果已更改）
    if (hasOrganizationChanged.value) {
      updatePromises.push(
        superAdminApi.updateUserOrganizationId(currentUser.id, currentUser.organizationID)
          .catch(err => {
            console.error('更新组织ID失败:', err);
            throw new Error('更新组织ID失败');
          })
      );
      hasChanges = true;
    }
    
    // 更新权限（如果已更改）
    if (hasPermissionChanged.value) {
      updatePromises.push(
        superAdminApi.updateUserPermission(currentUser.id, currentUser.permission)
          .catch(err => {
            console.error('更新权限失败:', err);
            throw new Error('更新权限失败');
          })
      );
      hasChanges = true;
    }
    
    // 如果没有变更，直接关闭模态框
    if (!hasChanges) {
      message.info('没有检测到信息变更');
      showEditModal.value = false;
      isLoading.value = false;
      return;
    }
    
    await Promise.all(updatePromises);
    
    message.success('更新用户信息成功');
    showEditModal.value = false;
    
    // 重新加载用户列表
    await loadUserList();
  } catch (error) {
    message.error('更新用户信息失败');
    console.error('更新用户信息失败:', error);
  } finally {
    isLoading.value = false;
  }
}

// 提交密码表单
async function handleSubmitPassword() {
  if (!passwordFormRef.value) return;
  
  isLoading.value = true;
  
  try {
    // 表单验证
    await new Promise<void>((resolve, reject) => {
      passwordFormRef.value!.validate(errors => {
        if (errors) {
          reject(new Error('表单验证失败'));
        } else {
          resolve();
        }
      });
    });
    
    // 提交数据
    await superAdminApi.updateUserPassword(currentUser.id, passwordForm.password);
    
    message.success('重置密码成功');
    showPasswordModal.value = false;
  } catch (error) {
    message.error('重置密码失败');
    console.error('重置密码失败:', error);
  } finally {
    isLoading.value = false;
  }
}

// 打开添加用户模态框
function handleAddUser() {
  newUsername.value = '';
  showAddUserModal.value = true;
}

// 提交添加用户表单
async function handleSubmitAddUser() {
  if (!addUserFormRef.value) return;
  
  addUserLoading.value = true;
  
  try {
    // 表单验证
    await new Promise<void>((resolve, reject) => {
      addUserFormRef.value!.validate(errors => {
        if (errors) {
          reject(new Error('表单验证失败'));
        } else {
          resolve();
        }
      });
    });
    
    // 提交数据
    await superAdminApi.createUser(newUsername.value);
    
    message.success('添加用户成功');
    showAddUserModal.value = false;
    
    // 重新加载用户列表
    await loadUserList();
  } catch (error) {
    message.error('添加用户失败');
    console.error('添加用户失败:', error);
  } finally {
    addUserLoading.value = false;
  }
}

// 处理组织搜索
function handleOrgSearch(query: string): void {
  orgSearchValue.value = query;
}
</script>

<template>
  <div class="user-management-container">
    <NSpace vertical size="large">
      <NCard title="用户管理" :bordered="true" size="large">
        <template #header-extra>
          <NSpace>
            <NButton 
              type="primary" 
              @click="handleAddUser"
              v-if="hasSuperAdminPermission"
            >
              添加用户
            </NButton>
            <NButton 
              type="primary" 
              secondary
              @click="loadUserList"
              :loading="loadingData"
            >
              刷新列表
            </NButton>
          </NSpace>
        </template>
        
        <div v-if="!hasSuperAdminPermission" class="no-permission">
          <NEmpty description="您没有用户管理权限">
            <template #extra>
              <NButton @click="() => router.push('/')">返回主页</NButton>
            </template>
          </NEmpty>
        </div>
        
        <div v-else>
          <NDataTable
            :columns="columns"
            :data="userList"
            :loading="loadingData || loadingOrganizations"
            striped
            :row-key="(row) => row.id"
            :pagination="{
              pageSize: 10,
              showSizePicker: true,
              pageSizes: [10, 20, 30, 40]
            }"
          />
        </div>
      </NCard>
    </NSpace>
    
    <!-- 编辑用户模态框 -->
    <NModal v-model:show="showEditModal" preset="card" title="编辑用户" style="width: 650px;">
      <NTabs v-model:value="currentTab" type="line" animated>
        <NTabPane name="basic" tab="基本信息">
          <NForm 
            ref="formRef" 
            :model="currentUser" 
            :rules="basicRules"
            label-placement="left"
            label-width="100"
          >
            <NFormItem label="用户ID" path="id">
              <NInput v-model:value="currentUser.id" disabled />
            </NFormItem>
            
            <NFormItem 
              label="用户名" 
              path="username"
              :validate-status="hasUsernameChanged ? 'warning' : undefined"
              :feedback="hasUsernameChanged ? '已修改' : undefined"
            >
              <NInput v-model:value="currentUser.username" placeholder="请输入用户名" />
            </NFormItem>
            
            <NFormItem 
              label="邮箱" 
              path="email"
              :validate-status="hasEmailChanged ? 'warning' : undefined"
              :feedback="hasEmailChanged ? '已修改' : undefined"
            >
              <NInput v-model:value="currentUser.email" placeholder="请输入邮箱" />
            </NFormItem>
            
            <NFormItem 
              label="电话" 
              path="phone"
              :validate-status="hasPhoneChanged ? 'warning' : undefined"
              :feedback="hasPhoneChanged ? '已修改' : undefined"
            >
              <NInput v-model:value="currentUser.phone" placeholder="请输入电话号码" />
            </NFormItem>
            
            <NFormItem 
              label="所属组织" 
              path="organizationID"
              :validate-status="hasOrganizationChanged ? 'warning' : undefined"
              :feedback="hasOrganizationChanged ? '已修改' : undefined"
            >
              <NSelect 
                v-model:value="currentUser.organizationID" 
                :options="filteredOrgOptions" 
                placeholder="请选择组织"
                :loading="loadingOrganizations"
                filterable
                remote
                clearable
                :show-arrow="true"
                :remote-method="handleOrgSearch"
              >
                <template #empty>
                  <div style="padding: 12px 0; text-align: center;">
                    {{ orgSearchValue ? '未找到匹配的组织' : '暂无组织数据' }}
                  </div>
                </template>
              </NSelect>
            </NFormItem>
            
            <NFormItem 
              label="权限等级" 
              path="permission"
              :validate-status="hasPermissionChanged ? 'warning' : undefined"
              :feedback="hasPermissionChanged ? '已修改' : undefined"
            >
              <NSelect 
                v-model:value="currentUser.permission" 
                :options="permissionOptions" 
                placeholder="请选择权限等级"
              />
            </NFormItem>
          </NForm>
          
          <div class="form-summary" v-if="hasAnyChanges">
            <NDivider />
            <NText type="warning">已修改 {{ Object.values([hasUsernameChanged, hasEmailChanged, hasPhoneChanged, hasOrganizationChanged, hasPermissionChanged]).filter(Boolean).length }} 项数据</NText>
          </div>
        </NTabPane>
      </NTabs>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <NButton @click="showEditModal = false">取消</NButton>
          <NButton 
            type="primary" 
            @click="handleSubmitBasic" 
            :loading="isLoading"
            :disabled="!hasAnyChanges"
          >
            {{ hasAnyChanges ? '保存修改' : '无变更' }}
          </NButton>
        </div>
      </template>
    </NModal>
    
    <!-- 重置密码模态框 -->
    <NModal v-model:show="showPasswordModal" preset="card" title="重置密码" style="width: 450px;">
      <div class="reset-password-header">
        <div>用户: {{ currentUser.username }}</div>
        <div>ID: {{ currentUser.id }}</div>
      </div>
      
      <NDivider />
      
      <NForm 
        ref="passwordFormRef" 
        :model="passwordForm" 
        :rules="passwordRules"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="新密码" path="password">
          <NInput 
            v-model:value="passwordForm.password" 
            type="password" 
            placeholder="请输入新密码" 
            show-password-on="click"
          />
        </NFormItem>
        
        <NFormItem label="确认密码" path="confirmPassword">
          <NInput 
            v-model:value="passwordForm.confirmPassword" 
            type="password" 
            placeholder="请再次输入新密码" 
            show-password-on="click"
          />
        </NFormItem>
      </NForm>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <NButton @click="showPasswordModal = false">取消</NButton>
          <NButton type="primary" @click="handleSubmitPassword" :loading="isLoading">
            确认重置
          </NButton>
        </div>
      </template>
    </NModal>
    
    <!-- 添加用户模态框 -->
    <NModal v-model:show="showAddUserModal" preset="card" title="添加用户" style="width: 450px;">
      <NForm
        ref="addUserFormRef"
        :model="{ username: newUsername }"
        :rules="addUserRules"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="用户名" path="username">
          <NInput
            v-model:value="newUsername"
            placeholder="请输入用户名"
          />
        </NFormItem>
        
        <div class="help-text">
          <NText type="info">注：系统将为新用户分配默认密码</NText>
        </div>
      </NForm>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <NButton @click="showAddUserModal = false">取消</NButton>
          <NButton
            type="primary"
            @click="handleSubmitAddUser"
            :loading="addUserLoading"
          >
            确认添加
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.user-management-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.no-permission {
  padding: 40px 0;
  text-align: center;
}

.reset-password-header {
  margin-bottom: 16px;
}

.reset-password-header > div:first-child {
  font-weight: bold;
  margin-bottom: 4px;
}

.reset-password-header > div:last-child {
  font-size: 14px;
}

.form-summary {
  margin-top: 16px;
  text-align: right;
}

.help-text {
  font-size: 14px;
  margin-top: 8px;
  margin-bottom: 8px;
  text-align: center;
}
</style> 