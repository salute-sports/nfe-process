
"use client";
import { useState, useRef } from "react";
import axios from "axios";
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

export default function UploadNfe() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
      setResult(null);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("file", files[0]);
    try {
      const res = await axios.post(
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/extract",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          responseType: 'blob',
        }
      );
      // Tenta obter o nome do arquivo do header
      const disposition = res.headers['content-disposition'];
      let filename = 'planilha.xlsx';
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      // Cria o download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setResult({ sucesso: true, mensagem: 'Arquivo baixado com sucesso!' });
    } catch (err: any) {
      // Tenta ler mensagem detalhada do backend
      if (err.response && err.response.data) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result as string);
            setError(json.error || JSON.stringify(json));
          } catch {
            setError(reader.result as string || "Erro ao processar o XML");
          }
        };
        reader.readAsText(err.response.data);
      } else {
        setError("Erro ao processar o XML");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBoxClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow p-8 flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2 text-center">Processador de NF-e</h1>
        <p className="text-gray-500 mb-8 text-center text-lg">Envie múltiplos arquivos XML e receba uma planilha Excel consolidada</p>

        <div
          className={`w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-12 mb-6 transition-colors duration-200 ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleBoxClick}
          style={{ cursor: 'pointer' }}
        >
          <CloudArrowUpIcon className="w-12 h-12 text-blue-400 mb-2" />
          <div className="text-gray-600 font-medium mb-1">Arraste arquivos XML aqui</div>
          <div className="text-gray-400 text-sm">ou clique para selecionar</div>
          <div className="text-gray-400 text-xs mt-2">Formatos suportados: XML &bull; Tamanho máximo: 10MB por arquivo</div>
          <input
            ref={inputRef}
            type="file"
            accept=".xml"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <button
          className="w-full bg-blue-400 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 mb-6"
          onClick={handleUpload}
          disabled={!files.length || loading}
        >
          {loading ? "Processando..." : "Processar e Baixar"}
        </button>

        <div className="w-full bg-gray-50 rounded-lg p-4 mb-2">
          <div className="font-semibold mb-2">Como funciona:</div>
          <ul className="text-gray-600 text-sm list-disc pl-5 space-y-1">
            <li>✓ Envie um ou mais arquivos XML de NF-e</li>
            <li>✓ Os dados serão processados e consolidados</li>
            <li>✓ Uma planilha Excel será gerada com EAN consolidado e coluna SKU em branco</li>
            <li>✓ O arquivo será automaticamente baixado ao final!</li>
          </ul>
        </div>

        {error && <div className="text-red-600 w-full text-center mb-2">{error}</div>}
        {result && (
          <div className="mt-4 w-full">
            <h2 className="font-semibold mb-2">Dados extraídos:</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
