import { useState } from 'react';
import { X, Download, FileArchive, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ExportXmlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportXmlModal({ isOpen, onClose }: ExportXmlModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Preencha as duas datas');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/sales/export/xmls', {
        params: { startDate, endDate },
        responseType: 'blob', // Important for ZIP
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `xmls_${startDate}_a_${endDate}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toast.success('Download concluído com sucesso!');
      onClose();
    } catch (err: any) {
      toast.error('Nenhum XML encontrado neste período ou erro na exportação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center p-5 border-b border-zinc-800">
          <h2 className="text-xl font-bold flex items-center gap-2"><FileArchive className="text-blue-500" /> Exportar para Contador</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition"><X size={24} /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-zinc-400 text-sm">Selecione o período para baixar um arquivo .zip contendo todos os arquivos XML (notas fiscais) emitidos e autorizados.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-1">Data Inicial</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-1">Data Final</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition font-medium">Cancelar</button>
          <button onClick={handleExport} disabled={loading || !startDate || !endDate} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Baixar XMLs (.zip)
          </button>
        </div>
      </div>
    </div>
  );
}
