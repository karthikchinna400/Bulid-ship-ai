import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { db } from '../services/storage/databaseService';

export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { scans } = await db.listScans(userId, { page: 1, limit: 1000 });
    const findings = await db.getAllFindingsForUser(userId);
    const alerts = await db.listSecurityAlerts(userId);

    const totalScans = scans.length;
    const totalSensitiveItems = findings.length;
    const protectedFiles = scans.filter((s) => s.redaction_status === 'completed').length;
    const criticalRiskScans = scans.filter((s) => s.risk_level === 'critical').length;
    const highRiskScans = scans.filter((s) => s.risk_level === 'high').length;
    const unreadAlertsCount = alerts.filter((a) => !a.is_read).length;

    const completedScans = scans.filter((s) => typeof s.risk_score === 'number');
    const averageRiskScore =
      completedScans.length > 0
        ? Math.round(
            completedScans.reduce((acc, s) => acc + (s.risk_score || 0), 0) / completedScans.length
          )
        : 0;

    // Category frequency distribution
    const categoryCounts: Record<string, number> = {};
    for (const f of findings) {
      categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    }

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        label: category.replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        totalScans,
        totalSensitiveItems,
        protectedFiles,
        criticalRiskScans,
        highRiskScans,
        highAndCriticalScans: criticalRiskScans + highRiskScans,
        averageRiskScore,
        unreadAlertsCount,
        topCategories,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getRecentScans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(Number(req.query.limit) || 6, 25);
    const { scans } = await db.listScans(userId, { page: 1, limit });

    res.status(200).json({
      success: true,
      message: 'Recent scans retrieved successfully',
      data: { scans },
    });
  } catch (err) {
    next(err);
  }
};

export const getRiskDistribution = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { scans } = await db.listScans(userId, { page: 1, limit: 1000 });
    const findings = await db.getAllFindingsForUser(userId);

    const distribution = {
      low: scans.filter((s) => s.risk_level === 'low').length,
      moderate: scans.filter((s) => s.risk_level === 'moderate').length,
      high: scans.filter((s) => s.risk_level === 'high').length,
      critical: scans.filter((s) => s.risk_level === 'critical').length,
    };

    const categoryBreakdown: Record<string, number> = {};
    for (const f of findings) {
      categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + 1;
    }

    res.status(200).json({
      success: true,
      message: 'Risk distribution retrieved successfully',
      data: {
        riskLevels: [
          { name: 'Low Risk (0-29)', level: 'low', count: distribution.low, fill: '#10B981' },
          { name: 'Moderate Risk (30-59)', level: 'moderate', count: distribution.moderate, fill: '#F59E0B' },
          { name: 'High Risk (60-79)', level: 'high', count: distribution.high, fill: '#F97316' },
          { name: 'Critical Risk (80-100)', level: 'critical', count: distribution.critical, fill: '#EF4444' },
        ],
        categories: Object.entries(categoryBreakdown).map(([category, count]) => ({
          category,
          label: category.replace(/_/g, ' '),
          count,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

