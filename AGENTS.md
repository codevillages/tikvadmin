# Repository Guidelines

## Agent Communication

- Use Chinese for all communication in this repository.

## Project Structure & Module Organization

- `backend-go/` contains the Go API server and TiKV client integration; entrypoint is `backend-go/main.go`.
- `frontend/` holds the React + Vite UI (TypeScript) plus Tailwind config and static build output in `frontend/dist/`.
- `Dockerfile` builds a combined image (Go backend + Nginx-hosted frontend).
- `docker-compose.yml` runs the built image; `nginx.conf` configures the static frontend.

## Backend-Go 目录结构与文件说明

- `backend-go/` Go 后端源码与构建产物根目录。
- `backend-go/main.go` Gin 入口与路由/处理函数定义，负责初始化 TiKV 客户端与 API 暴露。
- `backend-go/go.mod` Go 模块定义与依赖版本声明。
- `backend-go/go.sum` Go 依赖校验与锁定文件。
- `backend-go/README.md` 后端配置说明（PD endpoints 等配置方式）。
- `backend-go/txn_test.go` 事务模式的集成测试样例（写入与扫描验证）。
- `backend-go/tikv-backend` 已编译的后端二进制产物。
- `backend-go/config/` 配置加载模块目录。
- `backend-go/config/config.go` 读取配置文件与环境变量并提供 PD endpoints。
- `backend-go/pkg/` 后端核心业务模块目录。
- `backend-go/pkg/api/` API 路由与控制器目录。
- `backend-go/pkg/api/routes.go` 组装 Gin 路由与注册 API/健康检查。
- `backend-go/pkg/api/handlers.go` KVController 处理 CRUD、批量、事务与统计/集群状态接口。
- `backend-go/pkg/models/` API 请求/响应模型与类型定义目录。
- `backend-go/pkg/models/types.go` 请求体、响应体、分页与状态结构体定义。
- `backend-go/pkg/tikv/` TiKV 客户端封装与数据访问目录。
- `backend-go/pkg/tikv/client.go` RawKV/Txn 客户端创建与全局实例管理。
- `backend-go/pkg/tikv/init.go` TiKV 客户端初始化、关闭与连接状态判断。
- `backend-go/pkg/tikv/dao.go` RawKV/TxnKV 访问封装与键前缀隔离逻辑。

## Frontend 目录结构与文件说明

- `frontend/` 前端应用根目录。
- `frontend/index.html` Vite 应用 HTML 入口模板。
- `frontend/package.json` 前端依赖与脚本定义。
- `frontend/package-lock.json` 依赖锁定文件。
- `frontend/tsconfig.json` 前端 TypeScript 配置。
- `frontend/tsconfig.node.json` Node/Vite 相关的 TypeScript 配置。
- `frontend/vite.config.ts` Vite 构建与插件配置。
- `frontend/tailwind.config.js` Tailwind 主题与扫描路径配置。
- `frontend/postcss.config.js` PostCSS 配置。
- `frontend/.claude/settings.local.json` 本地工具配置文件（不影响构建）。
- `frontend/dist/` 前端构建产物目录（静态文件输出）。
- `frontend/node_modules/` 前端依赖安装目录（第三方包）。
- `frontend/src/` 前端源码目录。
- `frontend/src/main.tsx` React 应用挂载入口。
- `frontend/src/App.tsx` 应用主页面布局与状态管理（健康检查、标签切换）。
- `frontend/src/index.css` 全局样式与字体/主题变量。
- `frontend/src/vite-env.d.ts` Vite 环境类型声明。
- `frontend/src/types/index.ts` API 请求/响应与业务类型定义。
- `frontend/src/services/api.ts` Axios 封装的后端 API 调用层。
- `frontend/src/lib/utils.ts` Tailwind class 合并工具函数。
- `frontend/src/components/` 业务组件目录。
- `frontend/src/components/KVTable.tsx` KV 列表、分页、CRUD、批量删除与对话框交互。
- `frontend/src/components/BatchOperations.tsx` 批量操作与原子事务提交界面。
- `frontend/src/components/ClusterStatus.tsx` 集群统计/状态卡片展示组件。
- `frontend/src/components/FormJSONEditor.tsx` JSON 文本编辑与格式化 Monaco 编辑器。
- `frontend/src/components/ui/` 基础 UI 组件封装目录（Radix + Tailwind）。
- `frontend/src/components/ui/alert-dialog.tsx` AlertDialog 组件封装。
- `frontend/src/components/ui/badge.tsx` Badge 组件封装与样式变体。
- `frontend/src/components/ui/button.tsx` Button 组件封装与样式变体。
- `frontend/src/components/ui/card.tsx` Card 容器组件封装。
- `frontend/src/components/ui/dialog.tsx` Dialog 组件封装。
- `frontend/src/components/ui/input.tsx` Input 表单组件封装。
- `frontend/src/components/ui/label.tsx` Label 表单标签组件封装。
- `frontend/src/components/ui/separator.tsx` 分隔线组件封装。
- `frontend/src/components/ui/switch.tsx` Switch 开关组件封装。
- `frontend/src/components/ui/table.tsx` Table 表格组件封装。
- `frontend/src/components/ui/tabs.tsx` Tabs 标签页组件封装。
- `frontend/src/components/ui/textarea.tsx` Textarea 文本域组件封装。

## Build, Test, and Development Commands

- `make build`: build a multi-arch Docker image and save it as `tikvadmin.tar`.
- `make buildlocal`: build a local Docker image named `tikvadmin:latest`.
- `make runlocal`: run the container on port `3002`.
- `docker-compose up --build`: build and run the combined service.
- `cd backend-go && go run .`: run the backend locally.
- `cd frontend && npm run dev`: start the Vite dev server.
- `cd frontend && npm run build`: type-check and build the frontend.

## Coding Style & Naming Conventions

- Go code follows standard `gofmt` formatting and idiomatic Go naming.
- Frontend uses TypeScript + React; prefer `PascalCase` for components (e.g., `KVTable.tsx`) and `camelCase` for hooks and utilities.
- Use existing linting: `cd frontend && npm run lint`.

## Testing Guidelines

- Backend tests are Go tests (example: `backend-go/txn_test.go`).
- Run `cd backend-go && go test ./...` before changes that affect the backend.
- No frontend test runner is configured; focus on linting and manual UI checks.

## Commit & Pull Request Guidelines

- Git history is minimal and does not show a consistent commit message convention; keep messages clear and action-oriented (e.g., "Add batch delete API").
- PRs should include a short description, test/verification notes, and screenshots for UI changes.

## Configuration & Environment

- Backend configuration supports `TIKV_PD_ENDPOINTS` or a JSON config file; see `backend-go/README.md`.
- When running locally, verify TiKV/PD endpoints and ports are reachable before testing.
