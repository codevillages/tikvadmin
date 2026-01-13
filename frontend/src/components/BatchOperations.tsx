import React, { useState } from 'react';
import { toast } from 'sonner';
import { Database, PlayCircle, Plus, Settings, Trash2, Zap } from 'lucide-react';
import TiKVApiService from '../services/api';
import type {
  BatchOperationRequest,
  BatchOperationResponse,
  AtomicTransactionRequest,
  AtomicTransactionResponse,
  TiKVMode
} from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';

interface Operation {
  id: string;
  type: TiKVMode;
  operation: 'put' | 'delete';
  key: string;
  value?: string;
}

const BatchOperations: React.FC = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchOperationResponse | null>(null);
  const [atomicResults, setAtomicResults] = useState<AtomicTransactionResponse | null>(null);
  const [mode, setMode] = useState<TiKVMode>('rawkv');
  const [operation, setOperation] = useState<'put' | 'delete'>('put');
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [atomicOperations, setAtomicOperations] = useState<Array<{
    id: string;
    type: 'put' | 'delete';
    key: string;
    value?: string;
  }>>([]);

  // 添加操作
  const addOperation = () => {
    const newOperation: Operation = {
      id: Date.now().toString(),
      type: mode,
      operation,
      key: keyInput,
      value: operation === 'put' ? valueInput : undefined
    };
    setOperations([...operations, newOperation]);
    setKeyInput('');
    setValueInput('');
  };

  // 删除操作
  const removeOperation = (id: string) => {
    setOperations(operations.filter(op => op.id !== id));
  };

  // 清空操作列表
  const clearOperations = () => {
    setOperations([]);
    setBatchResults(null);
    setAtomicResults(null);
  };

  // 执行批量操作
  const executeBatchOperations = async () => {
    if (operations.length === 0) {
      toast.warning('请先添加操作');
      return;
    }

    setLoading(true);
    try {
      const request: BatchOperationRequest = {
        operations: operations.map(op => ({
          type: op.type,
          key: op.key,
          value: op.value
        }))
      };

      const result = await TiKVApiService.batchOperations(request);
      setBatchResults(result);
      toast.success(`批量操作完成：${result.successCount} 成功，${result.failureCount} 失败`);
    } catch (error: any) {
      console.error('Failed to execute batch operations:', error);
      toast.error(error.message || '批量操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 执行原子事务
  const executeAtomicTransaction = async () => {
    if (atomicOperations.length === 0) {
      toast.warning('请添加事务操作');
      return;
    }

    setLoading(true);
    try {
      const request: AtomicTransactionRequest = {
        operations: atomicOperations.map((item) => ({
          type: item.type,
          key: item.key,
          value: item.value
        }))
      };

      const result = await TiKVApiService.atomicTransaction(request);
      setAtomicResults(result);
      toast.success(`原子事务执行成功：${result.operationCount} 个操作`);
      setAtomicOperations([]);
    } catch (error: any) {
      console.error('Failed to execute atomic transaction:', error);
      toast.error(error.message || '原子事务执行失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="batch" className="space-y-4">
      <TabsList>
        <TabsTrigger value="batch">批量操作 (混合模式)</TabsTrigger>
        <TabsTrigger value="transaction">原子事务 (Txn 模式)</TabsTrigger>
      </TabsList>

      <TabsContent value="batch">
        <Card>
          <CardHeader>
            <CardTitle>添加批量操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>模式</Label>
                <select
                  className="h-11 w-full rounded-full border border-transparent bg-white px-4 text-sm shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as TiKVMode)}
                >
                  <option value="rawkv">RawKV</option>
                  <option value="txn">Txn</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>操作类型</Label>
                <select
                  className="h-11 w-full rounded-full border border-transparent bg-white px-4 text-sm shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value as 'put' | 'delete')}
                >
                  <option value="put">PUT</option>
                  <option value="delete">DELETE</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>键</Label>
                <Input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="请输入键" />
              </div>
              {operation === 'put' && (
                <div className="space-y-2 md:col-span-2">
                  <Label>值</Label>
                  <Input value={valueInput} onChange={(e) => setValueInput(e.target.value)} placeholder="请输入值" />
                </div>
              )}
              <div className="flex items-end">
                <Button
                  onClick={addOperation}
                  disabled={!keyInput || (operation === 'put' && !valueInput)}
                >
                  <Plus className="h-4 w-4" />
                  添加操作
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={executeBatchOperations}
                disabled={operations.length === 0}
                className="gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                执行批量操作 ({operations.length})
              </Button>
              <Button variant="outline" onClick={clearOperations} disabled={operations.length === 0}>
                清空列表
              </Button>
            </div>

            {operations.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模式</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead>键</TableHead>
                    <TableHead>值</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          {item.type === 'rawkv' ? <Database className="h-3 w-3" /> : <Settings className="h-3 w-3" />}
                          {item.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.operation === 'put' ? 'secondary' : 'destructive'}>
                          {item.operation.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">{item.key}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{item.value || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => removeOperation(item.id)}>
                          <Trash2 className="h-4 w-4" />
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {batchResults && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>批量操作结果</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    成功: {batchResults.successCount}，失败: {batchResults.failureCount}
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>键</TableHead>
                        <TableHead>操作</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>错误信息</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchResults.results.map((result) => (
                        <TableRow key={result.key}>
                          <TableCell className="max-w-[240px] truncate">{result.key}</TableCell>
                          <TableCell>{result.operation.toUpperCase()}</TableCell>
                          <TableCell>
                            <Badge variant={result.success ? 'secondary' : 'destructive'}>
                              {result.success ? '成功' : '失败'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate">{result.error || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="transaction">
        <Card>
          <CardHeader>
            <CardTitle>原子事务说明</CardTitle>
            <p className="text-sm text-muted-foreground">
              原子事务中的所有操作要么全部成功，要么全部失败，仅支持 Transaction 模式。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {atomicOperations.map((item, index) => (
              <Card key={item.id} className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    操作 {index + 1}
                    <Button size="sm" variant="ghost" onClick={() => setAtomicOperations((prev) => prev.filter((op) => op.id !== item.id))}>
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>操作类型</Label>
                    <select
                      className="h-11 w-full rounded-full border border-transparent bg-white px-4 text-sm shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                      value={item.type}
                      onChange={(e) =>
                        setAtomicOperations((prev) =>
                          prev.map((op) =>
                            op.id === item.id ? { ...op, type: e.target.value as 'put' | 'delete' } : op
                          )
                        )
                      }
                    >
                      <option value="put">PUT</option>
                      <option value="delete">DELETE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>键</Label>
                    <Input
                      value={item.key}
                      onChange={(e) =>
                        setAtomicOperations((prev) =>
                          prev.map((op) => (op.id === item.id ? { ...op, key: e.target.value } : op))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>值</Label>
                    <Textarea
                      value={item.value || ''}
                      onChange={(e) =>
                        setAtomicOperations((prev) =>
                          prev.map((op) => (op.id === item.id ? { ...op, value: e.target.value } : op))
                        )
                      }
                      disabled={item.type !== 'put'}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={() =>
                setAtomicOperations((prev) => [
                  ...prev,
                  { id: Date.now().toString(), type: 'put', key: '', value: '' },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              添加操作
            </Button>

            <Button
              onClick={executeAtomicTransaction}
              disabled={atomicOperations.length === 0 || loading}
            >
              <Zap className="h-4 w-4" />
              执行原子事务
            </Button>

            {atomicResults && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>原子事务执行成功</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    成功执行 {atomicResults.operationCount} 个操作
                  </p>
                </CardHeader>
              </Card>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default BatchOperations;
