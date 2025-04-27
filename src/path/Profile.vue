<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/authStore';
import { 
  NCard, 
  NSpace, 
  NDescriptions, 
  NDescriptionsItem, 
  NAvatar, 
  NButton,
  NDivider,
  NText,
  useMessage,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NImage,
  NSpin,
  NIcon,
  type FormInst,
  type FormRules,
  type FormItemRule
} from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { userApi, organizationApi, imageApi } from '../api';
import { CloudUploadOutline } from '@vicons/ionicons5';
import { getApiUrl } from '../config';

const message = useMessage();
const authStore = useAuthStore();
const { user, loading } = storeToRefs(authStore);

// 表单引用
const nameFormRef = ref<FormInst | null>(null);
const emailFormRef = ref<FormInst | null>(null);
const phoneFormRef = ref<FormInst | null>(null);
const passwordFormRef = ref<FormInst | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// 表单数据
const nameForm = ref({
  username: ''
});

const emailForm = ref({
  email: ''
});

const phoneForm = ref({
  phone: ''
});

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 模态框显示状态
const showNameModal = ref(false);
const showEmailModal = ref(false);
const showPhoneModal = ref(false);
const showPasswordModal = ref(false);
const showAvatarModal = ref(false);

// 提交状态
const submitting = ref(false);

// 头像上传状态和预览
const avatarUploading = ref(false);
const avatarUrl = ref('');
const previewFile = ref<File | null>(null);
const imagePreviewUrl = ref('');

// 头像URL备选方案索引
const avatarUrlFallbackIndex = ref(0);
const maxFallbackAttempts = 3;

// 表单验证规则
const nameRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在2到20个字符之间', trigger: 'blur' }
  ]
};

const emailRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
};

const phoneRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
  ]
};

const passwordRules: FormRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: FormItemRule, value: string) => {
        return value === passwordForm.value.newPassword;
      },
      message: '两次输入的密码不一致',
      trigger: 'blur'
    }
  ]
};

// 组织名称
const organizationName = ref('');
const loadingOrgName = ref(false);

// 加载组织名称
async function loadOrganizationName() {
  if (!user.value?.organizationID || user.value.organizationID === 'null') {
    organizationName.value = '';
    return;
  }
  
  loadingOrgName.value = true;
  try {
    organizationName.value = await organizationApi.getOrganizationName(user.value.organizationID);
  } catch (error) {
    console.error('获取组织名称失败:', error);
    organizationName.value = '';
  } finally {
    loadingOrgName.value = false;
  }
}

// 确保页面加载时刷新用户信息
onMounted(async () => {
  if (!user.value) {
    try {
      await authStore.fetchUserInfo();
    } catch (error) {
      message.error('获取用户信息失败');
    }
  }
  
  // 加载组织名称
  if (user.value?.organizationID && user.value.organizationID !== 'null') {
    await loadOrganizationName();
  }
  
  // 设置头像URL
  updateAvatarUrl();
});

// 更新头像URL
function updateAvatarUrl() {
  if (user.value?.avatar) {
    // 检查头像ID是否有效
    if (user.value.avatar === 'null' || user.value.avatar === 'undefined') {
      avatarUrl.value = '';
      return;
    }
    
    // 重置备选方案索引
    avatarUrlFallbackIndex.value = 0;
    
    // 使用主要URL格式
    const url = imageApi.getImageUrl(user.value.avatar);
    avatarUrl.value = url;
    
    // 测试图片加载，以便在失败时自动切换URL格式
    testImageRequest(url);
  } else {
    avatarUrl.value = '';
  }
}

// 测试图片网络请求
function testImageRequest(url: string) {
  if (!url) return;
  
  // 创建一个测试图片元素
  const img = new Image();
  
  img.onerror = () => {
    // 尝试不同的URL格式
    tryNextAvatarUrlFormat();
  };
  
  // 添加时间戳防止缓存
  img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
}

