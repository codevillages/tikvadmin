# 快速开始指南

## 🚀 一键启动

```bash
# 克隆或下载项目后，在项目根目录执行：
./start.sh
```

这将自动启动：
- TiKV 集群（1个PD + 3个TiKV节点）
- Node.js 后端服务（端口3001）
- React 前端服务（端口3000）

## 📋 启动脚本选项

```bash
# 启动所有服务
./start.sh start

# 停止所有服务
./start.sh stop

# 重启所有服务
./start.sh restart

# 查看服务状态
./start.sh status

# 查看服务日志
./start.sh logs

# 清理所有数据（危险操作）
./start.sh clean

# 显示帮助信息
./start.sh help
```

## 🌐 访问地址

- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/health

## 📊 功能特性

### 🔹 基础 CRUD 操作
- ✅ 创建键值对
- ✅ 查询键值对
- ✅ 更新键值对
- ✅ 删除键值对

### 🔹 高级功能
- ✅ 前缀检索：快速定位特定前缀的数据
- ✅ 分页查询：支持大数据量的分页浏览
- ✅ 批量删除：选择多条记录进行批量删除
- ✅ 实时统计：显示总数据量和连接状态

### 🔹 用户体验
- 🎨 现代化界面设计
- 📱 响应式布局，支持移动端
- ⚡ 快速搜索和过滤
- 🔄 实时数据刷新

## 🛠️ 技术架构

### 后端技术栈
- **Node.js** + **Express.js** - 服务端框架
- **TypeScript** - 类型安全
- **@tikv/client** - TiKV v2 API 客户端
- **Joi** - 数据验证
- **CORS** - 跨域支持

### 前端技术栈
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Ant Design** - UI 组件库
- **Vite** - 构建工具
- **Axios** - HTTP 客户端

### 基础设施
- **TiKV v7.5.0** - 分布式数据库
- **Docker** + **Docker Compose** - 容器化部署
- **Nginx** - 前端服务代理

## 📝 API 文档

### 基础 CRUD

#### 获取键值对
```http
GET /api/kv/:key
```

#### 扫描键值对（支持分页和前缀检索）
```http
GET /api/kv?prefix=user&page=1&limit=20
```

#### 创建键值对
```http
POST /api/kv
Content-Type: application/json

{
  "key": "user:1001",
  "value": "{\"name\":\"张三\",\"age\":25}"
}
```

#### 更新键值对
```http
PUT /api/kv
Content-Type: application/json

{
  "key": "user:1001",
  "value": "{\"name\":\"张三\",\"age\":26}"
}
```

#### 删除单个键值对
```http
DELETE /api/kv/:key
```

#### 批量删除键值对
```http
DELETE /api/kv
Content-Type: application/json

{
  "keys": ["user:1001", "user:1002"]
}
```

### 查询参数

- `prefix` - 前缀过滤
- `page` - 页码（从1开始）
- `limit` - 每页数量（最大100）

### 响应格式

```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "data": [
      {
        "key": "user:1001",
        "value": "{\"name\":\"张三\",\"age\":25}"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

## 🔧 环境配置

### 后端环境变量（backend/.env）
```env
# 服务配置
PORT=3001
NODE_ENV=development

# TiKV 配置
TIKV_ADDRESSES=127.0.0.1:20160,127.0.0.1:20161,127.0.0.1:20162
TIKV_PD_ADDRESSES=127.0.0.1:2379

# 前端地址
FRONTEND_URL=http://localhost:3000
```

### 前端环境变量（frontend/.env）
```env
# API 配置
VITE_API_URL=http://localhost:3001

# TiKV 配置
VITE_TIKV_ENDPOINTS=127.0.0.1:2379
VITE_TIKV_PD_ENDPOINTS=127.0.0.1:2379
```

## 🐳 Docker 部署

项目使用 Docker Compose 进行容器化部署，包含以下服务：

- `pd` - TiKV Placement Driver（端口2379）
- `tikv-1` - TiKV 节点1（端口20160）
- `tikv-2` - TiKV 节点2（端口20161）
- `tikv-3` - TiKV 节点3（端口20162）
- `backend` - Node.js 后端服务（端口3001）
- `frontend` - React 前端服务（端口3000）

## 🔍 故障排除

### 端口冲突
如果遇到端口被占用的情况：
1. 停止占用端口的进程
2. 修改 docker-compose.yml 中的端口映射
3. 重新启动服务

### TiKV 连接失败
1. 检查 TiKV 容器是否正常运行：`docker-compose ps`
2. 查看 TiKV 日志：`docker-compose logs tikv-1`
3. 检查 PD 是否就绪：`curl http://localhost:2379/health`

### 服务无法访问
1. 检查容器是否启动：`docker-compose ps`
2. 查看服务日志：`docker-compose logs backend` 或 `docker-compose logs frontend`
3. 检查防火墙设置

### 数据持久化
项目使用 Docker 数据卷持久化 TiKV 数据：
- `pd_data` - PD 数据
- `tikv1_data` - TiKV 节点1数据
- `tikv2_data` - TiKV 节点2数据
- `tikv3_data` - TiKV 节点3数据

## 📞 技术支持

如遇到问题，请：
1. 查看容器日志：`./start.sh logs`
2. 检查系统资源：内存、磁盘空间
3. 确认 Docker 版本兼容性

---

**🎉 享受使用 TiKV 数据库管理系统！**