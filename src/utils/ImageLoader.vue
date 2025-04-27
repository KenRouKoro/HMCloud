<template>
  <div>
    <img v-if="imageSrc" :src="imageSrc" :style="imageStyle" :alt="alt" />
    <div v-else-if="loading" class="image-loader">
      <span>加载中...</span>
    </div>
    <div v-else class="image-error">
      <span>{{ errorMessage || '图片加载失败' }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { getApiUrl } from '../config';

const props = defineProps({
  imageId: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: '图片'
  },
  width: {
    type: [String, Number],
    default: 'auto'
  },
  height: {
    type: [String, Number],
    default: 'auto'
  }
});

const imageSrc = ref<string | null>(null);
const loading = ref(true);
const errorMessage = ref<string | null>(null);

// 计算样式
const imageStyle = computed(() => {
  return {
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    maxWidth: '100%',
    objectFit: 'contain' as const
  };
});

// 通过XHR加载图片，附带token头
const loadImage = async () => {
  if (!props.imageId) {
    loading.value = false;
    errorMessage.value = 'ID为空';
    return;
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    // 获取token
    const token = localStorage.getItem('glhmauth') || '';
    
    // 使用 axios 获取图片，设置响应类型为blob
    const response = await axios.get(`${getApiUrl()}/image/get?id=${encodeURIComponent(props.imageId)}`, {
      headers: {
        'glhmauth': token
      },
      responseType: 'blob',
      withCredentials: true
    });

    // 创建Blob URL
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    imageSrc.value = URL.createObjectURL(blob);
    loading.value = false;
  } catch (error) {
    console.error('加载图片失败:', error);
    loading.value = false;
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  }
};

onMounted(() => {
  loadImage();
});
</script>

<style scoped>
.image-loader, .image-error {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  min-height: 50px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.image-error {
  background-color: #fff2f0;
  color: #ff4d4f;
}
</style> 