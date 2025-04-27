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
  useMessage,
  NEmpty,
  type FormInst,
  type FormRules,
  type FormItemRule,
  type DataTableColumns
} from 'naive-ui';
import { computed, h, onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { organizationApi } from '../api';
import type { OrganizationEntity } from '../api/types';

const message = useMessage();
const router = useRouter();
const authStore = useAuthStore();
const { user, loading } = storeToRefs(authStore);

// 数据加载状态
const loadingData = ref(false);
const organizationList = ref<OrganizationEntity[]>([]);

// 表单引用和模态框状态
const formRef = ref<FormInst | null>(null);
const showModal = ref(false);
const modalTitle = ref('添加新组织');
const isEdit = ref(false);
const submitting = ref(false);

// 当前编辑的组织
const currentOrganization = reactive<OrganizationEntity>({
  name: '',
  phone: '',
  email: '',
  address: '',
  description: '',
  deviceEntities: '[]'
});

// 表单验证规则
const rules: FormRules = {
  name: [
    { required: true, message: '请输入组织名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度在2到50个字符之间', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
  ]
};

// 检查用户是否有管理权限
const hasSuperAdminPermission = computed(() => {
  return user.value && user.value.permission === 4;
});

// 表格列定义
const columns = computed<DataTableColumns<OrganizationEntity>>(() => [
  {
    title: '组织名称',
    key: 'name',
    sorter: 'default'
  },
  {
    title: '电话',
    key: 'phone',
  },
  {
    title: '邮箱',
    key: 'email',
  },
  {
    title: '地址',
    key: 'address',
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: {
      tooltip: true
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
            NPopconfirm,
            {
              onPositiveClick: () => handleDelete(row),
              negativeText: '取消',
              positiveText: '确定'
            },
            {
              trigger: () => h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  type: 'error',
                },
                { default: () => '删除' }
              ),
              default: () => '确定要删除该组织吗？此操作不可撤销。'
            }
          )
        ]
      });
    }
  }
]);

// 加载数据
async function loadOrganizationList() {
  loadingData.value = true;
  
  try {
    organizationList.value = await organizationApi.getOrganizationList();
  } catch (error) {
    message.error('加载组织列表失败');
    console.error('加载组织列表失败:', error);
  } finally {
    loadingData.value = false;
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
    message.warning('您没有管理组织的权限');
    router.push('/');
    return;
  }
  
  // 加载组织列表
  await loadOrganizationList();
});

// 打开添加组织模态框
function handleAdd() {
  isEdit.value = false;
  modalTitle.value = '添加新组织';
  
  // 重置表单数据
  Object.assign(currentOrganization, {
    id: undefined,
    name: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    deviceEntities: '[]'
  });
  
  showModal.value = true;
}

// 打开编辑组织模态框
function handleEdit(row: OrganizationEntity) {
  isEdit.value = true;
  modalTitle.value = '编辑组织信息';
  
  // 填充表单数据
  Object.assign(currentOrganization, { ...row });
  
  showModal.value = true;
}

// 删除组织
async function handleDelete(row: OrganizationEntity) {
  if (!row.id) {
    message.error('组织ID无效');
    return;
  }
  
  try {
    await organizationApi.deleteOrganization(row.id);
    message.success('删除组织成功');
    
    // 重新加载组织列表
    await loadOrganizationList();
  } catch (error) {
    message.error('删除组织失败');
    console.error('删除组织失败:', error);
  }
}

// 提交表单
async function handleSubmit() {
  if (!formRef.value) return;
  
  submitting.value = true;
  
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
    await organizationApi.updateOrganization(currentOrganization);
    
    message.success(isEdit.value ? '更新组织成功' : '创建组织成功');
    showModal.value = false;
    
    // 重新加载组织列表
    await loadOrganizationList();
  } catch (error) {
    message.error(isEdit.value ? '更新组织失败' : '创建组织失败');
    console.error(isEdit.value ? '更新组织失败:' : '创建组织失败:', error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="organization-management-container">
    <NSpace vertical size="large">
      <NCard title="组织管理" :bordered="true" size="large">
        <template #header-extra>
          <NSpace>
            <NButton 
              type="primary"
              @click="handleAdd"
            >
              添加组织
            </NButton>
            <NButton 
              type="primary" 
              secondary
              @click="loadOrganizationList"
              :loading="loadingData"
            >
              刷新列表
            </NButton>
          </NSpace>
        </template>
        
        <div v-if="!hasSuperAdminPermission" class="no-permission">
          <NEmpty description="您没有组织管理权限">
            <template #extra>
              <NButton @click="() => router.push('/')">返回主页</NButton>
            </template>
          </NEmpty>
        </div>
        
        <div v-else>
          <NDataTable
            :columns="columns"
            :data="organizationList"
            :loading="loadingData"
            striped
            :row-key="(row) => row.id || row.name"
            :pagination="{
              pageSize: 10,
              showSizePicker: true,
              pageSizes: [10, 20, 30, 40]
            }"
          />
        </div>
      </NCard>
    </NSpace>
    
    <!-- 组织表单模态框 -->
    <NModal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 600px;">
      <NForm 
        ref="formRef" 
        :model="currentOrganization" 
        :rules="rules"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="组织名称" path="name">
          <NInput v-model:value="currentOrganization.name" placeholder="请输入组织名称" />
        </NFormItem>
        
        <NFormItem label="电话" path="phone">
          <NInput v-model:value="currentOrganization.phone" placeholder="请输入电话号码" />
        </NFormItem>
        
        <NFormItem label="邮箱" path="email">
          <NInput v-model:value="currentOrganization.email" placeholder="请输入邮箱" />
        </NFormItem>
        
        <NFormItem label="地址" path="address">
          <NInput v-model:value="currentOrganization.address" placeholder="请输入地址" />
        </NFormItem>
        
        <NFormItem label="描述" path="description">
          <NInput 
            v-model:value="currentOrganization.description" 
            placeholder="请输入组织描述" 
            type="textarea" 
            :autosize="{ minRows: 3, maxRows: 5 }" 
          />
        </NFormItem>
      </NForm>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存修改' : '创建组织' }}
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.organization-management-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.no-permission {
  padding: 40px 0;
  text-align: center;
}
</style> 