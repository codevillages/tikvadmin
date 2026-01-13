package models

// KeyValuePair 键值对
type KeyValuePair struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// CreateKVRequest 创建键值对请求
type CreateKVRequest struct {
	Key   string `json:"key" binding:"required"`
	Value string `json:"value" binding:"required"`
	Type  string `json:"type" binding:"required,oneof=rawkv txn"`
}

// UpdateKVRequest 更新键值对请求
type UpdateKVRequest struct {
	Key   string `json:"key" binding:"required"`
	Value string `json:"value" binding:"required"`
	Type  string `json:"type" binding:"required,oneof=rawkv txn"`
}

// DeleteKVRequest 删除键值对请求
type DeleteKVRequest struct {
	Keys []string `json:"keys" binding:"required,min=1"`
	Type string   `json:"type" binding:"required,oneof=rawkv txn"`
}

// BatchOperationRequest 批量操作请求
type BatchOperationRequest struct {
	Operations []Operation `json:"operations" binding:"required,min=1"`
}

// Operation 单个操作
type Operation struct {
	Type  string `json:"type" binding:"required,oneof=rawkv txn"`
	Key   string `json:"key" binding:"required"`
	Value string `json:"value,omitempty"`
}

// AtomicTransactionRequest 原子事务请求
type AtomicTransactionRequest struct {
	Operations []AtomicOperation `json:"operations" binding:"required,min=1"`
}

// AtomicOperation 原子操作
type AtomicOperation struct {
	Type  string `json:"type" binding:"required,oneof=put delete"`
	Key   string `json:"key" binding:"required"`
	Value string `json:"value,omitempty"`
}

// QueryOptions 查询选项
type QueryOptions struct {
	Prefix string `form:"prefix"`
	Page   int    `form:"page,default=1" binding:"min=1"`
	Limit  int    `form:"limit,default=20" binding:"min=1,max=100"`
	Type   string `form:"type" binding:"required,oneof=rawkv txn"`
}

// PaginatedResult 分页结果
type PaginatedResult struct {
	Data      []KeyValuePair `json:"data"`
	Total     int            `json:"total"`
	Page      int            `json:"page"`
	Limit     int            `json:"limit"`
	TotalPages int           `json:"totalPages"`
}

// ApiResponse API 响应
type ApiResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// BatchOperationResponse 批量操作响应
type BatchOperationResponse struct {
	Success     bool                      `json:"success"`
	Message     string                    `json:"message"`
	Data        BatchOperationData        `json:"data,omitempty"`
}

// BatchOperationData 批量操作数据
type BatchOperationData struct {
	Results     []BatchOperationResult `json:"results"`
	SuccessCount int                   `json:"successCount"`
	FailureCount int                   `json:"failureCount"`
}

// BatchOperationResult 批量操作结果
type BatchOperationResult struct {
	Key      string `json:"key"`
	Success  bool   `json:"success"`
	Operation string `json:"operation"`
	Error    string `json:"error,omitempty"`
}

// AtomicTransactionResponse 原子事务响应
type AtomicTransactionResponse struct {
	Success bool `json:"success"`
	Message string `json:"message"`
	Data    AtomicTransactionData `json:"data,omitempty"`
}

// AtomicTransactionData 原子事务数据
type AtomicTransactionData struct {
	OperationCount int `json:"operationCount"`
}

// TiKVStats TiKV 统计信息
type TiKVStats struct {
	RawKV RawKVStats `json:"rawkv"`
	Txn   TxnStats   `json:"txn"`
	Overall OverallStats `json:"overall"`
}

// RawKVStats RawKV 统计
type RawKVStats struct {
	SampleKeys int  `json:"sampleKeys"`
	Connected   bool `json:"connected"`
}

// TxnStats Txn 统计
type TxnStats struct {
	SampleKeys int  `json:"sampleKeys"`
	Connected   bool `json:"connected"`
}

// OverallStats 整体统计
type OverallStats struct {
	Connected   bool   `json:"connected"`
	APIVersion  string `json:"apiVersion"`
	Mode        string `json:"mode"`
}

// ClusterStatus 集群状态
type ClusterStatus struct {
	Connected    bool   `json:"connected"`
	Mode         string `json:"mode"`
	Endpoints    []string `json:"endpoints"`
	APIVersion   string `json:"apiVersion"`
	ClusterInfo  *ClusterInfo `json:"clusterInfo,omitempty"`
}

// ClusterInfo 集群信息
type ClusterInfo struct {
	RegionID string `json:"regionId"`
	Leader   string `json:"leader"`
	Peers    int    `json:"peers"`
}