// 尝试头像URL的备选方案
function tryNextAvatarUrlFormat() {
  if (!user.value?.avatar) return;
  
  avatarUrlFallbackIndex.value++;
  
  if (avatarUrlFallbackIndex.value > maxFallbackAttempts) {
    avatarUrl.value = '';
    return;
  }
  
  const id = user.value.avatar;
  // 根据日志，按照正确的URL优先级排序
  const formats = [
    `${getApiUrl()}/image/get?id=${id}`, // 这是正确的格式，放在第一位
    `${getApiUrl()}/image?id=${id}`,
    `${getApiUrl()}/image/${id}`,
    `/api/image/get?id=${id}`,
    `/api/image?id=${id}`
  ];
  
  const formatIndex = avatarUrlFallbackIndex.value - 1;
  if (formatIndex < formats.length) {
    const newUrl = formats[formatIndex];
    avatarUrl.value = newUrl;
    
    // 测试新的URL
    testImageRequest(newUrl);
  } else {
    avatarUrl.value = '';
  }
}

// 权限级别描述
const permissionText = computed(() => {
  if (!user.value) return '未知';
  
  switch (user.value.permission) {
    case 0:
      return '普通用户';
    case 2:
      return '组织管理员';
    case 4:
      return '超级管理员';
    default:
      return `级别 ${user.value.permission}`;
  }
});

// 刷新用户信息
async function refreshUserInfo() {
  try {
    await authStore.fetchUserInfo();
    // 刷新组织名称
    if (user.value?.organizationID && user.value.organizationID !== 'null') {
      await loadOrganizationName();
    }
    // 更新头像URL
    updateAvatarUrl();
    message.success('刷新成功');
  } catch (error) {
    message.error('刷新用户信息失败');
  }
}

// 打开编辑用户名模态框
function openNameModal() {
  nameForm.value.username = user.value?.username || '';
  showNameModal.value = true;
}

// 打开编辑邮箱模态框
function openEmailModal() {
  emailForm.value.email = user.value?.email || '';
  showEmailModal.value = true;
}

// 打开编辑手机模态框
function openPhoneModal() {
  phoneForm.value.phone = user.value?.phone || '';
  showPhoneModal.value = true;
}

// 打开修改密码模态框
function openPasswordModal() {
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  showPasswordModal.value = true;
}

// 打开头像上传模态框
function openAvatarModal() {
  previewFile.value = null;
  imagePreviewUrl.value = '';
  showAvatarModal.value = true;
}

// 提交用户名表单
async function submitNameForm(e: MouseEvent) {
  e.preventDefault();
  
  if (!nameFormRef.value) return;
  
  submitting.value = true;
  
  try {
    await new Promise<void>((resolve, reject) => {
      nameFormRef.value?.validate(errors => {
        if (errors) {
          reject(new Error('表单验证失败'));
        } else {
          resolve();
        }
      });
    });
    
    await userApi.updateName(nameForm.value.username);
    message.success('用户名修改成功');
    showNameModal.value = false;
    
    // 刷新用户信息
    await authStore.fetchUserInfo();
    
    // 更新头像URL
    updateAvatarUrl();
  } catch (error) {
    message.error('修改用户名失败');
    console.error('修改用户名失败:', error);
  } finally {
    submitting.value = false;
  }
}

// 提交邮箱表单
async function submitEmailForm(e: MouseEvent) {
  e.preventDefault();
  
  if (!emailFormRef.value) return;
  
  submitting.value = true;
  
  try {
    await new Promise<void>((resolve, reject) => {
      emailFormRef.value?.validate(errors => {
        if (errors) {
          reject(new Error('表单验证失败'));
        } else {
          resolve();
        }
      });
    });
    
    await userApi.updateEmail(emailForm.value.email);
    message.success('邮箱修改成功');
    showEmailModal.value = false;
    
    // 刷新用户信息
    await authStore.fetchUserInfo();
    
    // 更新头像URL
    updateAvatarUrl();
  } catch (error) {
    message.error('修改邮箱失败');
    console.error('修改邮箱失败:', error);
  } finally {
    submitting.value = false;
  }
}

// 提交手机表单
async function submitPhoneForm(e: MouseEvent) {
  e.preventDefault();
  
  if (!phoneFormRef.value) return;
  
  submitting.value = true;
  
  try {
    await new Promise<void>((resolve, reject) => {
      phoneFormRef.value?.validate(errors => {
        if (errors) {
          reject(new Error('表单验证失败'));
        } else {
          resolve();
        }
      });
    });
    
    await userApi.updatePhone(phoneForm.value.phone);
    message.success('手机号修改成功');
    showPhoneModal.value = false;
    
    // 刷新用户信息
    await authStore.fetchUserInfo();
    
    // 更新头像URL
    updateAvatarUrl();
  } catch (error) {
    message.error('修改手机号失败');
    console.error('修改手机号失败:', error);
  } finally {
    submitting.value = false;
  }
}

