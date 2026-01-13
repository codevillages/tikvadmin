package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"testing"

	"tikv-backend/pkg/tikv"
)

// KeyValuePair 键值对结构（与main.go中定义保持一致）
type KeyValuePair struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// TestData 测试数据结构
type TestData struct {
	OrderID   string  `json:"order_id"`
	Customer  string  `json:"customer"`
	Amount    float64 `json:"amount"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
	Product   string  `json:"product"`
	Qty       int     `json:"qty"`
	Price     float64 `json:"price"`
}

// TestTxnClientPutAndScan 测试事务客户端的PUT和SCAN操作
func TestTxnClientPutAndScan(t *testing.T) {
	// 初始化TiKV客户端
	ctx := context.Background()
	endpoints := []string{
		"172.16.0.10:2379",
		"172.16.0.20:2379",
		"172.16.0.30:2379",
	}

	// 初始化全局TxnKVClient（确保与main.go中的初始化逻辑一致）
	_, err := tikv.NewTxnClient(ctx, endpoints)
	if err != nil {
		t.Fatalf("Failed to initialize txn client: %v", err)
	}

	// 创建事务包装器
	txnWrapper := tikv.NewTxnKv()

	// 测试数据
	testData := []TestData{
		{
			OrderID:   "TXN-001",
			Customer:  "王五",
			Amount:    2399.00,
			Status:    "pending",
			CreatedAt: "2025-12-03T14:00:00Z",
			Product:   "MacBook Pro",
			Qty:       1,
			Price:     2399.00,
		},
		{
			OrderID:   "TXN-002",
			Customer:  "赵六",
			Amount:    599.00,
			Status:    "confirmed",
			CreatedAt: "2025-12-03T14:01:00Z",
			Product:   "AirPods Pro",
			Qty:       2,
			Price:     299.50,
		},
		{
			OrderID:   "TXN-003",
			Customer:  "孙七",
			Amount:    129.00,
			Status:    "shipped",
			CreatedAt: "2025-12-03T14:02:00Z",
			Product:   "iPhone Case",
			Qty:       3,
			Price:     43.00,
		},
	}

	// 1. 插入测试数据
	t.Log("=== 插入事务测试数据 ===")
	for i, data := range testData {
		// 序列化数据
		jsonData, err := json.Marshal(data)
		if err != nil {
			t.Fatalf("Failed to marshal test data %d: %v", i, err)
		}

		// 创建事务
		txn, err := txnWrapper.Begin()
		if err != nil {
			t.Fatalf("Failed to begin transaction %d: %v", i, err)
		}

		// 构造key
		key := fmt.Sprintf("txn_order_%s", data.OrderID)

		// 设置key-value
		err = txnWrapper.Set(txn, []byte(key), jsonData)
		if err != nil {
			t.Fatalf("Failed to set key %s: %v", key, err)
		}

		// 提交事务
		err = txnWrapper.Commit(ctx, txn)
		if err != nil {
			t.Fatalf("Failed to commit transaction %d: %v", i, err)
		}

		t.Logf("✅ 成功插入事务数据: key=%s, customer=%s, amount=%.2f",
			key, data.Customer, data.Amount)
	}

	// 2. 扫描测试数据
	t.Log("\n=== 扫描事务测试数据 ===")

	// 测试扫描所有 txn_order_ 前缀的数据
	prefix := "txn_order_"
	scannedData, err := scanTxnKeysWithClient(ctx, prefix, 1, 100)
	if err != nil {
		t.Fatalf("Failed to scan txn keys: %v", err)
	}

	t.Logf("📊 扫描结果: 找到 %d 条记录", len(scannedData))

	// 验证扫描结果
	if len(scannedData) < len(testData) {
		t.Errorf("期望至少找到 %d 条记录，实际找到 %d 条", len(testData), len(scannedData))
	}

	// 解析并验证数据
	for i, kv := range scannedData {
		var parsedData TestData
		err := json.Unmarshal([]byte(kv.Value), &parsedData)
		if err != nil {
			t.Errorf("Failed to parse JSON data at index %d: %v", i, err)
			continue
		}

		t.Logf("🔍 扫描到数据: key=%s, order_id=%s, customer=%s, amount=%.2f, status=%s",
			kv.Key, parsedData.OrderID, parsedData.Customer, parsedData.Amount, parsedData.Status)
	}

	// 3. 测试前缀搜索
	t.Log("\n=== 测试前缀搜索 ===")

	// 搜索 TXN-001
	specificData, err := scanTxnKeysWithClient(ctx, "txn_order_TXN-001", 1, 100)
	if err != nil {
		t.Fatalf("Failed to scan specific key: %v", err)
	}

	t.Logf("🔍 搜索 'txn_order_TXN-001' 结果: 找到 %d 条记录", len(specificData))

	// 4. 验证数据完整性
	t.Log("\n=== 验证数据完整性 ===")
	allData, err := scanTxnKeysWithClient(ctx, "txn_order_", 1, 1000)
	if err != nil {
		t.Fatalf("Failed to scan all keys: %v", err)
	}

	// 检查每个测试数据是否都存在
	for _, expectedData := range testData {
		expectedKey := fmt.Sprintf("txn_order_%s", expectedData.OrderID)
		found := false

		for _, kv := range allData {
			if kv.Key == expectedKey {
				found = true
				var parsedData TestData
				err := json.Unmarshal([]byte(kv.Value), &parsedData)
				if err != nil {
					t.Errorf("Failed to parse data for key %s: %v", expectedKey, err)
					continue
				}

				if parsedData.Customer != expectedData.Customer ||
					parsedData.Amount != expectedData.Amount {
					t.Errorf("数据不匹配 for key %s: expected customer=%s, amount=%.2f; got customer=%s, amount=%.2f",
						expectedKey, expectedData.Customer, expectedData.Amount,
						parsedData.Customer, parsedData.Amount)
				} else {
					t.Logf("✅ 数据验证通过: key=%s, customer=%s, amount=%.2f",
						expectedKey, parsedData.Customer, parsedData.Amount)
				}
				break
			}
		}

		if !found {
			t.Errorf("❌ 未找到预期数据: key=%s", expectedKey)
		}
	}

	t.Log("\n🎉 事务客户端测试完成!")
}

// scanTxnKeysWithClient 使用全局TxnKVClient扫描键值对
func scanTxnKeysWithClient(ctx context.Context, prefix string, page, limit int) ([]KeyValuePair, error) {
	// 确保TxnKVClient已初始化
	if tikv.TxnKVClient == nil {
		return nil, fmt.Errorf("TxnKVClient is not initialized")
	}

	// 创建事务用于扫描
	txn, err := tikv.TxnKVClient.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin scan transaction failed: %w", err)
	}
	defer txn.Rollback()

	// 构造扫描范围
	var startKey, endKey []byte
	if prefix != "" {
		startKey = []byte(prefix)
		// 创建结束范围
		endKey = make([]byte, len(prefix))
		copy(endKey, prefix)
		endKey = append(endKey, 0xFF) // UTF-8最大值
	} else {
		startKey = []byte("")
		endKey = []byte{0xFF, 0xFF, 0xFF, 0xFF, 0xFF}
	}

	// 设置扫描限制
	skipCount := (page - 1) * limit

	// 使用Iter方法扫描数据
	iter, err := txn.Iter(startKey, endKey)
	if err != nil {
		return nil, fmt.Errorf("create iterator failed: %w", err)
	}
	defer iter.Close()

	var kvPairs []KeyValuePair
	count := 0

	// 遍历迭代器
	for iter.Valid() {
		if count >= skipCount && len(kvPairs) < limit {
			key := iter.Key()
			value := iter.Value()

			kvPairs = append(kvPairs, KeyValuePair{
				Key:   string(key),
				Value: string(value),
			})
		}

		count++
		if len(kvPairs) >= limit {
			break
		}

		err = iter.Next()
		if err != nil {
			break
		}
	}

	log.Printf("TiKV事务扫描: prefix=%s, page=%d, limit=%d, scanned=%d, returned=%d",
		prefix, page, limit, count, len(kvPairs))

	return kvPairs, nil
}