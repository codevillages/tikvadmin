package tikv

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/pingcap/kvproto/pkg/kvrpcpb"
	"github.com/tikv/client-go/v2/rawkv"
	"github.com/tikv/client-go/v2/txnkv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
)

var (
	clientMu    sync.Mutex
	RawKVClient *rawkv.Client
	TxnKVClient *txnkv.Client
)

type RawKvClient struct{}

func NewRawKvClient(ctx context.Context, endpoints []string) (*RawKvClient, error) {
	client := &RawKvClient{}

	rawClient, err := newRawKVWithAPIVersion(ctx, endpoints, kvrpcpb.APIVersion_V2)
	if err != nil {
		log.Printf("rawkv.NewClientWithOpts: %v", err)
		return nil, err
	}

	clientMu.Lock()
	oldClient := RawKVClient
	RawKVClient = rawClient
	clientMu.Unlock()

	if oldClient != nil {
		oldClient.Close()
	}

	return client, nil
}

type TxnClient struct {
	cli *txnkv.Client
}

// GetClient 获取底层事务客户端
func (tc *TxnClient) GetClient() *txnkv.Client {
	return tc.cli
}

// Begin 开始一个新事务
func (tc *TxnClient) Begin() (*txnkv.KVTxn, error) {
	return tc.cli.Begin()
}

func NewTxnClient(ctx context.Context, endpoints []string) (*TxnClient, error) {
	client := &TxnClient{}

	txnClient, err := newTxnKVWithAPIVersion(endpoints, kvrpcpb.APIVersion_V2)
	if err != nil {
		log.Printf("txnkv.NewClient: %v", err)
		return nil, err
	}

	clientMu.Lock()
	oldClient := TxnKVClient
	TxnKVClient = txnClient
	clientMu.Unlock()

	if oldClient != nil {
		oldClient.Close()
	}

	client.cli = TxnKVClient
	return client, nil
}

func newRawKVWithAPIVersion(ctx context.Context, endpoints []string, version kvrpcpb.APIVersion) (*rawkv.Client, error) {
	rawkvOpts := []rawkv.ClientOpt{
		rawkv.WithAPIVersion(version),
		rawkv.WithGRPCDialOptions(
			grpc.WithInitialWindowSize(64*1024*1024),
			grpc.WithInitialConnWindowSize(64*1024*1024),
			grpc.WithDefaultCallOptions(
				grpc.MaxCallRecvMsgSize(512*1024*1024),
				grpc.MaxCallSendMsgSize(256*1024*1024),
			),
			grpc.WithKeepaliveParams(keepalive.ClientParameters{
				Time:    30 * time.Second,
				Timeout: 10 * time.Second,
			}),
		),
	}

	return rawkv.NewClientWithOpts(ctx, endpoints, rawkvOpts...)
}

func newTxnKVWithAPIVersion(endpoints []string, version kvrpcpb.APIVersion) (*txnkv.Client, error) {
	txnOpts := []txnkv.ClientOpt{
		txnkv.WithAPIVersion(version),
	}

	return txnkv.NewClient(endpoints, txnOpts...)
}
