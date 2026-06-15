import React, { useState, useRef, useCallback } from 'react';
import { Upload, ImageIcon, CheckCircle, XCircle, AlertCircle, Loader2, FolderOpen, Zap, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FilePreviewItem {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'no-match';
  productName?: string;
  errorMsg?: string;
}

interface BulkResult {
  total: number;
  matched: number;
  notFound: number;
  errors: number;
  details: {
    matched: { fileName: string; productId: string; productName: string; imageUrl: string }[];
    notFound: { fileName: string }[];
    errors: { fileName: string; error: string }[];
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeForMatch(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fileNameWithoutExt(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BulkImagesPage() {
  const [files, setFiles] = useState<FilePreviewItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Adiciona arquivos à lista
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) {
      toast.error('Selecione apenas arquivos de imagem (jpg, png, webp...)');
      return;
    }
    const items: FilePreviewItem[] = arr.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));
    setFiles(prev => {
      // Evitar duplicatas pelo nome
      const existing = new Set(prev.map(f => f.file.name));
      return [...prev, ...items.filter(i => !existing.has(i.file.name))];
    });
    setResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (name: string) => {
    setFiles(prev => {
      const item = prev.find(f => f.file.name === name);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(f => f.file.name !== name);
    });
  };

  const reset = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setResult(null);
    setProgress(0);
    setIsUploading(false);
  };

  // Upload em massa
  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach(item => formData.append('files', item.file));

      // Atualiza status para "uploading"
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));

      const res = await api.post('/products/bulk-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      const data: BulkResult = res.data;
      setResult(data);

      // Atualiza status visual de cada arquivo
      const matchedSet = new Set(data.details.matched.map(m => m.fileName));
      const errorSet = new Map(data.details.errors.map(e => [e.fileName, e.error]));
      const notFoundSet = new Set(data.details.notFound.map(n => n.fileName));

      setFiles(prev => prev.map(f => {
        if (matchedSet.has(f.file.name)) {
          const match = data.details.matched.find(m => m.fileName === f.file.name)!;
          return { ...f, status: 'success', productName: match.productName };
        }
        if (errorSet.has(f.file.name)) {
          return { ...f, status: 'error', errorMsg: errorSet.get(f.file.name) };
        }
        if (notFoundSet.has(f.file.name)) {
          return { ...f, status: 'no-match' };
        }
        return f;
      }));

      if (data.matched > 0) {
        toast.success(`${data.matched} produto(s) atualizado(s) com sucesso!`);
      }
      if (data.notFound > 0) {
        toast.warning(`${data.notFound} imagem(ns) sem produto correspondente.`);
      }
    } catch (err: any) {
      toast.error('Erro ao fazer upload: ' + (err?.response?.data?.message || err?.message || 'Erro desconhecido'));
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', errorMsg: 'Falha no upload' })));
    } finally {
      setIsUploading(false);
      setProgress(100);
    }
  };

  const statusIcon = (status: FilePreviewItem['status']) => {
    if (status === 'pending') return <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />;
    if (status === 'uploading') return <Loader2 size={20} className="text-blue-400 animate-spin" />;
    if (status === 'success') return <CheckCircle size={20} className="text-emerald-400" />;
    if (status === 'error') return <XCircle size={20} className="text-red-400" />;
    if (status === 'no-match') return <AlertCircle size={20} className="text-amber-400" />;
  };

  const statusBg = (status: FilePreviewItem['status']) => {
    if (status === 'success') return 'border-emerald-500/30 bg-emerald-500/5';
    if (status === 'error') return 'border-red-500/30 bg-red-500/5';
    if (status === 'no-match') return 'border-amber-500/30 bg-amber-500/5';
    if (status === 'uploading') return 'border-blue-500/30 bg-blue-500/5';
    return 'border-zinc-800 bg-zinc-900/50';
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const noMatchCount = files.filter(f => f.status === 'no-match').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease]">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <ImageIcon size={22} />
            </div>
            Upload de Imagens em Massa
          </h1>
          <p className="text-zinc-500 mt-1.5 text-sm">
            Selecione imagens com o mesmo nome do produto. O sistema faz o match automaticamente.
          </p>
        </div>
        {files.length > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-all"
          >
            <RefreshCw size={16} /> Limpar tudo
          </button>
        )}
      </div>

      {/* Instrução */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex gap-4 items-start">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
          <Zap size={16} />
        </div>
        <div className="text-sm text-zinc-400 leading-relaxed">
          <span className="text-zinc-200 font-semibold">Como funciona:</span> nomeie cada imagem igual ao produto
          (ex: <code className="text-violet-400 bg-zinc-800 px-1.5 py-0.5 rounded-md text-xs">Coca-Cola 350ml.jpg</code>).
          O sistema ignora acentos, maiúsculas e caracteres especiais para fazer o match.
          Você pode selecionar centenas de arquivos de uma vez.
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300
          ${isDragging
            ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
            : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50 bg-zinc-900/30'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300
          ${isDragging ? 'bg-violet-500/20 border-violet-500/40' : 'bg-zinc-800 border-zinc-700'} border`}>
          <FolderOpen size={28} className={isDragging ? 'text-violet-400' : 'text-zinc-400'} />
        </div>
        <p className="text-zinc-200 font-semibold text-lg mb-1">
          {isDragging ? 'Solte as imagens aqui!' : 'Arraste imagens ou clique para selecionar'}
        </p>
        <p className="text-zinc-500 text-sm">
          JPG, PNG, WEBP, GIF — múltiplos arquivos simultaneamente
        </p>
      </div>

      {/* Estatísticas rápidas */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: files.length, color: 'blue', icon: ImageIcon },
            { label: 'Pendentes', value: pendingCount, color: 'zinc', icon: Upload },
            { label: 'Vinculados', value: successCount, color: 'emerald', icon: CheckCircle },
            { label: 'Sem match', value: noMatchCount, color: 'amber', icon: AlertCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className={`bg-zinc-900/60 border border-${color}-500/20 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-black text-${color}-400`}>{value}</p>
              <p className="text-zinc-500 text-xs font-semibold mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-zinc-400">
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-violet-400" />
              Enviando imagens...
            </span>
            <span className="font-bold text-violet-400">{progress}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Resultado resumido */}
      {result && !isUploading && (
        <div className={`rounded-2xl border p-5 ${result.matched === result.total ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {result.matched === result.total
                ? <CheckCircle size={24} className="text-emerald-400" />
                : <AlertCircle size={24} className="text-amber-400" />
              }
              <div>
                <p className="font-bold text-zinc-100">
                  {result.matched === result.total
                    ? 'Todas as imagens foram vinculadas!'
                    : `${result.matched} de ${result.total} imagens vinculadas`
                  }
                </p>
                <p className="text-sm text-zinc-500">
                  {result.notFound > 0 && `${result.notFound} sem match · `}
                  {result.errors > 0 && `${result.errors} com erro`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              Detalhes {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showDetails && (
            <div className="mt-4 space-y-3">
              {result.details.notFound.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Sem correspondência</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.details.notFound.map(n => (
                      <span key={n.fileName} className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg">
                        {n.fileName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.details.errors.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Erros</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.details.errors.map(e => (
                      <span key={e.fileName} className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-2 py-0.5 rounded-lg">
                        {e.fileName}: {e.error}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{files.length} arquivo(s) selecionado(s)</p>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {files.map(item => (
              <div
                key={item.file.name}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${statusBg(item.status)}`}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-200 truncate">{fileNameWithoutExt(item.file.name)}</p>
                  {item.status === 'success' && item.productName && (
                    <p className="text-xs text-emerald-400 truncate">→ {item.productName}</p>
                  )}
                  {item.status === 'no-match' && (
                    <p className="text-xs text-amber-400">Nenhum produto encontrado com este nome</p>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-400">{item.errorMsg || 'Erro no upload'}</p>
                  )}
                  {item.status === 'pending' && (
                    <p className="text-xs text-zinc-500">{(item.file.size / 1024).toFixed(0)} KB</p>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 shrink-0">
                  {statusIcon(item.status)}
                  {item.status === 'pending' && !isUploading && (
                    <button
                      onClick={() => removeFile(item.file.name)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão Upload */}
      {files.length > 0 && !result && (
        <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-md py-4 border-t border-zinc-800 -mx-3 px-3 md:-mx-8 md:px-8">
          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-violet-500/20 text-lg"
          >
            {isUploading ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Enviando {files.length} imagem(ns)...
              </>
            ) : (
              <>
                <Upload size={22} />
                Enviar {files.length} imagem(ns) e vincular aos produtos
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && (
        <div className="text-center py-8 text-zinc-600">
          <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma imagem selecionada ainda</p>
        </div>
      )}
    </div>
  );
}
