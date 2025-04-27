<script setup lang="ts">
import { ref, onMounted, watch, nextTick, defineProps, onUnmounted, computed } from 'vue';
import { useElementSize } from '@vueuse/core';
import { formatTimestamp, extractDataPoints } from './utils';
import type { BaseDeviceRecordEntity, DeviceDescriptionField } from '../../api/types';
import { NDivider, NText } from 'naive-ui';

const props = defineProps<{
  records: BaseDeviceRecordEntity[];
  fieldName: string;
  displayName?: string;
  deviceDesc?: DeviceDescriptionField[];
  title?: string;
}>();

const chartRef = ref<HTMLDivElement | null>(null);
const { width } = useElementSize(chartRef);
let chart: any = null;

// 获取显示名称
const displayTitle = computed(() => {
  return props.title || props.displayName || props.fieldName;
});

// 初始化图表
function initChart() {
  if (!chartRef.value) return;
  
  // 动态导入echarts避免SSR问题
  import('echarts').then((echarts) => {
    // 销毁旧的图表实例
    if (chart) {
      chart.dispose();
    }
    
    // 创建新的图表实例
    chart = echarts.init(chartRef.value);
    
    updateChart();
    
    // 监听窗口大小变化，调整图表大小
    window.addEventListener('resize', () => {
      chart?.resize();
    });
  });
}

// 更新图表数据
function updateChart() {
  if (!chart) return;
  
  // 从记录中提取数据点
  const dataPoints = extractDataPoints(props.records, props.fieldName);
  
  // 按时间升序排序
  dataPoints.sort((a, b) => a[0] - b[0]);
  
  // 分离x轴和y轴数据
  const xData = dataPoints.map(point => formatTimestamp(point[0]));
  const yData = dataPoints.map(point => point[1]);
  
  // 设置图表选项
  const options = {
    title: {
      text: displayTitle.value,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const param = params[0];
        return `${param.name}<br />${displayTitle.value}: ${param.value}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        rotate: 45,
        overflow: 'truncate',
      }
    },
    yAxis: {
      type: 'value',
      name: displayTitle.value
    },
    series: [
      {
        name: displayTitle.value,
        type: 'line',
        data: yData,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2
        }
      }
    ]
  };
  
  // 应用图表选项
  chart.setOption(options);
}

// 监听记录变化
watch(() => props.records, () => {
  nextTick(() => {
    updateChart();
  });
}, { deep: true });

// 监听容器宽度变化
watch(width, () => {
  nextTick(() => {
    chart?.resize();
  });
});

// 组件挂载时初始化图表
onMounted(() => {
  nextTick(() => {
    initChart();
  });
});

// 组件卸载时销毁图表
onUnmounted(() => {
  if (chart) {
    chart.dispose();
    chart = null;
  }
});
</script>

<template>
  <div class="number-chart-container">
    <NDivider v-if="title">
      <NText>{{ displayTitle }}</NText>
    </NDivider>
    <div ref="chartRef" class="chart-wrapper"></div>
  </div>
</template>

<style scoped>
.number-chart-container {
  width: 100%;
}
.chart-wrapper {
  width: 100%;
  height: 300px;
}
</style> 