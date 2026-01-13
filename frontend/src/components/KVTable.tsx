import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import TiKVApiService from '../services/api';
import type { KeyValuePair, TiKVMode } from '../types';
import FormJSONEditor from './FormJSONEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';

interface KVTableProps {
  mode: TiKVMode;
}

const KVTable: React.FC<KVTableProps> = ({ mode }) => {
  const [data, setData] = useState<KeyValuePair[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [prefix, setPrefix] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null);

  const [createKey, setCreateKey] = useState('');
  const [createValue, setCreateValue] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载数据
  const loadData = async (page = current, size = pageSize, searchPrefix = prefix) => {
    setLoading(true);
    try {
      const result = await TiKVApiService.scanKVs({
        prefix: searchPrefix || '',
        page,
        limit: size,
        type: mode
      });

      // 确保数据结构正确
      if (result && typeof result === 'object') {
        setData(Array.isArray(result.data) ? result.data : []);
        setTotal(typeof result.total === 'number' ? result.total : 0);
        setCurrent(typeof result.page === 'number' ? result.page : 1);
      } else {
        // 如果返回的数据结构不正确，重置为空状态
        setData([]);
        setTotal(0);
        setCurrent(1);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('加载数据失败');
      // 发生错误时重置状态
      setData([]);
      setTotal(0);
      setCurrent(1);
    } finally {
      setLoading(false);
    }
  };

  // 实时搜索函数（防抖）
  const handleRealTimeSearch = (value: string) => {
    setSearchInput(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setPrefix(value);
      setCurrent(1);
      loadData(1, pageSize, value.trim());
    }, 500);
  };

  // 组件挂载时加载所有记录
  useEffect(() => {
    setPageSize(100);
    setSearchInput('');
    setPrefix('');
    // 默认加载所有记录（空前缀）
    loadData(1, 100, '');
  }, [mode]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // 搜索处理
  const handleSearch = (value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setSearchInput(value);
    setPrefix(value);
    setCurrent(1);
    loadData(1, pageSize, value.trim());
  };

  // 刷新数据
  const handleRefresh = () => {
    loadData(current, pageSize, prefix);
  };

  // 分页处理
  const handlePageChange = (page: number, size?: number) => {
    setCurrent(page);
    if (size) {
      setPageSize(size);
    }
    loadData(page, size || pageSize, prefix);
  };

  // 创建键值对
  const handleCreate = async (values: { key: string; value: string }) => {
    try {
      await TiKVApiService.createKV({
        key: values.key,
        value: values.value,
        type: mode
      });
      toast.success('创建成功');
      setCreateOpen(false);
      setCreateKey('');
      setCreateValue('');
      handleRefresh();
    } catch (error: any) {
      console.error('Failed to create KV:', error);
      toast.error(error.message || '创建失败');
    }
  };

  // 更新键值对
  const handleUpdate = async (values: { key: string; value: string }) => {
    try {
      await TiKVApiService.updateKV({
        key: values.key,
        value: values.value,
        type: mode
      });
      toast.success('更新成功');
      setEditOpen(false);
      handleRefresh();
    } catch (error: any) {
      console.error('Failed to update KV:', error);
      toast.error(error.message || '更新失败');
    }
  };

  // 删除键值对
  const handleDelete = async (key: string) => {
    try {
      await TiKVApiService.deleteKV(key, mode);
      toast.success('删除成功');
      handleRefresh();
    } catch (error: any) {
      console.error('Failed to delete KV:', error);
      toast.error(error.message || '删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      toast.warning('请选择要删除的记录');
      return;
    }

    try {
      await TiKVApiService.batchDeleteKVs({
        keys: selectedRowKeys.map(key => key.toString()),
        type: mode
      });
      toast.success('批量删除成功');
      setSelectedRowKeys([]);
      handleRefresh();
    } catch (error: any) {
      console.error('Failed to batch delete:', error);
      toast.error(error.message || '批量删除失败');
    }
  };

  // 删除所有数据
  // 执行删除所有操作
  const performDeleteAll = async () => {
    try {
      const result = await TiKVApiService.deleteAllKVs(mode);
      toast.success(`成功删除了 ${result.deletedCount} 条 ${mode.toUpperCase()} 记录`);
      setSelectedRowKeys([]);
      setDeleteAllConfirm('');
      setDeleteAllOpen(false);
      handleRefresh();
    } catch (error: any) {
      console.error('Failed to delete all:', error);
      toast.error(error.message || '删除所有数据失败');
    }
  };

  // 打开编辑模态框
  const handleEdit = (record: KeyValuePair) => {
    let formattedValue = record.value;
    try {
      const parsed = JSON.parse(record.value);
      formattedValue = JSON.stringify(parsed, null, 2);
    } catch (error) {
      formattedValue = record.value;
    }
    setEditKey(record.key);
    setEditValue(formattedValue);
    setEditOpen(true);
  };
  const allVisibleSelected =
    data.length > 0 && data.every((item) => selectedRowKeys.includes(item.key));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedRowKeys((prev) =>
        prev.filter((key) => !data.some((item) => item.key === key))
      );
    } else {
      setSelectedRowKeys((prev) => [
        ...new Set([...prev, ...data.map((item) => item.key)]),
      ]);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (current - 1) * pageSize + 1;
  const endIndex = Math.min(current * pageSize, total);

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs font-semibold">
                {mode.toUpperCase()} 数据面板
              </div>
              <Badge variant="secondary">
                总量 {total}
              </Badge>
            </div>
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="请输入前缀关键词进行搜索..."
                  value={searchInput}
                  onChange={(e) => handleRealTimeSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchInput);
                    }
                  }}
                  className="pl-9 border border-slate-200 bg-slate-100/80 focus-visible:border-slate-300 focus-visible:ring-slate-200"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button size="sm" variant="outline" onClick={handleRefresh} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  刷新
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  新增
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-600"
                  onClick={() => setDeleteAllOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  删除所有
                </Button>
              </div>
            </div>
            {selectedRowKeys.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">已选择 {selectedRowKeys.length} 条</span>
                <Button size="sm" variant="outline" onClick={() => setSelectedRowKeys([])}>
                  取消选择
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setBatchDeleteOpen(true)}>
                  批量删除
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{mode.toUpperCase()} 键总数</div>
          <div className="mt-1 text-xl font-semibold">{total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">当前页数量</div>
          <div className="mt-1 text-xl font-semibold">{data.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">已选择</div>
          <div className="mt-1 text-xl font-semibold">{selectedRowKeys.length}</div>
        </Card>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>键</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {data.map((record) => (
              <TableRow key={record.key} data-state={selectedRowKeys.includes(record.key) ? 'selected' : undefined}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedRowKeys.includes(record.key)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedRowKeys((prev) =>
                        checked ? [...prev, record.key] : prev.filter((key) => key !== record.key)
                      );
                    }}
                    aria-label={`Select ${record.key}`}
                  />
                </TableCell>
                <TableCell className="max-w-[520px] truncate font-mono text-xs" title={record.key}>
                  {record.key}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(record)}>
                      <Edit3 className="h-4 w-4" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => {
                        setDeleteTargetKey(record.key);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
          <div className="text-muted-foreground">
            {total === 0 ? '共 0 条' : `第 ${startIndex}-${endIndex} 条，共 ${total} 条`}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(Math.max(1, current - 1))}
              disabled={current <= 1}
            >
              上一页
            </Button>
            <span className="text-muted-foreground">
              第 {current} / {totalPages} 页
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(Math.min(totalPages, current + 1))}
              disabled={current >= totalPages}
            >
              下一页
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">每页</span>
              <select
                className="h-9 rounded-full border border-transparent bg-white px-3 text-sm shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                value={pageSize}
                onChange={(e) => handlePageChange(1, Number(e.target.value))}
              >
                {[10, 20, 50, 100, 200, 500, 1000].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增 {mode.toUpperCase()} 键值对</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="create-key">键</Label>
              <Input
                id="create-key"
                value={createKey}
                onChange={(e) => setCreateKey(e.target.value)}
                placeholder="请输入键"
                maxLength={1000}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-value">值</Label>
              <Textarea
                id="create-value"
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
                placeholder="请输入值"
                rows={6}
                maxLength={10000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => handleCreate({ key: createKey, value: createValue })}
              disabled={!createKey || !createValue}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>编辑 {mode.toUpperCase()} 键值对</DialogTitle>
            <DialogDescription>支持 JSON 格式化与文本模式。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-key">键</Label>
              <Input
                id="edit-key"
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                maxLength={1000}
              />
            </div>
            <div className="grid gap-2">
              <Label>值</Label>
              <FormJSONEditor value={editValue} onChange={setEditValue} height="360px" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={() => handleUpdate({ key: editKey, value: editValue })} disabled={!editKey}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除这条记录？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，请谨慎操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargetKey) {
                  handleDelete(deleteTargetKey);
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除选中的 {selectedRowKeys.length} 条记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBatchDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
              危险操作确认
            </DialogTitle>
            <DialogDescription>
              将删除所有 {mode.toUpperCase()} 键值对，此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="delete-all-confirm">请输入 DELETE ALL 以确认</Label>
            <Input
              id="delete-all-confirm"
              value={deleteAllConfirm}
              onChange={(e) => setDeleteAllConfirm(e.target.value)}
              placeholder="DELETE ALL"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={performDeleteAll}
              disabled={deleteAllConfirm !== 'DELETE ALL'}
            >
              删除所有
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KVTable;
