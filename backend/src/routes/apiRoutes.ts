import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { uploadMiddleware } from '../middleware/uploadMiddleware';
import {
  createLocalSession,
  deleteAccount,
  getAuthMe,
  getProfile,
  loginAccount,
  registerAccount,
  updateProfile,
} from '../controllers/authController';
import {
  getDashboardStats,
  getRecentScans,
  getRiskDistribution,
} from '../controllers/dashboardController';
import {
  analyzeExistingScan,
  createAndRunScan,
  deleteAllScanHistory,
  deleteScan,
  downloadRedactedFile,
  downloadScanReportPdf,
  generateScanRecommendations,
  getRedactionHistory,
  getScanById,
  getScanFindings,
  getScanReport,
  getScanRiskAssessment,
  listScans,
  redactScanDocument,
  updateFindingById,
} from '../controllers/scanController';
import {
  chatWithAssistant,
  deleteAlertById,
  deleteAssistantConversation,
  getAssistantConversation,
  getUserSettings,
  listAlerts,
  listAssistantConversations,
  markAlertAsRead,
  updateUserSettings,
} from '../controllers/assistantAndSettingsController';

export const apiRouter = Router();

// Health check under /api/v1/health
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'PrivacyGuard AI API v1 is healthy',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'privacyguard-ai-backend',
    },
  });
});

// Public Authentication endpoints (auto-confirms Supabase users and issues verified session tokens)
apiRouter.post('/auth/register', registerAccount);
apiRouter.post('/auth/login', loginAccount);
apiRouter.post('/auth/local-session', createLocalSession);

// Authentication & Profile (Protected)
apiRouter.get('/auth/me', requireAuth, getAuthMe);
apiRouter.get('/profile', requireAuth, getProfile);
apiRouter.patch('/profile', requireAuth, updateProfile);
apiRouter.delete('/account', requireAuth, deleteAccount);

// Dashboard (Protected)
apiRouter.get('/dashboard/stats', requireAuth, getDashboardStats);
apiRouter.get('/dashboard/recent-scans', requireAuth, getRecentScans);
apiRouter.get('/dashboard/risk-distribution', requireAuth, getRiskDistribution);

// Scanning (Protected)
apiRouter.post('/scans', requireAuth, uploadMiddleware.single('file'), createAndRunScan);
apiRouter.get('/scans', requireAuth, listScans);
apiRouter.delete('/scans', requireAuth, deleteAllScanHistory);
apiRouter.get('/scans/:scanId', requireAuth, getScanById);
apiRouter.post('/scans/:scanId/analyze', requireAuth, analyzeExistingScan);
apiRouter.delete('/scans/:scanId', requireAuth, deleteScan);

// Findings (Protected)
apiRouter.get('/scans/:scanId/findings', requireAuth, getScanFindings);
apiRouter.patch('/findings/:findingId', requireAuth, updateFindingById);

// Risk Assessment (Protected)
apiRouter.get('/scans/:scanId/risk', requireAuth, getScanRiskAssessment);
apiRouter.post('/scans/:scanId/recommendations', requireAuth, generateScanRecommendations);

// Redaction (Protected)
apiRouter.post('/scans/:scanId/redact', requireAuth, redactScanDocument);
apiRouter.get('/scans/:scanId/redacted-file', requireAuth, downloadRedactedFile);
apiRouter.get('/scans/:scanId/redaction-history', requireAuth, getRedactionHistory);

// Reports (Protected)
apiRouter.get('/scans/:scanId/report', requireAuth, getScanReport);
apiRouter.get('/scans/:scanId/report/pdf', requireAuth, downloadScanReportPdf);

// Privacy AI Assistant (Protected)
apiRouter.post('/assistant/chat', requireAuth, chatWithAssistant);
apiRouter.get('/assistant/conversations', requireAuth, listAssistantConversations);
apiRouter.get('/assistant/conversations/:conversationId', requireAuth, getAssistantConversation);
apiRouter.delete('/assistant/conversations/:conversationId', requireAuth, deleteAssistantConversation);

// Security Alerts (Protected)
apiRouter.get('/alerts', requireAuth, listAlerts);
apiRouter.patch('/alerts/:alertId/read', requireAuth, markAlertAsRead);
apiRouter.delete('/alerts/:alertId', requireAuth, deleteAlertById);

// User Settings (Protected)
apiRouter.get('/settings', requireAuth, getUserSettings);
apiRouter.patch('/settings', requireAuth, updateUserSettings);

