import {defineStore} from 'pinia'
import {ref} from 'vue'
import {useOsTheme} from 'naive-ui'

// 创建并导出主题存储
export const useThemeStore = defineStore('theme', () => {
  // 获取系统主题
  const osTheme = useOsTheme()
  
  // 状态 - 默认跟随系统主题
  const isLight = ref(osTheme.value != 'dark')
  
  // 切换主题
  function toggleTheme() {
    isLight.value = !isLight.value
  }
  
  // 设置为亮色主题
  function setLightTheme() {
    isLight.value = true
  }
  
  // 设置为暗色主题
  function setDarkTheme() {
    isLight.value = false
  }
  
  return {
    isLight,
    toggleTheme,
    setLightTheme,
    setDarkTheme
  }
}) 