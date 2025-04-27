import {defineStore} from 'pinia'

// 定义接口
interface CommonState {
    name: string
}

// 创建并导出存储
export const useCommonStore = defineStore('common', {
    // 状态
    state: (): CommonState => ({
        name: '默认名称',
    }),

    // getters
    getters: {},

    // actions
    actions: {}
}) 