import React, { useState, useRef } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

interface FormJSONEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: string;
}

const FormJSONEditor: React.FC<FormJSONEditorProps> = ({
  value = '',
  onChange,
  height = '500px'
}) => {
  const [isJSONMode, setIsJSONMode] = useState(true);
  const editorRef = useRef<any>(null);

  // 格式化 JSON
  const formatJSON = () => {
    try {
      if (!value || !value.trim()) return;

      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);

      if (onChange) {
        onChange(formatted);
      }

      if (editorRef.current) {
        editorRef.current.setValue(formatted);
      }

      toast.success('JSON 格式化成功');
    } catch (error) {
      toast.error('不是有效的 JSON 格式');
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 检查是否为有效 JSON
  const isValidJSON = () => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  };

  // 编辑器挂载
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // 设置编辑器选项
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
    });

    // 如果初始值是有效的 JSON，自动格式化
    if (value && isJSONMode && isValidJSON()) {
      try {
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);
        editor.setValue(formatted);
        if (onChange) {
          onChange(formatted);
        }
      } catch (error) {
        // 忽略格式化错误，保持原值
      }
    }
  };

  // 值变化处理
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined && onChange) {
      onChange(newValue);
    }
  };

  // 获取语言
  const getLanguage = () => {
    if (!isJSONMode) return 'plaintext';
    return isValidJSON() ? 'json' : 'plaintext';
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Switch checked={isJSONMode} onCheckedChange={setIsJSONMode} />
          <span className="text-xs font-medium text-muted-foreground">
            {isJSONMode ? (isValidJSON() ? '✓ 有效 JSON' : '⚠ 非 JSON 格式') : '文本模式'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isJSONMode && (
            <Button size="sm" variant="secondary" onClick={formatJSON}>
              <Sparkles className="h-4 w-4" />
              格式化
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
            复制
          </Button>
        </div>
      </div>

      {/* Monaco 编辑器 */}
      <div className="font-mono">
        <Editor
          height={height}
          language={getLanguage()}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs"
          options={{
            selectOnLineNumbers: true,
            automaticLayout: true,
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            renderLineHighlight: 'line',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true
            },
            suggest: {
              showKeywords: false,
              showSnippets: false,
            },
            padding: { top: 10, bottom: 10 }
          }}
        />
      </div>
    </div>
  );
};

export default FormJSONEditor;
