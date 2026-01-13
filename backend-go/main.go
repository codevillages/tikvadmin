package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"tikv-backend/pkg/tikv"

	"github.com/gin-gonic/gin"
	"github.com/tikv/client-go/v2/rawkv"
)

var (
	rawKvClient      *tikv.RawKvClient
	txnClient        *tikv.TxnClient
	currentEndpoints []string
	endpointsMu      sync.RWMutex
)

// 通用API响应结构
type ApiResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// 分页结果结构
type PaginatedResult struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"totalPages"`
}

// 键值对结构
type KeyValuePair struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// 统计响应结构
type StatsResponse struct {
	TotalKeys int `json:"total_keys"`
	RawkvKeys int `json:"rawkv_keys"`
	TxnKeys   int `json:"txn_keys"`
}

// 集群状态响应结构
type ClusterStatusResponse struct {
	ClusterStatus string   `json:"cluster_status"`
	Endpoints     []string `json:"endpoints"`
}

type UpdateClusterEndpointsRequest struct {
	Endpoints string `json:"endpoints"`
}

// InitializeTiKVClient 初始化 TiKV 客户端
func InitializeTiKVClient(endpoints []string) error {
	log.Printf("Initializing TiKV client with endpoints: %v", endpoints)

	// 设置超时上下文
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 初始化 RawKV 客户端
	rawClient, err := tikv.NewRawKvClient(ctx, endpoints)
	if err != nil {
		log.Printf("Failed to initialize RawKV client: %v", err)
		return err
	}
	rawKvClient = rawClient

	// 初始化 TxnKV 客户端
	txn, err := tikv.NewTxnClient(ctx, endpoints)
	if err != nil {
		log.Printf("Failed to initialize TxnKV client: %v", err)
		return err
	}
	txnClient = txn

	log.Println("✅ TiKV clients initialized successfully")
	return nil
}

// 获取全局RawKV客户端实例
func getGlobalRawKVClient() *rawkv.Client {
	if rawKvClient == nil {
		return nil
	}
	return tikv.RawKVClient
}

func prefixedKey(key string) []byte {
	return []byte(key)
}

func prefixedRange(prefix string) (startKey, endKey []byte) {
	if prefix != "" {
		startKey = []byte(prefix)
		endKey = append(append([]byte{}, startKey...), 0xFF)
		return startKey, endKey
	}

	startKey = []byte("")
	endKey = []byte{0xFF, 0xFF, 0xFF, 0xFF}
	return startKey, endKey
}

func parseEndpoints(raw string) ([]string, error) {
	parts := strings.Split(raw, ",")
	endpoints := make([]string, 0, len(parts))
	for _, part := range parts {
		endpoint := strings.TrimSpace(part)
		if endpoint == "" {
			continue
		}
		if !strings.Contains(endpoint, ":") {
			return nil, fmt.Errorf("invalid endpoint: %s", endpoint)
		}
		endpoints = append(endpoints, endpoint)
	}
	if len(endpoints) == 0 {
		return nil, fmt.Errorf("endpoints cannot be empty")
	}
	return endpoints, nil
}

func setCurrentEndpoints(endpoints []string) {
	endpointsMu.Lock()
	currentEndpoints = append([]string{}, endpoints...)
	endpointsMu.Unlock()
}

func getCurrentEndpoints() []string {
	endpointsMu.RLock()
	defer endpointsMu.RUnlock()
	return append([]string{}, currentEndpoints...)
}

// CloseTiKVClient 关闭 TiKV 客户端
func CloseTiKVClient() {
	log.Println("Closing TiKV client")
	// TODO: 实现 TiKV 客户端关闭
}

// SetupRouter 设置路由
func SetupRouter() *gin.Engine {
	router := gin.New()

	// 中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS 中间件
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		log.Println("🔥 HEALTH CHECK CALLED - NEW CODE")
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "TiKV Backend is healthy - NEW",
		})
	})
	router.HEAD("/health", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// API 路由组
	api := router.Group("/api/kv")
	{
		api.DELETE("/all", handleDeleteAllKVs)

		// 基本 CRUD 操作
		api.GET("", handleScanKVs)
		api.GET("/:key", handleGetKV)
		api.POST("", handleCreateKV)
		api.PUT("", handleUpdateKV)
		api.DELETE("/:key", handleDeleteKV)

		// 批量操作
		api.POST("/batch", handleBatchOperations)
		api.DELETE("", handleBatchDeleteKVs)

		// 事务操作
		api.POST("/transaction", handleAtomicTransaction)

		// 统计和状态
		api.GET("/stats", handleGetStats)
		api.GET("/cluster", handleGetClusterStatus)
		api.PUT("/cluster/endpoints", handleUpdateClusterEndpoints)
	}

	return router
}

// API 处理函数
func handleScanKVs(c *gin.Context) {
	prefix := c.Query("prefix")
	page := 1
	limit := 100
	kvType := c.Query("type")

	// 解析分页参数
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	ctx := context.Background()
	var kvPairs []KeyValuePair
	var total int
	var err error

	if kvType == "rawkv" && rawKvClient != nil {
		kvPairs, total, err = scanRawKVs(ctx, prefix, page, limit)
	} else if kvType == "txn" && txnClient != nil {
		kvPairs, total, err = scanTxnKVs(ctx, prefix, page, limit)
	} else {
		// 如果没有指定类型或客户端不可用，返回空结果
		kvPairs = []KeyValuePair{}
		total = 0
		err = nil
	}

	if err != nil {
		response := ApiResponse{
			Success: false,
			Message: "Failed to scan keys: " + err.Error(),
			Error:   err.Error(),
		}
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 计算总页数
	totalPages := (total + limit - 1) / limit

	// 构建分页结果
	paginatedResult := PaginatedResult{
		Data:       kvPairs,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	// 返回标准API响应
	response := ApiResponse{
		Success: true,
		Message: "Scan keys successful",
		Data:    paginatedResult,
	}

	c.JSON(http.StatusOK, response)
}

func handleGetKV(c *gin.Context) {
	key := c.Param("key")
	kvData := KeyValuePair{
		Key:   key,
		Value: "",
	}

	response := ApiResponse{
		Success: true,
		Message: "Get key successful",
		Data:    kvData,
	}

	c.JSON(http.StatusOK, response)
}

func handleCreateKV(c *gin.Context) {
	var req struct {
		Key   string `json:"key" binding:"required"`
		Value string `json:"value" binding:"required"`
		Type  string `json:"type"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := ApiResponse{
			Success: false,
			Message: "Invalid request parameters",
			Error:   err.Error(),
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := context.Background()
	var err error
	keyBytes := prefixedKey(req.Key)

	if req.Type == "rawkv" && rawKvClient != nil {
		// 使用 RawKV 模式插入
		err = tikv.RawKVClient.Put(ctx, keyBytes, []byte(req.Value))
	} else if req.Type == "txn" && txnClient != nil {
		// 使用 Transaction 模式插入
		txn, err := txnClient.Begin()
		if err == nil {
			err = txn.Set(keyBytes, []byte(req.Value))
			if err == nil {
				err = txn.Commit(ctx)
			} else {
				txn.Rollback()
			}
		}
	} else {
		response := ApiResponse{
			Success: false,
			Message: "Invalid type or client not available",
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err != nil {
		response := ApiResponse{
			Success: false,
			Message: "Failed to create key: " + err.Error(),
			Error:   err.Error(),
		}
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := ApiResponse{
		Success: true,
		Message: "Create key successful",
	}

	c.JSON(http.StatusOK, response)
}

func handleUpdateKV(c *gin.Context) {
	var req struct {
		Key   string `json:"key" binding:"required"`
		Value string `json:"value" binding:"required"`
		Type  string `json:"type"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := ApiResponse{
			Success: false,
			Message: "Invalid request parameters",
			Error:   err.Error(),
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := context.Background()
	var err error
	keyBytes := prefixedKey(req.Key)

	if req.Type == "rawkv" && rawKvClient != nil {
		// 使用 RawKV 模式更新
		err = tikv.RawKVClient.Put(ctx, keyBytes, []byte(req.Value))
	} else if req.Type == "txn" && txnClient != nil {
		// 使用 Transaction 模式更新
		txn, err := txnClient.Begin()
		if err == nil {
			err = txn.Set(keyBytes, []byte(req.Value))
			if err == nil {
				err = txn.Commit(ctx)
			} else {
				txn.Rollback()
			}
		}
	} else {
		response := ApiResponse{
			Success: false,
			Message: "Invalid type or client not available",
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err != nil {
		response := ApiResponse{
			Success: false,
			Message: "Failed to update key: " + err.Error(),
			Error:   err.Error(),
		}
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := ApiResponse{
		Success: true,
		Message: "Update key successful",
	}

	c.JSON(http.StatusOK, response)
}

func handleDeleteKV(c *gin.Context) {
	key := c.Param("key")
	kvType := c.Query("type")
	keyBytes := prefixedKey(key)

	if kvType == "" {
		response := ApiResponse{
			Success: false,
			Message: "Missing type parameter",
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := context.Background()
	var err error

	if kvType == "rawkv" && rawKvClient != nil {
		// 使用 RawKV 模式删除
		err = tikv.RawKVClient.Delete(ctx, keyBytes)
	} else if kvType == "txn" && txnClient != nil {
		// 使用 Transaction 模式删除
		txn, err := txnClient.Begin()
		if err == nil {
			err = txn.Delete(keyBytes)
			if err == nil {
				err = txn.Commit(ctx)
			} else {
				txn.Rollback()
			}
		}
	} else {
		response := ApiResponse{
			Success: false,
			Message: "Invalid type or client not available",
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err != nil {
		response := ApiResponse{
			Success: false,
			Message: "Failed to delete key: " + err.Error(),
			Error:   err.Error(),
		}
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := ApiResponse{
		Success: true,
		Message: "Delete key successful",
	}

	c.JSON(http.StatusOK, response)
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

// BatchOperationResult 批量操作结果
type BatchOperationResult struct {
	Key       string `json:"key"`
	Operation string `json:"operation"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
}

// BatchOperationData 批量操作数据
type BatchOperationData struct {
	Results      []BatchOperationResult `json:"results"`
	SuccessCount int                    `json:"successCount"`
	FailureCount int                    `json:"failureCount"`
}

// BatchOperationResponse 批量操作响应
type BatchOperationResponse struct {
	Success bool               `json:"success"`
	Message string             `json:"message"`
	Data    BatchOperationData `json:"data,omitempty"`
}

func handleBatchOperations(c *gin.Context) {
	log.Println("🔥 NEW BATCH OPERATIONS HANDLER CALLED")
	var req BatchOperationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := ApiResponse{
			Success: false,
			Message: "Invalid request body",
			Error:   err.Error(),
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	requestCtx := context.Background()
	var results []BatchOperationResult

	for _, op := range req.Operations {
		// 根据是否有值来判断操作类型：有值是PUT，无值是DELETE
		operationType := "put"
		if op.Value == "" {
			operationType = "delete"
		}

		result := BatchOperationResult{
			Key:       op.Key,
			Operation: operationType,
		}

		if op.Type == "rawkv" {
			if rawKvClient == nil {
				result.Success = false
				result.Error = "TiKV RawKV client not initialized"
				results = append(results, result)
				continue
			}

			// 使用全局 RawKVClient
			if tikv.RawKVClient == nil {
				result.Success = false
				result.Error = "RawKV client is nil"
				results = append(results, result)
				continue
			}
			client := tikv.RawKVClient

			prefixedKey := prefixedKey(op.Key)

			if operationType == "put" {
				err := client.Put(requestCtx, prefixedKey, []byte(op.Value))
				if err != nil {
					result.Success = false
					result.Error = err.Error()
				} else {
					result.Success = true
				}
			} else {
				// 删除操作 - 先检查键是否存在
				existingValue, err := client.Get(requestCtx, prefixedKey)
				if err != nil || len(existingValue) == 0 {
					result.Success = false
					result.Error = "Key not found"
				} else {
					err = client.Delete(requestCtx, prefixedKey)
					if err != nil {
						result.Success = false
						result.Error = err.Error()
					} else {
						result.Success = true
					}
				}
			}

		} else if op.Type == "txn" {
			if txnClient == nil {
				result.Success = false
				result.Error = "TiKV TxnKV client not initialized"
				results = append(results, result)
				continue
			}

			// 使用全局 TxnKVClient
			if tikv.TxnKVClient == nil {
				result.Success = false
				result.Error = "TxnKV client is nil"
				results = append(results, result)
				continue
			}
			client := tikv.TxnKVClient

			txn, err := client.Begin()
			if err != nil {
				result.Success = false
				result.Error = "Failed to begin transaction: " + err.Error()
				results = append(results, result)
				continue
			}

			prefixedKey := prefixedKey(op.Key)

			if operationType == "put" {
				err = txn.Set(prefixedKey, []byte(op.Value))
				if err != nil {
					txn.Rollback()
					result.Success = false
					result.Error = err.Error()
				} else {
					err = txn.Commit(requestCtx)
					if err != nil {
						result.Success = false
						result.Error = "Failed to commit transaction: " + err.Error()
					} else {
						result.Success = true
					}
				}
			} else {
				// 删除操作 - 先检查键是否存在
				existingValue, err := txn.Get(requestCtx, prefixedKey)
				if err != nil || len(existingValue) == 0 {
					txn.Rollback()
					result.Success = false
					result.Error = "Key not found"
				} else {
					err = txn.Delete(prefixedKey)
					if err != nil {
						txn.Rollback()
						result.Success = false
						result.Error = err.Error()
					} else {
						err = txn.Commit(requestCtx)
						if err != nil {
							result.Success = false
							result.Error = "Failed to commit transaction: " + err.Error()
						} else {
							result.Success = true
						}
					}
				}
			}

		} else {
			result.Success = false
			result.Error = "Invalid operation type. Must be 'rawkv' or 'txn'"
		}

		results = append(results, result)
	}

	successCount := 0
	failureCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		} else {
			failureCount++
		}
	}

	batchResponse := BatchOperationResponse{
		Success: true,
		Message: fmt.Sprintf("Batch operation completed: %d succeeded, %d failed", successCount, failureCount),
		Data: BatchOperationData{
			Results:      results,
			SuccessCount: successCount,
			FailureCount: failureCount,
		},
	}

	response := ApiResponse{
		Success: true,
		Message: "Batch operations completed successfully",
		Data:    batchResponse,
	}

	c.JSON(http.StatusOK, response)
}

func handleBatchDeleteKVs(c *gin.Context) {
	var req struct {
		Keys []string `json:"keys" binding:"required"`
		Type string   `json:"type"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := ApiResponse{
			Success: false,
			Message: "Invalid request parameters",
			Error:   err.Error(),
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if req.Type == "" {
		response := ApiResponse{
			Success: false,
			Message: "Missing type parameter",
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := context.Background()
	deletedCount := 0
	var errors []string

	for _, key := range req.Keys {
		var err error
		keyBytes := prefixedKey(key)

		if req.Type == "rawkv" && rawKvClient != nil {
			// 使用 RawKV 模式删除
			err = tikv.RawKVClient.Delete(ctx, keyBytes)
		} else if req.Type == "txn" && txnClient != nil {
			// 使用 Transaction 模式删除
			txn, err := txnClient.Begin()
			if err == nil {
				err = txn.Delete(keyBytes)
				if err == nil {
					err = txn.Commit(ctx)
				} else {
					txn.Rollback()
				}
			}
		} else {
			errors = append(errors, fmt.Sprintf("Key %s: invalid type or client not available", key))
			continue
		}

		if err != nil {
			errors = append(errors, fmt.Sprintf("Key %s: %v", key, err))
		} else {
			deletedCount++
		}
	}

	response := ApiResponse{
		Success: len(errors) == 0,
		Message: fmt.Sprintf("Batch delete completed. Deleted: %d, Errors: %d", deletedCount, len(errors)),
		Data: map[string]interface{}{
			"deletedCount": deletedCount,
			"errorCount":   len(errors),
			"errors":       errors,
		},
	}

	c.JSON(http.StatusOK, response)
}

func handleDeleteAllKVs(c *gin.Context) {
	kvType := c.DefaultQuery("type", "rawkv")
	ctx := context.Background()
	deletedCount := 0

	switch kvType {
	case "rawkv":
		if rawKvClient == nil || tikv.RawKVClient == nil {
			response := ApiResponse{
				Success: false,
				Message: "TiKV RawKV client not initialized",
			}
			c.JSON(http.StatusServiceUnavailable, response)
			return
		}

		startKey, endKey := prefixedRange("")
		batchSize := 1000
		scanStart := startKey

		for {
			keys, _, err := tikv.RawKVClient.Scan(ctx, scanStart, endKey, batchSize)
			if err != nil {
				response := ApiResponse{
					Success: false,
					Message: "Failed to scan keys for deletion: " + err.Error(),
					Error:   err.Error(),
				}
				c.JSON(http.StatusInternalServerError, response)
				return
			}

			if len(keys) == 0 {
				break
			}

			for _, key := range keys {
				if err := tikv.RawKVClient.Delete(ctx, key); err != nil {
					response := ApiResponse{
						Success: false,
						Message: "Failed to delete key: " + err.Error(),
						Error:   err.Error(),
					}
					c.JSON(http.StatusInternalServerError, response)
					return
				}
				deletedCount++
			}

			scanStart = append(append([]byte{}, keys[len(keys)-1]...), 0x00)
		}

	case "txn":
		if txnClient == nil {
			response := ApiResponse{
				Success: false,
				Message: "TiKV TxnKV client not initialized",
			}
			c.JSON(http.StatusServiceUnavailable, response)
			return
		}

		startKey, endKey := prefixedRange("")
		batchSize := 200

		for {
			txn, err := txnClient.Begin()
			if err != nil {
				response := ApiResponse{
					Success: false,
					Message: "Failed to begin transaction: " + err.Error(),
					Error:   err.Error(),
				}
				c.JSON(http.StatusInternalServerError, response)
				return
			}

			iter, err := txn.Iter(startKey, endKey)
			if err != nil {
				txn.Rollback()
				response := ApiResponse{
					Success: false,
					Message: "Failed to create iterator: " + err.Error(),
					Error:   err.Error(),
				}
				c.JSON(http.StatusInternalServerError, response)
				return
			}

			keys := make([][]byte, 0, batchSize)
			for iter.Valid() && len(keys) < batchSize {
				keys = append(keys, append([]byte{}, iter.Key()...))
				if err := iter.Next(); err != nil {
					iter.Close()
					txn.Rollback()
					response := ApiResponse{
						Success: false,
						Message: "Iterator next error: " + err.Error(),
						Error:   err.Error(),
					}
					c.JSON(http.StatusInternalServerError, response)
					return
				}
			}
			iter.Close()

			if len(keys) == 0 {
				txn.Rollback()
				break
			}

			for _, key := range keys {
				if err := txn.Delete(key); err != nil {
					txn.Rollback()
					response := ApiResponse{
						Success: false,
						Message: "Failed to delete key: " + err.Error(),
						Error:   err.Error(),
					}
					c.JSON(http.StatusInternalServerError, response)
					return
				}
			}

			if err := txn.Commit(ctx); err != nil {
				response := ApiResponse{
					Success: false,
					Message: "Failed to commit transaction: " + err.Error(),
					Error:   err.Error(),
				}
				c.JSON(http.StatusInternalServerError, response)
				return
			}

			deletedCount += len(keys)
			if len(keys) < batchSize {
				break
			}
		}

	default:
		response := ApiResponse{
			Success: false,
			Message: "Invalid type parameter",
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	response := ApiResponse{
		Success: true,
		Message: "Delete all keys successful",
		Data: map[string]interface{}{
			"deletedCount": deletedCount,
			"type":         kvType,
		},
	}

	c.JSON(http.StatusOK, response)
}

func handleAtomicTransaction(c *gin.Context) {
	response := ApiResponse{
		Success: true,
		Message: "Atomic transaction successful",
	}

	c.JSON(http.StatusOK, response)
}

func handleGetStats(c *gin.Context) {
	statsData := StatsResponse{
		TotalKeys: 0,
		RawkvKeys: 0,
		TxnKeys:   0,
	}

	response := ApiResponse{
		Success: true,
		Message: "Get stats successful",
		Data:    statsData,
	}

	c.JSON(http.StatusOK, response)
}

func handleGetClusterStatus(c *gin.Context) {
	endpoints := getCurrentEndpoints()

	clusterData := ClusterStatusResponse{
		ClusterStatus: "healthy",
		Endpoints:     endpoints,
	}

	response := ApiResponse{
		Success: true,
		Message: "Get cluster status successful",
		Data:    clusterData,
	}

	c.JSON(http.StatusOK, response)
}

func handleUpdateClusterEndpoints(c *gin.Context) {
	var req UpdateClusterEndpointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: "Invalid request payload",
			Error:   err.Error(),
		})
		return
	}

	endpoints, err := parseEndpoints(req.Endpoints)
	if err != nil {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: "Invalid endpoints format",
			Error:   err.Error(),
		})
		return
	}

	if err := InitializeTiKVClient(endpoints); err != nil {
		c.JSON(http.StatusServiceUnavailable, ApiResponse{
			Success: false,
			Message: "Failed to connect to TiKV cluster with provided endpoints",
			Error:   err.Error(),
		})
		return
	}

	setCurrentEndpoints(endpoints)

	response := ApiResponse{
		Success: true,
		Message: "Cluster endpoints updated successfully",
		Data: ClusterStatusResponse{
			ClusterStatus: "healthy",
			Endpoints:     endpoints,
		},
	}

	c.JSON(http.StatusOK, response)
}

// scanRawKVs 扫描RawKV中的键值对
func scanRawKVs(ctx context.Context, prefix string, page, limit int) ([]KeyValuePair, int, error) {
	// 直接获取全局RawKV客户端
	client := getGlobalRawKVClient()
	if client == nil {
		log.Printf("RawKV client is nil")
		return nil, 0, nil
	}

	// 计算偏移量
	offset := (page - 1) * limit

	startKey, endKey := prefixedRange(prefix)
	if prefix != "" {
		log.Printf("Scanning TiKV with prefix: %s", prefix)
	} else {
		log.Printf("Scanning TiKV without prefix")
	}

	log.Printf("Start key: %s, End key: %s", string(startKey), string(endKey))

	// 直接使用原始客户端进行扫描
	keys, values, err := client.Scan(ctx, startKey, endKey, offset+limit)
	if err != nil {
		log.Printf("TiKV scan error: %v", err)
		return nil, 0, err
	}

	log.Printf("TiKV scan result: found %d keys", len(keys))

	// 应用分页
	start := offset
	end := offset + limit
	if start > len(keys) {
		return []KeyValuePair{}, len(keys), nil
	}
	if end > len(keys) {
		end = len(keys)
	}

	// 转换为KeyValuePair格式
	var kvPairs []KeyValuePair
	for i := start; i < end; i++ {
		key := keys[i]
		value := values[i]

		valueStr := string(value)

		kvPairs = append(kvPairs, KeyValuePair{
			Key:   string(key),
			Value: valueStr,
		})
	}

	return kvPairs, len(keys), nil
}

// scanTxnKVs 扫描TxnKV中的键值对
func scanTxnKVs(ctx context.Context, prefix string, page, limit int) ([]KeyValuePair, int, error) {
	log.Printf("Transaction模式扫描: prefix=%s, page=%d, limit=%d", prefix, page, limit)

	// 确保事务客户端已初始化
	if txnClient == nil {
		log.Printf("TxnClient is nil")
		return nil, 0, fmt.Errorf("transaction client not initialized")
	}

	// 创建事务用于读取
	txn, err := txnClient.Begin()
	if err != nil {
		log.Printf("Failed to begin transaction: %v", err)
		return nil, 0, err
	}

	// 使用defer确保事务回滚（因为是只读事务）
	defer txn.Rollback()

	// 构造扫描范围
	var startKey, endKey []byte
	if prefix != "" {
		startKey, endKey = prefixedRange(prefix)
	} else {
		startKey, endKey = prefixedRange("")
	}

	log.Printf("Transaction scan range: %s to %s", string(startKey), string(endKey))

	// 使用迭代器扫描
	iter, err := txn.Iter(startKey, endKey)
	if err != nil {
		log.Printf("Failed to create iterator: %v", err)
		return nil, 0, err
	}
	defer iter.Close()

	var kvPairs []KeyValuePair
	skipCount := (page - 1) * limit
	currentCount := 0
	totalCount := 0

	// 遍历迭代器
	for iter.Valid() {
		totalCount++

		// 跳过前面的记录实现分页
		if currentCount >= skipCount && len(kvPairs) < limit {
			key := iter.Key()
			value := iter.Value()

			kvPairs = append(kvPairs, KeyValuePair{
				Key:   string(key),
				Value: string(value),
			})
			currentCount++
		} else if currentCount < skipCount {
			currentCount++
		}

		if len(kvPairs) >= limit {
			break
		}

		err = iter.Next()
		if err != nil {
			log.Printf("Iterator next error: %v", err)
			break
		}
	}

	log.Printf("Transaction scan result: total=%d, returned=%d", totalCount, len(kvPairs))
	return kvPairs, totalCount, nil
}

func main() {
	// 设置 Gin 模式
	gin.SetMode(gin.ReleaseMode)

	// 创建路由
	router := SetupRouter()

	// 创建 HTTP 服务器
	srv := &http.Server{
		Addr:    ":3001",
		Handler: router,
	}

	// 启动服务器
	go func() {
		log.Printf("🚀 TiKV Backend Server running on port 3001")
		log.Printf("📚 API Documentation: http://localhost:3001/api/kv")
		log.Printf("🏥 Health Check: http://localhost:3001/health")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// 等待中断信号优雅关闭
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// 优雅关闭
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}
