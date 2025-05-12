<script lang="ts" setup>
import { ref, onMounted, h, computed, reactive } from 'vue'
import { useMessage, NButton, NCard, NSpace, NTable, NPopconfirm, NUpload, NUploadDragger, NIcon, NInput, NSpin, NEmpty, NPagination, NModal, NDescriptions, NDescriptionsItem, NProgress, NTooltip, NText, NAlert, NImage } from 'naive-ui'
import { Add24Filled, Delete24Regular, Edit24Regular, Copy24Regular, Image24Regular, Link20Regular } from '@vicons/fluent'
import { CloudUploadOutline, Eye, Share } from '@vicons/ionicons5'
import { imageApi } from '../api'
import type { ImageProjection } from '../api/types'
import request from '@/utils/request'
import { formatFileSize, formatDate } from '../utils/format'
import ImageLoader from '../utils/ImageLoader.vue'

// 辅助函数，用于打开链接
const openInNewTab = (url: string) => {
  window.open(url, '_blank')
}

const message = useMessage()
const loading = ref(false)
const images = ref<ImageProjection[]>([])
const uploadVisible = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const uploadProgress = ref(0)
const isUploading = ref(false)
let progressInterval: number | null = null  // 添加变量声明

// 详情对话框
const showDetailModal = ref(false)
const currentImage = ref<ImageProjection | null>(null)

// 图片列表过滤
const filteredImages = computed(() => {
  if (!searchQuery.value) return images.value
  return images.value.filter(img => 
    img.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 分页显示图片
const paginatedImages = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredImages.value.slice(start, end)
})

// 分页总数
const totalPages = computed(() => {
  return Math.ceil(filteredImages.value.length / pageSize.value)
})

// 获取图片列表
const fetchImages = async () => {
  loading.value = true
  try {
    const response: any = await request.get('image/list')
    
    // response直接就是后端返回的数据，因为已经在request拦截器中处理过
    if (response.code === 200) {
      images.value = response.data
    } else {
      message.error(response.message || '获取图片列表失败')
    }
  } catch (error) {
    message.error('获取图片列表失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    loading.value = false
  }
}

// 删除图片
const deleteImage = async (id: string) => {
  loading.value = true
  try {
    await imageApi.deleteImage(id)
    message.success('删除成功')
    fetchImages() // 刷新列表
  } catch (error) {
    message.error('删除失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    loading.value = false
  }
}

// 复制图片链接
const copyImageUrl = (id: string) => {
  const url = imageApi.getImageUrl(id)
  navigator.clipboard.writeText(url)
    .then(() => message.success('图片链接已复制到剪贴板'))
    .catch(err => message.error('复制失败：' + err))
}

// 查看图片详情
const viewImageDetail = (image: ImageProjection) => {
  currentImage.value = image
  showDetailModal.value = true
}

// 上传文件类型限制
const acceptedFileTypes = '.jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif'

// 文件上传
const handleUpload = async (options: any) => {
  const { file, onFinish, onError, onProgress } = options
  
  // 检查文件类型
  const fileType = file.file.type
  if (!fileType.startsWith('image/')) {
    message.error('只能上传图片文件')
    onError()
    return
  }
  
  try {
    isUploading.value = true
    
    // 模拟上传进度
    progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10
      }
    }, 200)
    
    await imageApi.uploadImage(file.file)
    if (progressInterval) clearInterval(progressInterval)
    uploadProgress.value = 100
    
    message.success('上传成功')
    onFinish()
    fetchImages() // 刷新列表
    
    // 重置上传状态
    setTimeout(() => {
      uploadProgress.value = 0
      isUploading.value = false
    }, 500)
  } catch (error) {
    if (progressInterval) clearInterval(progressInterval)
    uploadProgress.value = 0
    onError()
    message.error('上传失败：' + (error instanceof Error ? error.message : String(error)))
    isUploading.value = false
  }
}

// 切换页码
const handlePageChange = (page: number) => {
  currentPage.value = page
}

