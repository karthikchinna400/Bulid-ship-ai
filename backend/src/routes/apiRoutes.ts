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

// All protected routes require verified authentication token
apiRouter.use(requireAuth);

// Authentication & Profile
apiRouter.get('/auth/me', getAuthMe);
apiRouter.get('/profile', getProfile);
apiRouter.patch('/profile', updateProfile);
apiRouter.delete('/account', deleteAccount);

// Dashboard
apiRouter.get('/dashboard/stats', getDashboardStats);
apiRouter.get('/dashboard/recent-scans', getRecentScans);
apiRouter.get('/dashboard/risk-distribution', getRiskDistribution);

// Scanning
apiRouter.post('/scans', uploadMiddleware.single('file'), createAndRunScan);
apiRouter.get('/scans', listScans);
apiRouter.delete('/scans', deleteAllScanHistory);
apiRouter.get('/scans/:scanId', getScanById);
apiRouter.post('/scans/:scanId/analyze', analyzeExistingScan);
apiRouter.delete('/scans/:scanId', deleteScan);

// Findings
apiRouter.get('/scans/:scanId/findings', getScanFindings);
apiRouter.patch('/findings/:findingId', updateFindingById);

// Risk Assessment
apiRouter.get('/scans/:scanId/risk', getScanRiskAssessment);
apiRouter.post('/scans/:scanId/recommendations', generateScanRecommendations);

// Redaction
apiRouter.post('/scans/:scanId/redact', redactScanDocument);
apiRouter.get('/scans/:scanId/redacted-file', downloadRedactedFile);
apiRouter.get('/scans/:scanId/redaction-history', getRedactionHistory);

// Reports
apiRouter.get('/scans/:scanId/report', getScanReport);
apiRouter.get('/scans/:scanId/report/pdf', downloadScanReportPdf);

// Privacy AI Assistant
apiRouter.post('/assistant/chat', chatWithAssistant);
apiRouter.get('/assistant/conversations', listAssistantConversations);
apiRouter.get('/assistant/conversations/:conversationId', getAssistantConversation);
apiRouter.delete('/assistant/conversations/:conversationId', deleteAssistantConversation);

// Security Alerts
apiRouter.get('/alerts', listAlerts);
apiRouter.patch('/alerts/:alertId/read', markAlertAsRead);
apiRouter.delete('/alerts/:alertId', deleteAlertById);

// User Settings
apiRouter.get('/settings', getUserSettings);
apiRouter.patch('/settings', updateUserSettings);

