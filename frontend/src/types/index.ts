export interface KeyValuePair {
  key: string;
  value: string;
}

export interface CreateKVRequest {
  key: string;
  value: string;
  type: 'rawkv' | 'txn';
}

export interface UpdateKVRequest {
  key: string;
  value: string;
  type: 'rawkv' | 'txn';
}

export interface DeleteKVRequest {
  keys: string[];
  type: 'rawkv' | 'txn';
}

export interface QueryOptions {
  prefix?: string;
  page?: number;
  limit?: number;
  type: 'rawkv' | 'txn';
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface StatsResponse {
  rawkv: {
    sampleKeys: number;
    connected: boolean;
  };
  txn: {
    sampleKeys: number;
    connected: boolean;
  };
  overall: {
    connected: boolean;
    apiVersion: string;
  };
}

export interface BatchOperationRequest {
  operations: Array<{
    type: 'rawkv' | 'txn';
    key: string;
    value?: string;
  }>;
}

export interface BatchOperationResponse {
  results: Array<{
    key: string;
    success: boolean;
    operation: 'put' | 'delete';
    error?: string;
  }>;
  successCount: number;
  failureCount: number;
}

export interface AtomicTransactionRequest {
  operations: Array<{
    type: 'put' | 'delete';
    key: string;
    value?: string;
  }>;
}

export interface AtomicTransactionResponse {
  operationCount: number;
}

export interface ClusterStatusResponse {
  cluster_status: string;
  endpoints: string[];
}

export type TiKVMode = 'rawkv' | 'txn';

export interface MainObjectVersionPart {
  bucket_version_status: number;
  bucket: string;
  src_key: string;
  unique_id: string;
  seaweed_bucket: string;
  seaweed_key: string;
  md5?: string;
  etag?: string;
  size: number;
  part_id: number;
  content_type?: string;
  upload_type: string;
  upload_id: string;
  version_id?: string;
  cluster_id: number;
  storage_class: string;
  soft_delete: number;
  status: number;
  create_time: number;
  last_modified: number;
}

export interface SeaweedKeyMatch {
  key: string;
  part: MainObjectVersionPart;
}

export interface SeaweedKeySearchResponse {
  matches: SeaweedKeyMatch[];
  totalScanned: number;
  decodeErrors?: Array<{
    key: string;
    error: string;
  }>;
}
