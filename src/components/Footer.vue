<script lang="ts" setup>
import {NLayoutFooter, NText} from 'naive-ui'
</script>

<template>
  <NLayoutFooter bordered class="footer">
    <NText>© {{ new Date().getFullYear() }} 桂林昊明喷涂设备有限公司  保留所有权利。</NText>
  </NLayoutFooter>
</template>

<style scoped>
.footer {
  height: 48px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style> 