// 提交密码表单
async function submitPasswordForm(e: MouseEvent) {
  e.preventDefault();
  
  if (!passwordFormRef.value) return;
  
  submitting.value = true;
  
  try {
    await new Promise<void>((resolve, reject) => {
      passwordFormRef.value?.validate(errors => {
        if (errors) {
          reject(new Error('表单验证失败'));
        } else {
          resolve();
        }
      });
    });
    
    await userApi.updatePassword(
      passwordForm.value.oldPassword,
      passwordForm.value.newPassword
    );
    message.success('密码修改成功');
    showPasswordModal.value = false;
  } catch (error) {
    message.error('修改密码失败');
    console.error('修改密码失败:', error);
  } finally {
    submitting.value = false;
  }
}

// 触发文件选择对话框
function triggerFileSelection() {
  fileInputRef.value?.click();
}

// 处理文件选择
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  
  if (!files || files.length === 0) {
    return;
  }
  
  const file = files[0];
  
  // 文件类型检查
  if (!file.type.startsWith('image/')) {
    message.error('只能上传图片文件');
    return;
  }
  
  // 文件大小检查（限制5MB）
  if (file.size > 5 * 1024 * 1024) {
    message.error('图片大小不能超过5MB');
    return;
  }
  
  // 设置预览文件和URL
  previewFile.value = file;
  imagePreviewUrl.value = URL.createObjectURL(file);
}

// 重新选择文件
function resetFileSelection() {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
  previewFile.value = null;
  imagePreviewUrl.value = '';
}

// 提交头像更新
async function submitAvatarUpload() {
  if (!previewFile.value) {
    message.warning('请先选择图片');
    return;
  }
  
  avatarUploading.value = true;
  
  try {
    // 1. 上传图片
    const imageId = await imageApi.uploadImage(previewFile.value);
    
    // 2. 更新用户头像
    await userApi.updateAvatar(imageId);
    
    message.success('头像更新成功');
    showAvatarModal.value = false;
    
    // 3. 刷新用户信息
    await authStore.fetchUserInfo();
    
    // 4. 更新头像URL
    updateAvatarUrl();
    
    // 5. 立即测试新头像URL
    if (user.value?.avatar) {
      const directUrl = imageApi.getImageUrl(user.value.avatar);
      testImageRequest(directUrl);
    }
  } catch (error) {
    message.error('更新头像失败');
    console.error('更新头像失败:', error);
  } finally {
    avatarUploading.value = false;
  }
}

// 监听用户信息变化，自动更新头像URL
watch(() => user.value?.avatar, (newAvatar, oldAvatar) => {
  if (newAvatar !== oldAvatar) {
    updateAvatarUrl();
  }
}, { immediate: true });
</script>

