import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ScanLine,
  Sparkles,
  FileCode,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  FileUploader,
  ScanProgress,
  ScanTypeSelector,
  UploadProgress,
} from '../components/scanning/ScanningComponents';
import { apiClient, extractApiError } from '../services/api';
import { useToast } from '../context/ToastContext';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanType, setScanType] = useState<string>('standard');
  const [description, setDescription] = useState<string>('');
  const [sensitivityPreference, setSensitivityPreference] = useState<'strict' | 'balanced' | 'permissive'>('balanced');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleLoadSampleDocument = () => {
    const sampleContent = [
      'CONFIDENTIAL KYC & FINANCIAL VERIFICATION RECORD',
      '===================================================',
      'Applicant Name: Vikramaditya Rao',
      'Residential Address: Flat No 402, Emerald Towers, MG Road, Bengaluru 560001',
      'Contact Email: vikram.rao@fintech-corp.in',
      'Primary Mobile: +91 98450 12345',
      'Government ID (PAN): ABCDE1234F',
      'Government ID (Aadhaar): 2345 6789 0123',
      'Primary Bank Account No: 918273645566 (IFSC: HDFC0001234)',
      'Corporate Settlement Card: 4532 0151 1283 0366',
      'Webhook API Secret: api_key=sk-live9876543210abcdefghijklmnop',
      'Clinical Note: Diagnosis: Hypertension Stage 1',
    ].join('\n');

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const sampleFile = new File([blob], 'sample_kyc_financial_record.txt', {
      type: 'text/plain',
    });
    setSelectedFile(sampleFile);
    setErrorMsg(null);
    showToast({
      type: 'info',
      title: 'Sample KYC & Financial file loaded',
      message: 'Click "Start Intelligent Privacy Scan" to analyze.',
    });
  };

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select or drop a file to scan.');
      return;
    }

    setErrorMsg(null);
    setIsScanning(true);
    setUploadProgress(10);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('scanType', scanType);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('sensitivityPreference', sensitivityPreference);

      const res = await apiClient.post('/scans', formData, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
      });

      const completedScanId = res.data.data.scan.id;
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-recent-scans'] });
      await queryClient.invalidateQueries({ queryKey: ['scans-history'] });

      showToast({
        type: 'success',
        title: 'Privacy Scan Completed',
        message: `Detected ${res.data.data.findings.length} sensitive item(s).`,
      });

      navigate(`/scan/${completedScanId}`);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') {
        setErrorMsg('Scan operation was cancelled by user.');
      } else {
        setErrorMsg(extractApiError(err));
      }
    } finally {
      setIsScanning(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelScan = () => {
    abortControllerRef.current?.abort();
    setIsScanning(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Intelligent Privacy Upload & Scan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload a document or screenshot to detect sensitive personal, financial, and credential
            exposures before sharing.
          </p>
        </div>

        <button
          type="button"
          disabled={isScanning}
          onClick={handleLoadSampleDocument}
          className="px-3.5 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <FileCode className="w-4 h-4" />
          Load Sample KYC Record for Instant Test
        </button>
      </div>

      <form onSubmit={handleStartScan} className="space-y-6">
        {/* Step 1: File Upload */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            1. Select Document or Image
          </h2>
          <FileUploader
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            maxSizeMb={10}
            disabled={isScanning}
          />
        </div>

        {/* Step 2: Scan Type */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            2. Choose Privacy Scan Profile
          </h2>
          <ScanTypeSelector value={scanType} onChange={setScanType} />
        </div>

        {/* Step 3: Optional Context & Sensitivity */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sensitivity Preference
            </label>
            <select
              value={sensitivityPreference}
              onChange={(e) =>
                setSensitivityPreference(e.target.value as 'strict' | 'balanced' | 'permissive')
              }
              disabled={isScanning}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="strict">Strict (Flag all potential contextual matches)</option>
              <option value="balanced">Balanced (Recommended hybrid threshold)</option>
              <option value="permissive">High-Confidence Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Optional Scan Note / Intended Recipient Context
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isScanning}
              placeholder="e.g., Sharing for apartment rental verification"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-medium">
            {errorMsg}
          </div>
        )}

        {isScanning && (
          <div className="space-y-3">
            <UploadProgress progress={uploadProgress} />
            <ScanProgress stage="Extracting text & running hybrid Rule + Gemini AI detection..." />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Credentials and payment card numbers are masked before external AI analysis.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isScanning && (
              <button
                type="button"
                onClick={handleCancelScan}
                className="px-4 py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!selectedFile || isScanning}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Start Intelligent Privacy Scan</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

