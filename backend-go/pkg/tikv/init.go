package tikv

import (
	"context"
	"log"
)

// 全局变量
var (
	rawKvClient *RawKv
	txnKvClient  *TxnKv
)

// InitializeTiKVClient 初始化 TiKV 客户端
func InitializeTiKVClient(endpoints []string) error {
	ctx := context.Background()

	// 初始化 RawKV 客户端
	log.Printf("Initializing TiKV RawKV client with endpoints: %v", endpoints)
	_, err := NewRawKvClient(ctx, endpoints)
	if err != nil {
		return err
	}
	rawKvClient = NewRawKv()
	log.Println("RawKV client initialized successfully")

	// 初始化 TxnKV 客户端
	log.Printf("Initializing TiKV TxnKV client with endpoints: %v", endpoints)
	_, err = NewTxnClient(ctx, endpoints)
	if err != nil {
		return err
	}
	txnKvClient = NewTxnKv()
	log.Println("TxnKV client initialized successfully")

	return nil
}

// CloseTiKVClient 关闭 TiKV 客户端
func CloseTiKVClient() {
	if RawKVClient != nil {
		RawKVClient.Close()
		log.Println("RawKV client closed")
	}

	if TxnKVClient != nil {
		TxnKVClient.Close()
		log.Println("TxnKV client closed")
	}
}

// GetRawKvClient 获取 RawKV 客户端
func GetRawKvClient() *RawKv {
	return rawKvClient
}

// GetTxnKvClient 获取 TxnKV 客户端
func GetTxnKvClient() *TxnKv {
	return txnKvClient
}

// IsConnected 检查是否已连接
func IsConnected() bool {
	return rawKvClient != nil && txnKvClient != nil && RawKVClient != nil && TxnKVClient != nil
}