<template>
  <div class="profile-container">
    <NSpace vertical size="large">
      <NCard title="个人资料" :bordered="true" size="large">
        <template #header-extra>
          <NButton 
            type="primary" 
            secondary
            @click="refreshUserInfo"
            :loading="loading"
          >
            刷新信息
          </NButton>
        </template>
        
        <div class="profile-content" v-if="user">
          <!-- 个人资料头部 -->
          <div class="profile-header-wrapper">
            <div class="profile-header">
              <div class="avatar-container">
                <template v-if="avatarUrl">
                  <!-- 当有头像URL时显示图片头像 -->
                  <NAvatar 
                    :src="avatarUrl"
                    size="large"
                    round
                    :style="{ width: '100px', height: '100px', fontSize: '36px' }"
                  />
                </template>
                <template v-else>
                  <!-- 当没有头像URL时显示文字头像 -->
                  <NAvatar 
                    size="large"
                    round
                    :style="{ width: '100px', height: '100px', fontSize: '36px' }"
                  >
                    {{ user.username?.charAt(0) }}
                  </NAvatar>
                </template>
                <div class="avatar-overlay" @click="openAvatarModal">
                  <NIcon><CloudUploadOutline /></NIcon>
                  <span>更换头像</span>
                </div>
              </div>
              <div class="profile-title">
                <h2>{{ user.username }}</h2>
                <NText depth="3" style="margin-top: 4px;">ID: {{ user.id }}</NText>
                <NSpace style="margin-top: 12px;">
                  <NButton tertiary size="small">权限: {{ permissionText }}</NButton>
                  <NButton tertiary size="small" v-if="user.organizationID && user.organizationID !== 'null'">
                    组织: {{ organizationName || (loadingOrgName ? '加载中...' : '未知组织') }}
                  </NButton>
                  <NButton tertiary size="small" v-else>
                    未设置组织归属
                  </NButton>
                </NSpace>
              </div>
            </div>
          </div>
          
          <NDivider />
          
          <!-- 个人信息卡片布局 -->
          <div class="profile-settings">
            <NSpace vertical size="large" style="width: 100%;">
              <!-- 基本信息 -->
              <div class="profile-section">
                <div class="section-header">
                  <h3>基本信息</h3>
                </div>
                
                <div class="info-grid">
                  <!-- 用户名 -->
                  <div class="info-item">
                    <div class="info-label">用户名</div>
                    <div class="info-content">
                      <span>{{ user.username }}</span>
                      <NButton 
                        size="small" 
                        quaternary 
                        @click="openNameModal"
                        class="edit-button"
                      >
                        修改
                      </NButton>
                    </div>
                  </div>
                  
                  <!-- 邮箱 -->
                  <div class="info-item">
                    <div class="info-label">邮箱</div>
                    <div class="info-content">
                      <span>{{ user.email || '未设置' }}</span>
                      <NButton 
                        size="small" 
                        quaternary 
                        @click="openEmailModal"
                        class="edit-button"
                      >
                        修改
                      </NButton>
                    </div>
                  </div>
                  
                  <!-- 电话 -->
                  <div class="info-item">
                    <div class="info-label">电话</div>
                    <div class="info-content">
                      <span>{{ user.phone || '未设置' }}</span>
                      <NButton 
                        size="small" 
                        quaternary 
                        @click="openPhoneModal"
                        class="edit-button"
                      >
                        修改
                      </NButton>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 安全信息 -->
              <div class="profile-section">
                <div class="section-header">
                  <h3>安全设置</h3>
                </div>
                
                <div class="info-grid">
                  <!-- 密码 -->
                  <div class="info-item wide">
                    <div class="info-label">密码</div>
                    <div class="info-content">
                      <span>••••••••</span>
                      <NButton 
                        size="small" 
                        quaternary 
                        type="warning"
                        @click="openPasswordModal"
                        class="edit-button"
                      >
                        修改密码
                      </NButton>
                    </div>
                  </div>
                </div>
              </div>
            </NSpace>
          </div>
        </div>
        <div v-else class="profile-loading">
          正在加载用户信息...
        </div>
      </NCard>
    </NSpace>
    
    <!-- 修改用户名模态框 -->
    <NModal v-model:show="showNameModal" preset="card" title="修改用户名" style="width: 450px;">
      <NForm 
        ref="nameFormRef" 
        :model="nameForm" 
        :rules="nameRules"
        label-placement="left"
        label-width="80"
      >
        <NFormItem label="用户名" path="username">
          <NInput v-model:value="nameForm.username" placeholder="请输入新用户名" />
        </NFormItem>
      </NForm>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <NButton @click="showNameModal = false">取消</NButton>
          <NButton type="primary" @click="submitNameForm" :loading="submitting">
            确认
          </NButton>
        </div>
      </template>
    </NModal>
    
    <!-- 修改邮箱模态框 -->
    <NModal v-model:show="showEmailModal" preset="card" title="修改邮箱" style="width: 450px;">
      <NForm 
        ref="emailFormRef" 
        :model="emailForm" 
        :rules="emailRules"
        label-placement="left"
        label-width="80"
      >
        <NFormItem label="邮箱" path="email">
          <NInput v-model:value="emailForm.email" placeholder="请输入新邮箱" />
        </NFormItem>
      </NForm>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <NButton @click="showEmailModal = false">取消</NButton>
          <NButton type="primary" @click="submitEmailForm" :loading="submitting">
            确认
          </NButton>
        </div>
      </template>
    </NModal>
    
    <!-- 修改手机号模态框 -->
    <NModal v-model:show="showPhoneModal" preset="card" title="修改手机号" style="width: 450px;">
      <NForm 
        ref="phoneFormRef" 
        :model="phoneForm" 
        :rules="phoneRules"
        label-placement="left"
        label-width="80"
      >
        <NFormItem label="手机号" path="phone">
          <NInput v-model:value="phoneForm.phone" placeholder="请输入新手机号" />
        </NFormItem>
      </NForm>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <NButton @click="showPhoneModal = false">取消</NButton>
          <NButton type="primary" @click="submitPhoneForm" :loading="submitting">
            确认
          </NButton>
        </div>
      </template>
    </NModal>
    
    <!-- 修改密码模态框 -->
    <NModal v-model:show="showPasswordModal" preset="card" title="修改密码" style="width: 450px;">
      <NForm 
        ref="passwordFormRef" 
        :model="passwordForm" 
        :rules="passwordRules"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="当前密码" path="oldPassword">
          <NInput 
            v-model:value="passwordForm.oldPassword" 
            type="password" 
            placeholder="请输入当前密码" 
            show-password-on="click"
          />
        </NFormItem>
        
        <NFormItem label="新密码" path="newPassword">
          <NInput 
            v-model:value="passwordForm.newPassword" 
            type="password" 
            placeholder="请输入新密码" 
            show-password-on="click"
          />
        </NFormItem>
        
        <NFormItem label="确认新密码" path="confirmPassword">
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
          <NButton type="primary" @click="submitPasswordForm" :loading="submitting">
            确认
          </NButton>
        </div>
      </template>
    </NModal>
    
    <!-- 上传头像模态框 -->
    <NModal v-model:show="showAvatarModal" preset="card" title="更新头像" style="width: 500px;">
      <NSpin :show="avatarUploading">
        <div class="avatar-upload-container">
          <!-- 隐藏的文件输入框 -->
          <input 
            type="file" 
            ref="fileInputRef"
            accept="image/jpeg,image/png,image/gif" 
            style="display: none"
            @change="handleFileChange"
          />
          
          <div v-if="!imagePreviewUrl" class="avatar-dropzone" @click="triggerFileSelection">
            <NIcon size="48"><CloudUploadOutline /></NIcon>
            <p class="upload-text">点击选择图片上传</p>
            <p class="upload-hint">支持 JPG、PNG、GIF 格式，大小不超过5MB</p>
          </div>
          <div v-else class="avatar-preview-container">
            <NImage
              :src="imagePreviewUrl"
              object-fit="contain"
              class="avatar-preview"
            />
            <div class="avatar-preview-actions">
              <NButton size="small" @click="resetFileSelection">
                重新选择
              </NButton>
            </div>
          </div>
        </div>
      </NSpin>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <NButton @click="showAvatarModal = false">取消</NButton>
          <NButton 
            type="primary" 
            @click="submitAvatarUpload" 
            :loading="avatarUploading"
            :disabled="!previewFile"
          >
            上传并设置
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.profile-container {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.profile-content {
  width: 100%;
}

.profile-header-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
}

.profile-title {
  display: flex;
  flex-direction: column;
}

.profile-title h2 {
  margin: 0;
  font-size: 24px;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--primary-color);
}

.profile-section {
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 16px 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.info-item {
  padding: 8px 0;
}

.info-item.wide {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 14px;
  margin-bottom: 8px;
}

.info-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
}

.edit-button {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.info-content:hover .edit-button {
  opacity: 1;
}

.profile-loading {
  text-align: center;
  padding: 40px;
}

/* 头像相关样式 */
.avatar-container {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
  cursor: pointer;
}

.avatar-container:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay span {
  font-size: 12px;
  margin-top: 4px;
}

.avatar-upload-container {
  min-height: 200px;
}

.upload-text {
  margin: 12px 0 4px;
  font-size: 16px;
}

.upload-hint {
  font-size: 12px;
}

.avatar-preview-container {
  position: relative;
  width: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.avatar-preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
}

.avatar-preview-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.avatar-dropzone {
  border: 2px dashed #d9d9d9;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.avatar-dropzone:hover {
  border-color: var(--primary-color);
}
</style> 