// 页面初始化
onMounted(() => {
  fetchImages()
})

// 获取图片的Blob URL (异步，带认证)
const getAuthenticatedImageUrl = async (id: string) => {
  try {
    return await imageApi.getImageBlob(id);
  } catch (error) {
    console.error('获取图片失败:', error);
    message.error('图片加载失败');
    return '';
  }
};

// 图片URL缓存
const imageUrlCache = ref<Record<string, string>>({});

// 获取或加载图片URL
const getOrLoadImageUrl = async (id: string) => {
  if (!imageUrlCache.value[id]) {
    imageUrlCache.value[id] = await getAuthenticatedImageUrl(id);
  }
  return imageUrlCache.value[id];
};
</script>

<template>
  <NCard style="margin: auto; margin-top: 24px; width: 85vw; " title="图像管理" size="medium">
    <NSpin :show="loading">
      <NSpace vertical size="large">
        <!-- 搜索框 和 上传按钮 -->
        <NSpace align="center" justify="space-between">
          <NInput 
            v-model:value="searchQuery" 
            placeholder="搜索图片名称" 
            clearable
            style="width: 300px;"
          >
            <template #prefix>
              <NIcon>
                <Image24Regular />
              </NIcon>
            </template>
          </NInput>
          
          <NSpace>
            <NButton 
              @click="fetchImages" 
              type="primary" 
              ghost
              :loading="loading"
              :disabled="loading"
            >
              <template #icon>
                <NIcon>
                  <Edit24Regular />
                </NIcon>
              </template>
              刷新列表
            </NButton>
            
            <NButton 
              @click="uploadVisible = !uploadVisible" 
              type="primary"
            >
              <template #icon>
                <NIcon>
                  <CloudUploadOutline />
                </NIcon>
              </template>
              {{ uploadVisible ? '关闭上传' : '上传图片' }}
            </NButton>
          </NSpace>
        </NSpace>
        
        <!-- 上传区域 -->
        <div v-if="uploadVisible" class="upload-area">
          <NAlert v-if="!isUploading" type="info" style="margin-bottom: 12px">
            仅支持上传 .jpg, .jpeg, .png, .gif 格式的图片文件
          </NAlert>
          
          <NProgress
            v-if="isUploading"
            type="line"
            :percentage="uploadProgress"
            :indicator-placement="'inside'"
            :show-indicator="true"
            style="margin-bottom: 16px"
          />
          
          <NUpload 
            multiple
            :custom-request="handleUpload"
            :show-file-list="false"
            :accept="acceptedFileTypes"
            :disabled="isUploading"
          >
            <NUploadDragger>
              <div style="padding: 20px 0">
                <NIcon size="48" :depth="3">
                  <CloudUploadOutline />
                </NIcon>
                <div style="margin-top: 12px">
                  <p style="font-size: 16px">点击选择图片上传</p>
                  <p style="font-size: 12px; color: #999">
                    支持的图片格式：.jpg, .jpeg, .png, .gif
                  </p>
                </div>
              </div>
            </NUploadDragger>
          </NUpload>
        </div>
        
        <!-- 图片表格 -->
        <div class="image-table-container">
          <NTable
            :bordered="false"
            :single-line="false"
            size="small"
            striped
          >
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>大小</th>
                <th>上传时间</th>
                <th>预览</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginatedImages" :key="row.id">
                <td :title="row.id">{{ row.id }}</td>
                <td :title="row.name">{{ row.name }}</td>
                <td>{{ row.size ? formatFileSize(row.size) : '-' }}</td>
                <td>{{ row.createTime ? formatDate(row.createTime) : '-' }}</td>
                <td>
                  <NTooltip trigger="hover">
                    <template #trigger>
                      <img
                        v-auth-image="row.id"
                        style="max-height: 100px; max-width: 100px; object-fit: cover; cursor: pointer;"
                        :alt="row.name"
                        @click="viewImageDetail(row)"
                      />
                    </template>
                    点击查看详情
                  </NTooltip>
                </td>
                <td>
                  <NSpace justify="center">
                    <NButton
                      size="small"
                      quaternary
                      type="info"
                      @click="viewImageDetail(row)"
                    >
                      <template #icon>
                        <NIcon><Eye /></NIcon>
                      </template>
                      详情
                    </NButton>
                    <NButton
                      size="small"
                      quaternary
                      type="success"
                      @click="copyImageUrl(row.id)"
                    >
                      <template #icon>
                        <NIcon><Link20Regular /></NIcon>
                      </template>
                      复制链接
                    </NButton>
                    <NPopconfirm @positive-click="deleteImage(row.id)">
                      <template #trigger>
                        <NButton
                          size="small"
                          quaternary
                          type="error"
                        >
                          <template #icon>
                            <NIcon><Delete24Regular /></NIcon>
                          </template>
                          删除
                        </NButton>
                      </template>
                      确定删除此图片吗？此操作不可逆
                    </NPopconfirm>
                  </NSpace>
                </td>
              </tr>
              <tr v-if="paginatedImages.length === 0">
                <td colspan="6">
                  <NEmpty description="暂无图片" />
                </td>
              </tr>
            </tbody>
          </NTable>
        </div>
        
        <!-- 分页 -->
        <div v-if="filteredImages.length > 0" style="display: flex; justify-content: space-between; align-items: center">
          <NText>共 {{ filteredImages.length }} 张图片</NText>
          <NPagination
            v-model:page="currentPage"
            v-model:page-size="pageSize"
            :item-count="filteredImages.length"
            :page-sizes="[10, 20, 50]"
            show-size-picker
            @update:page="handlePageChange"
          />
        </div>
      </NSpace>
    </NSpin>
  </NCard>
  
  <!-- 图片详情对话框 -->
  <NModal
    v-model:show="showDetailModal"
    preset="card"
    title="图片详情"
    style="width: 600px"
  >
    <NSpace vertical size="large">
      <div class="image-preview">
        <img
          v-if="currentImage"
          v-auth-image="currentImage.id"
          style="max-width: 100%; max-height: 300px; object-fit: contain;"
          :alt="currentImage?.name"
        />
      </div>
      
      <NDescriptions bordered label-placement="left" :column="1" v-if="currentImage">
        <NDescriptionsItem label="ID">
          {{ currentImage.id }}
        </NDescriptionsItem>
        <NDescriptionsItem label="名称">
          {{ currentImage.name }}
        </NDescriptionsItem>
        <NDescriptionsItem label="大小">
          {{ currentImage.size ? formatFileSize(currentImage.size) : '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="上传时间">
          {{ currentImage.createTime ? formatDate(currentImage.createTime) : '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="图片链接">
          <NSpace align="center">
            <NText :ellipsis="{ tooltip: true }" style="max-width: 360px">
              {{ currentImage ? imageApi.getImageUrl(currentImage.id) : '' }}
            </NText>
            <NButton 
              tertiary 
              circle 
              size="small" 
              @click="copyImageUrl(currentImage.id)"
            >
              <template #icon>
                <NIcon><Copy24Regular /></NIcon>
              </template>
            </NButton>
          </NSpace>
        </NDescriptionsItem>
      </NDescriptions>
      
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <NButton @click="showDetailModal = false">关闭</NButton>
        <NButton 
          type="primary" 
          @click="currentImage && openInNewTab(imageApi.getImageUrl(currentImage.id))"
        >
          <template #icon>
            <NIcon><Share /></NIcon>
          </template>
          在新窗口打开
        </NButton>
      </div>
    </NSpace>
  </NModal>
</template>

<style scoped>
.upload-area {
  border: 1px dashed #d9d9d9;
  padding: 12px;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #18a058;
}

.image-table-container {
  min-height: 300px;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  border-radius: 4px;
  min-height: 200px;
}
</style> 