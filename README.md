# 昊明云设备控制平台（HMCLOUD）

一个基于Vue 3的现代化物联网云平台前端项目，用于设备管理、监控和控制。

## 技术栈

- Vue 3.5.13
- TypeScript
- Vite（构建工具）
- Naive UI 2.41.0（UI组件库）
- Pinia 3.0.2（状态管理）
- Vue Router 4（路由管理）
- Axios 1.8.4（HTTP请求）
- TailwindCSS 4.1.4（CSS框架）
- ECharts 5.6.0（数据可视化）
- JSEncrypt 3.3.2（加密工具）
- date-fns 4.1.0（日期处理）
- VueUse 13.1.0（组合式API工具集）

## 项目结构

```
src/
├── api/                # API接口相关
│   ├── index.ts        # API请求函数
│   └── types.ts        # API相关类型定义
├── assets/             # 静态资源
├── components/         # 公共组件
│   ├── Header.vue      # 页头组件
│   ├── Footer.vue      # 页脚组件
│   ├── Sidebar.vue     # 侧边栏组件
│   ├── LoginModal.vue  # 登录模态框
│   └── ...             # 其他组件
├── config/             # 配置文件
├── directives/         # 自定义指令
├── path/               # 页面视图
├── router/             # 路由配置
├── stores/             # Pinia状态存储
├── utils/              # 工具函数
├── App.vue             # 应用视图入口
└── main.ts             # 应用入口
```

## 功能模块

- **用户认证**：登录、登出和权限控制
- **设备管理**：设备增删改查、状态监控
- **设备控制**：设备远程控制和命令发送
- **图片管理**：IoT相关图片资源管理
- **用户管理**：用户账户管理
- **组织管理**：组织和部门管理

## 开发环境设置

### 前置条件

- Node.js 16+
- pnpm 8+

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

## API通信

项目使用封装的request工具（基于axios）与后端通信：
- 自动添加认证Token
- 统一错误处理
- 支持响应拦截（401状态自动跳转登录页）

后端API返回格式：

```typescript
interface BaseResponse<T> {
  code: number;    // 状态码：200成功，500失败
  message: string; // 响应消息
  data: T;         // 响应数据
}
```

## 认证机制

- 使用localStorage和cookie双重存储token
- 登录密码使用RSA加密传输
- token键名：'glhmauth'
- 认证状态在Pinia的authStore中管理
- 认证失效时自动跳转到登录页

## 浏览器兼容性

支持所有现代浏览器（Chrome, Firefox, Edge, Safari）的最新两个版本。
