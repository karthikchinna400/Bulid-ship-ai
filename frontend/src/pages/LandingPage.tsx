import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ScanLine,
  Lock,
  Cpu,
  FileText,
  Image as ImageIcon,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { Navbar, Footer } from '../components/layout/AppLayout';
import { MANDATORY_DISCLAIMER } from '../lib/utils';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>PrivacyGuard AI — Detect Before You Expose</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Prevent Accidental Data Exposure{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Before You Share Digital Files
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Scan PDFs, screenshots, images, DOCX, and text files for Aadhaar numbers, PAN details,
            payment cards, bank accounts, API keys, and confidential records. Understand the risk
            and permanently redact sensitive content in seconds.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 transition-all"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all"
            >
              Sign In to Dashboard
            </Link>
          </div>

          {/* Supported File Formats Strip */}
          <div className="mt-14 pt-8 border-t border-slate-900/90 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span className="uppercase tracking-wider font-semibold text-slate-500 mr-2">
              Supported Formats:
            </span>
            {['PDF Documents', 'PNG / JPG / WEBP (OCR)', 'DOCX Word Files', 'TXT Plain Text'].map(
              (fmt) => (
                <span
                  key={fmt}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                >
                  {fmt}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Preventive Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              How PrivacyGuard AI Protects Your Digital Trust
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Secure Upload & Signature Check',
                desc: 'Upload PDFs, images, DOCX, or TXT files. Magic-byte validation blocks spoofed or executable files.',
                icon: ScanLine,
              },
              {
                step: '02',
                title: 'Hybrid Detection Engine',
                desc: 'Combines deterministic regex & Luhn checksum rules with contextual Google Gemini AI analysis.',
                icon: Cpu,
              },
              {
                step: '03',
                title: 'Explainable Risk Scoring',
                desc: 'Backend-calculated 0–100 privacy risk score with clear explanations of why each item is risky.',
                icon: AlertTriangle,
              },
              {
                step: '04',
                title: 'Genuine Smart Redaction',
                desc: 'Permanently strip underlying PDF text streams and burn image pixel redactions before downloading.',
                icon: EyeOff,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-800/90 bg-slate-900/40 p-6 relative"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Enterprise-Grade Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Comprehensive Sensitive Data Coverage
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Identity & KYC Protection',
                desc: 'Detects Aadhaar-like 12-digit patterns, PAN card identifiers, passports, and residential addresses.',
                icon: FileText,
              },
              {
                title: 'Financial & Card Validation',
                desc: 'Identifies credit/debit card numbers using Luhn checksum verification, bank accounts, and IFSC codes.',
                icon: Lock,
              },
              {
                title: 'Credentials & API Secrets',
                desc: 'Flags exposed API keys, JWTs, cloud access tokens, and plaintext passwords in screenshots or docs.',
                icon: ShieldCheck,
              },
              {
                title: 'Permanent Document Redaction',
                desc: 'Reconstructs sanitized PDFs and overwrites image pixels so redacted values cannot be copied or recovered.',
                icon: EyeOff,
              },
              {
                title: 'OCR Image & Screenshot Scanning',
                desc: 'Extracts text embedded inside PNG, JPG, and WEBP screenshots using optical character recognition.',
                icon: ImageIcon,
              },
              {
                title: 'Interactive Privacy AI Assistant',
                desc: 'Ask practical questions about safe document sharing, phishing defense, and identity protection.',
                icon: CheckCircle2,
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-slate-700 transition-colors"
                >
                  <Icon className="w-6 h-6 text-cyan-400 mb-3" />
                  <h3 className="text-base font-bold text-white">{feat.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security-First Architecture & Trust */}
      <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Trust & Transparency
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Privacy-First, Zero-Trust Architecture
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              PrivacyGuard AI is built from the ground up to minimize data retention, isolate user
              records via PostgreSQL Row Level Security (RLS), and sanitize sensitive credentials
              before external AI analysis.
            </p>
            <ul className="mt-6 space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Minimization Before AI:</strong> Passwords, API keys, and payment
                  cards detected by deterministic rules are masked on the backend before calling
                  Google Gemini AI.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Row Level Security (RLS):</strong> Every scan, finding, report, and
                  private storage bucket path is strictly scoped to your authenticated user ID.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>User-Controlled Retention:</strong> Configure automatic deletion of
                  original uploads and purge scan histories or your entire account at any time.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
              Transparency Disclosure
            </h3>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>How files are processed:</strong> Uploaded files are validated by magic-byte
                signatures and processed in memory/isolated storage to extract text.
              </p>
              <p>
                <strong>What is stored:</strong> Only masked excerpts (e.g.{' '}
                <code className="text-cyan-300">XXXX XXXX 1234</code>), risk scores, and metadata
                are stored in the `findings` table.
              </p>
              <p>
                <strong>AI Service Used:</strong> Contextual analysis uses Google Gemini via the
                official server-side <code className="text-cyan-300">@google/genai</code> SDK.
              </p>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                {MANDATORY_DISCLAIMER}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <HelpCircle className="w-7 h-7 text-cyan-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: 'Does PrivacyGuard AI just draw black boxes over PDFs?',
                a: 'No. Visual overlays leave underlying text selectable. PrivacyGuard AI rebuilds a clean PDF document containing only sanitized text streams and verifies that redacted values cannot be extracted.',
              },
              {
                q: 'Are full passwords or card numbers sent to the AI model?',
                a: 'No. Layer 1 deterministic rules run first on the backend and mask credentials, payment cards, and government IDs before any text is sent to Gemini for contextual analysis.',
              },
              {
                q: 'Does Aadhaar or PAN detection verify numbers with government databases?',
                a: 'No. Detections are format and checksum validations labeled as potential identifiers to help you prevent accidental exposure.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <h3 className="text-sm font-bold text-slate-100">{item.q}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

