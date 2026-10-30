import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Loader2,
  Shield,
} from 'lucide-react';
import { cn, formatBytes } from '../../lib/utils';

export const SCAN_TYPES = [
  {
    id: 'standard',
    label: 'Standard Privacy Scan',
    description: 'Comprehensive detection across identity, finance, contacts, and secrets.',
  },
  {
    id: 'identity',
    label: 'Identity Document Scan',
    description: 'Focused on Aadhaar, PAN, passport, residential address, and KYC data.',
  },
  {
    id: 'financial',
    label: 'Financial Information Scan',
    description: 'Focused on payment cards (Luhn), bank accounts, IFSC, and statements.',
  },
  {
    id: 'credential',
    label: 'Credential Exposure Scan',
    description: 'Deep scan for API keys, JWTs, passwords, tokens, and cloud secrets.',
  },
  {
    id: 'business',
    label: 'Business Document Scan',
    description: 'Detects proprietary notices, payroll data, and internal corporate records.',
  },
] as const;

export const ScanTypeSelector: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {SCAN_TYPES.map((type) => {
      const active = value === type.id;
      return (
        <button
          key={type.id}
          type="button"
          onClick={() => onChange(type.id)}
          className={cn(
            'text-left p-3.5 rounded-xl border transition-all cursor-pointer',
            active
              ? 'border-cyan-500 bg-cyan-500/10 text-slate-100 shadow-sm'
              : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-100">{type.label}</span>
            {active && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{type.description}</p>
        </button>
      );
    })}
  </div>
);

export const FileUploader: React.FC<{
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  maxSizeMb?: number;
  disabled?: boolean;
}> = ({ selectedFile, onSelectFile, maxSizeMb = 10, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt', '.docx'];

  const validateAndSet = (file: File) => {
    setValidationError(null);
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!allowedExtensions.includes(ext)) {
      setValidationError(
        `Unsupported file extension (${ext}). Allowed: PDF, PNG, JPG, WEBP, TXT, DOCX.`
      );
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setValidationError(`File exceeds the maximum size limit of ${maxSizeMb} MB.`);
      return;
    }
    if (file.size === 0) {
      setValidationError('Selected file is empty (0 bytes).');
      return;
    }
    onSelectFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSet(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer',
          dragActive
            ? 'border-cyan-400 bg-cyan-500/10'
            : selectedFile
            ? 'border-emerald-500/50 bg-emerald-950/10'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70',
          disabled && 'opacity-60 pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validateAndSet(f);
          }}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-100">
              Drag & drop your document or image here, or{' '}
              <span className="text-cyan-400 underline">browse files</span>
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              Supported formats: <strong>PDF, PNG, JPG/JPEG, WEBP, TXT, DOCX</strong> • Max size:{' '}
              <strong>{maxSizeMb} MB</strong>
            </p>
          </div>
        ) : (
          <div
            className="flex items-center justify-between gap-4 max-w-lg mx-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatBytes(selectedFile.size)} • {selectedFile.type || 'Document'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectFile(null)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {validationError && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-medium">
          {validationError}
        </div>
      )}
    </div>
  );
};

export const UploadProgress: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs text-slate-300">
      <span>Uploading & Validating File Signature...</span>
      <span className="font-semibold text-cyan-400">{progress}%</span>
    </div>
    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
      <div
        className="h-full bg-cyan-400 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
      />
    </div>
  </div>
);

export const ScanProgress: React.FC<{ stage: string }> = ({ stage }) => (
  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/15 p-4 flex items-center gap-3.5">
    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
    <div>
      <p className="text-sm font-semibold text-cyan-200">{stage}</p>
      <p className="text-xs text-slate-400 mt-0.5">
        Running deterministic regex validators, Luhn checks, and contextual Gemini privacy analysis...
      </p>
    </div>
  </div>
);

export const ScanStatus: React.FC<{ status: string }> = ({ status }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
      <Shield className="w-3 h-3 text-cyan-400" />
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </span>
  );
};

