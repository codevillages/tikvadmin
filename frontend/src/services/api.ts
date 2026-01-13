import axios from 'axios';
import {
  KeyValuePair,
  CreateKVRequest,
  UpdateKVRequest,
  DeleteKVRequest,
  QueryOptions,
  PaginatedResult,
  ApiResponse,
  StatsResponse,
  BatchOperationRequest,
  BatchOperationResponse,
  AtomicTransactionRequest,
  AtomicTransactionResponse,
  ClusterStatusResponse,
  TiKVMode
} from '../types';

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '', // 使用相对路径，通过nginx反向代理
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API 服务类
export class TiKVApiService {
  // 健康检查
  static async healthCheck(): Promise<void> {
    await api.get('/health');
  }

  // 获取单个键值对
  static async getKV(key: string, type: TiKVMode = 'rawkv'): Promise<string> {
    const response = await api.get<ApiResponse<string | KeyValuePair>>(
      `/api/kv/${encodeURIComponent(key)}?type=${type}`
    );
    const payload = response.data.data;

    if (!response.data.success || payload === undefined || payload === null) {
      throw new Error(response.data.message || 'Failed to get key');
    }

    if (typeof payload === 'string') {
      return payload;
    }

    if (typeof payload === 'object' && 'value' in payload) {
      return payload.value ?? '';
    }

    throw new Error(response.data.message || 'Unexpected getKV response');
  }

  // 扫描键值对（支持前缀检索和分页）
  static async scanKVs(options: QueryOptions): Promise<PaginatedResult<KeyValuePair>> {
    const params = new URLSearchParams();

    if (options.prefix !== undefined) {
      params.append('prefix', options.prefix);
    }
    if (options.page) {
      params.append('page', options.page.toString());
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options.type) {
      params.append('type', options.type);
    }

    const url = params.toString() ? `/api/kv?${params.toString()}` : '/api/kv';
    const response = await api.get<ApiResponse<PaginatedResult<KeyValuePair>>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to scan keys');
    }

    return response.data.data;
  }

  // 创建键值对
  static async createKV(request: CreateKVRequest): Promise<void> {
    const response = await api.post<ApiResponse>('/api/kv', request);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to create key');
    }
  }

  // 更新键值对
  static async updateKV(request: UpdateKVRequest): Promise<void> {
    const response = await api.put<ApiResponse>('/api/kv', request);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update key');
    }
  }

  // 删除单个键值对
  static async deleteKV(key: string, type: TiKVMode = 'rawkv'): Promise<void> {
    const response = await api.delete<ApiResponse>(`/api/kv/${encodeURIComponent(key)}?type=${type}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete key');
    }
  }

  // 批量删除键值对
  static async batchDeleteKVs(request: DeleteKVRequest): Promise<{ deletedCount: number; notFoundCount: number }> {
    const response = await api.delete<ApiResponse<{ deletedCount: number; notFoundCount: number }>>('/api/kv', {
      data: request
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to batch delete keys');
    }

    return response.data.data;
  }

  // 批量操作（支持混合 RawKV 和 Txn 操作）
  static async batchOperations(request: BatchOperationRequest): Promise<BatchOperationResponse> {
    const response = await api.post<ApiResponse<BatchOperationResponse>>('/api/kv/batch', request);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to execute batch operations');
    }

    return response.data.data;
  }

  // 原子事务操作（仅支持 Txn 模式）
  static async atomicTransaction(request: AtomicTransactionRequest): Promise<AtomicTransactionResponse> {
    const response = await api.post<ApiResponse<AtomicTransactionResponse>>('/api/kv/transaction', request);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to execute atomic transaction');
    }

    return response.data.data;
  }

  // 获取统计信息
  static async getStats(): Promise<StatsResponse> {
    const response = await api.get<ApiResponse<StatsResponse>>('/api/kv/stats');

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to get stats');
    }

    return response.data.data;
  }

  // 获取集群状态
  static async getClusterStatus(): Promise<ClusterStatusResponse> {
    const response = await api.get<ApiResponse<ClusterStatusResponse>>('/api/kv/cluster');

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to get cluster status');
    }

    return response.data.data;
  }

  // 更新集群 PD 地址
  static async updateClusterEndpoints(endpoints: string): Promise<ClusterStatusResponse> {
    const response = await api.put<ApiResponse<ClusterStatusResponse>>('/api/kv/cluster/endpoints', {
      endpoints
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update cluster endpoints');
    }

    return response.data.data;
  }

  // 删除所有键值对
  static async deleteAllKVs(type: TiKVMode = 'rawkv'): Promise<{ deletedCount: number; type: string }> {
    const response = await api.delete<ApiResponse<{ deletedCount: number; type: string }>>(`/api/kv/all?type=${type}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to delete all keys');
    }

    return response.data.data;
  }
}

export default TiKVApiService;
