package tikv

import (
	"context"

	"github.com/tikv/client-go/v2/rawkv"
	"github.com/tikv/client-go/v2/txnkv"
	"github.com/tikv/client-go/v2/txnkv/transaction"
)

var (
	// 这个库限制是前缀为tikv_web_，避免污染 tidb 的数据，也能达到隔离的目的
	TiKVWebKeyPrefix = []byte("tikv_web_")
)

type RawKv struct {
	cli *rawkv.Client
}

func NewRawKv() *RawKv {
	return &RawKv{
		cli: RawKVClient,
	}
}

// 如果 key 不存在，这返回的是[]byte{},err是 nil
func (c *RawKv) Get(ctx context.Context, key []byte) ([]byte, error) {
	realKey := c.makeKey(key)
	return c.cli.Get(ctx, realKey)
}

func (c *RawKv) BatchGet(ctx context.Context, keys [][]byte) ([][]byte, error) {
	realKeys := make([][]byte, 0, len(keys))
	for _, key := range keys {
		realKeys = append(realKeys, c.makeKey(key))
	}

	return c.cli.BatchGet(ctx, realKeys)
}

func (c *RawKv) Put(ctx context.Context, key, val []byte) error {
	realKey := c.makeKey(key)
	return c.cli.Put(ctx, realKey, val)
}

func (c *RawKv) BatchPut(ctx context.Context, keys, vals [][]byte) error {
	realKeys := make([][]byte, 0, len(keys))
	for _, key := range keys {
		realKeys = append(realKeys, c.makeKey(key))
	}

	return c.cli.BatchPut(ctx, realKeys, vals)
}

func (c *RawKv) Delete(ctx context.Context, key []byte) error {
	realKey := c.makeKey(key)
	return c.cli.Delete(ctx, realKey)
}

func (c *RawKv) BatchDelete(ctx context.Context, keys [][]byte) error {
	if len(keys) == 0 {
		return nil
	}

	realKeys := make([][]byte, 0, len(keys))
	for _, key := range keys {
		realKeys = append(realKeys, c.makeKey(key))
	}

	return c.cli.BatchDelete(ctx, realKeys)
}

func (c *RawKv) DeleteRange(ctx context.Context, startKey, endKey []byte, limit int) error {
	startKey = c.makeKey(startKey)
	endKey = c.makeKey(endKey)

	return c.cli.DeleteRange(ctx, startKey, endKey)
}

// 这里 endkey其实应该是prefix + OxFF，startKey是来定位起始位置的，endkey 是用来定义范围的
func (c *RawKv) Scan(ctx context.Context, startKey, endKey []byte, limit int) (keys [][]byte, vals [][]byte, err error) {
	startKey = c.makeKey(startKey)
	endKey = c.makeKey(endKey)

	return c.cli.Scan(ctx, startKey, endKey, limit)
}

func (c *RawKv) ReverseScan(ctx context.Context, startKey, endKey []byte, limit int) (keys [][]byte, vals [][]byte, err error) {
	startKey = c.makeKey(startKey)
	endKey = c.makeKey(endKey)

	return c.cli.ReverseScan(ctx, endKey, startKey, limit)
}

func (c *RawKv) makeKey(key []byte) []byte {
	return append(TiKVWebKeyPrefix, key...)
}

type TxnKv struct {
	cli *txnkv.Client
}

func NewTxnKv() *TxnKv {
	return &TxnKv{
		cli: TxnKVClient,
	}
}

func (c *TxnKv) Begin() (txn *transaction.KVTxn, err error) {
	return c.cli.Begin()
}

func (c *TxnKv) Commit(ctx context.Context, txn *transaction.KVTxn) error {
	return txn.Commit(ctx)
}

func (c *TxnKv) Rollback(txn *transaction.KVTxn) error {
	return txn.Rollback()
}

func (c *TxnKv) Get(ctx context.Context, txn *transaction.KVTxn, key []byte) ([]byte, error) {
	realKey := c.makeKey(key)
	return txn.Get(ctx, realKey)
}

func (c *TxnKv) LockKeys(ctx context.Context, txn *transaction.KVTxn, keys ...[]byte) error {
	realKeys := make([][]byte, 0, len(keys))
	for _, key := range keys {
		realKeys = append(realKeys, c.makeKey(key))
	}

	return txn.LockKeysWithWaitTime(ctx, 0, realKeys...)
}

func (c *TxnKv) Set(txn *transaction.KVTxn, key, val []byte) error {
	realKey := c.makeKey(key)
	return txn.Set(realKey, val)
}

func (c *TxnKv) Delete(txn *transaction.KVTxn, key []byte) error {
	realKey := c.makeKey(key)
	return txn.Delete(realKey)
}

func (c *TxnKv) makeKey(key []byte) []byte {
	return append(TiKVWebKeyPrefix, key...)
}