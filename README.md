# TiKV 数据库管理系统

一个现代化的 TiKV 数据库管理界面，支持 RawKV 和 Transaction 两种操作模式，基于 TiKV v2 API 构建，提供完整的 CRUD 操作、前缀检索、批量操作和原子事务功能。

## ✨ 功能特性

- **🔧 双模式支持**：同时支持 RawKV（直接 KV 操作）和 Transaction（事务操作）两种模式
- **🔍 前缀搜索**：支持按前缀模糊搜索键值对
- **📄 分页查询**：大数据量下的高效分页浏览
- **⚡ 批量操作**：支持批量增删改查，提升操作效率
- **🔄 原子事务**：提供 ACID 特性的原子事务操作
- **🏥 集群监控**：实时显示 TiKV 集群状态和连接信息
- **🐳 Docker 支持**：一键启动完整的 TiKV 集群和管理界面
- **📱 响应式设计**：支持桌面和移动设备访问

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web UI        │    │   Backend API   │    │   TiKV Cluster  │
│                 │    │                 │    │                 │
│  - RawKV 操作   │◄──►│  - Express.js   │◄──►│  - PD (x1)      │
│  - Txn 操作     │    │  - TiKV Client  │    │  - TiKV (x3)    │
│  - 批量操作     │    │  - API v2       │    │  - v2 API       │
│  - 集群监控     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 快速开始

### 使用 Docker Compose（推荐）

1. **克隆项目**
```bash
git clone <repository-url>
cd tikvdemo
```

2. **确保 TiKV 集群可用**
- 确保现有的 TiKV 集群在以下地址可访问：`172.16.0.10:2379`, `172.16.0.20:2379`, `172.16.0.30:2379`

3. **一键启动**
```bash
chmod +x start.sh
./start.sh
```

4. **访问应用**
- 前端界面：http://localhost:3002
- 后端 API：http://localhost:3001
- 健康检查：http://localhost:3001/health

### 手动启动

1. **启动后端服务**
```bash
cd backend
npm install
npm run build
# 设置环境变量指向你的 TiKV 集群
export TIKV_ADDRESSES=172.16.0.10:2379,172.16.0.20:2379,172.16.0.30:2379
export TIKV_PD_ADDRESSES=172.16.0.10:2379,172.16.0.20:2379,172.16.0.30:2379
npm start
```

2. **启动前端服务**
```bash
cd frontend
npm install
npm run build
npm start
```

## 📋 使用说明

### RawKV vs Transaction 模式

- **RawKV 模式**：
  - 直接的键值对操作
  - 更高性能，适用于简单读写场景
  - 不支持事务特性

- **Transaction 模式**：
  - 支持 ACID 事务特性
  - 适用于需要原子性的复杂操作
  - 支持多操作原子事务

### 主要功能

1. **键值对管理**
   - 创建、读取、更新、删除键值对
   - 支持大文本值存储
   - 实时表格显示

2. **前缀搜索**
   - 输入前缀快速筛选相关键值对
   - 支持分页浏览搜索结果

3. **批量操作**
   - 混合 RawKV 和 Txn 模式操作
   - 批量执行多个操作
   - 详细的执行结果报告

4. **原子事务**
   - 多个操作的原子性执行
   - 要么全部成功，要么全部失败
   - 仅支持 Transaction 模式

5. **集群监控**
   - 实时显示连接状态
   - 数据统计信息
   - 集群健康检查

## 🔧 API 文档

### 基础 CRUD 操作

| 方法 | 路径 | 描述 | 参数 |
|------|------|------|------|
| GET | `/api/kv` | 扫描键值对 | `prefix?, page?, limit?, type?` |
| GET | `/api/kv/:key` | 获取单个键值对 | `type?` |
| POST | `/api/kv` | 创建键值对 | `key, value, type` |
| PUT | `/api/kv` | 更新键值对 | `key, value, type` |
| DELETE | `/api/kv/:key` | 删除键值对 | `type?` |

### 批量操作

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/kv/batch` | 批量操作（混合模式） |
| POST | `/api/kv/transaction` | 原子事务（Txn 模式） |
| DELETE | `/api/kv` | 批量删除 |

### 状态监控

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/kv/stats` | 获取统计信息 |
| GET | `/api/kv/cluster` | 获取集群状态 |
| GET | `/health` | 健康检查 |

### 参数说明

- `type`: 操作模式，`rawkv` 或 `txn`
- `prefix`: 搜索前缀
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20，最大 100）

## 🐳 Docker 配置

### 服务端口

| 服务 | 端口 | 描述 |
|------|------|------|
| Backend | 3001 | 后端 API 服务 |
| Frontend | 3002 | 前端 Web 界面 |

### 外部依赖

- **TiKV 集群**：连接到现有集群 `172.16.0.10:2379`, `172.16.0.20:2379`, `172.16.0.30:2379`
- **PD 服务**：通过 TiKV 节点访问（默认端口 2379）

## 🛠️ 开发环境

### 技术栈

**后端**：
- Node.js + TypeScript
- Express.js
- @tikv/client (v2 API)
- Joi 数据验证

**前端**：
- React 18 + TypeScript
- Ant Design UI 组件
- Vite 构建工具
- Axios HTTP 客户端

**基础设施**：
- Docker + Docker Compose
- Nginx (前端静态文件服务)
- 外部 TiKV 集群连接

### 本地开发

1. **后端开发**
```bash
cd backend
npm install
npm run dev  # 开发模式（热重载）
```

2. **前端开发**
```bash
cd frontend
npm install
npm run dev  # 开发模式（热重载）
```

3. **环境配置**
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑配置
vim .env
```

## 📝 启动脚本说明

`start.sh` 提供了便捷的管理命令：

```bash
./start.sh start    # 启动应用服务（连接外部 TiKV 集群）
./start.sh stop     # 停止应用服务
./start.sh restart  # 重启应用服务
./start.sh status   # 查看服务状态
./start.sh logs     # 查看服务日志
./start.sh clean    # 停止并删除所有容器
./start.sh help     # 显示帮助信息
```

**注意**：此脚本仅启动前端和后端管理服务，连接到你现有的 TiKV 集群。

## 🔒 安全配置

- CORS 配置限制允许的源
- 请求体大小限制
- 安全头部设置
- 输入数据验证和清理

## 🐛 故障排除

### 常见问题

1. **端口冲突**
   - 检查是否有其他服务占用了 3002、3001 等端口
   - 使用 `lsof -i :3002` 查看端口占用情况

2. **无法连接到外部 TiKV 集群**
   - 确认 TiKV 集群地址是否正确：172.16.0.10:2379, 172.16.0.20:2379, 172.16.0.30:2379
   - 检查网络连接：`telnet 172.16.0.10 2379`
   - 确认 TiKV 集群正常运行并可访问

3. **前端无法访问后端**
   - 检查网络配置
   - 确认 CORS 设置正确
   - 验证环境变量配置

4. **数据操作失败**
   - 确认 TiKV 集群状态健康
   - 检查 API 版本兼容性
   - 查看后端服务日志

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [TiKV](https://tikv.org/) - 分布式事务键值数据库
- [Ant Design](https://ant.design/) - 企业级 UI 设计语言
- [React](https://reactjs.org/) - 用户界面构建库
- [Express.js](https://expressjs.com/) - Web 应用框架

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [FAQ](#故障排除) 部分
2. 搜索现有的 [Issues](../../issues)
3. 创建新的 Issue 描述您的问题

---

**🚀 开始使用 TiKV 数据库管理系统吧！**