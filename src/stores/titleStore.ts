import {defineStore} from 'pinia'
import {ref} from 'vue'

// 创建并导出标题存储
export const useTitleStore = defineStore('title', () => {
    // 状态
    const title = ref('首页')

    // 设置标题的方法
    function setTitle(newTitle: string) {
        title.value = newTitle
    }

    return {
        title,
        setTitle
    }
}) 