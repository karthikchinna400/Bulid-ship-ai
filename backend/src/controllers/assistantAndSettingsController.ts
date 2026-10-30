import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorMiddleware';
import {
  assistantChatRequestSchema,
  userSettingsUpdateSchema,
} from '../validators/schemas';
import { db } from '../services/storage/databaseService';
import { geminiPrivacyService } from '../services/ai/geminiService';

// ============================================================================
// PRIVACY AI ASSISTANT CONTROLLERS
// ============================================================================

export const chatWithAssistant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { message, conversationId, saveHistory } = assistantChatRequestSchema.parse(req.body);

    let activeConversationId = conversationId || null;
    let historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (saveHistory) {
      if (activeConversationId) {
        const existing = await db.getConversationWithMessages(userId, activeConversationId);
        if (existing) {
          historyMessages = existing.messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));
        } else {
          activeConversationId = null;
        }
      }

      if (!activeConversationId) {
        const title = message.length > 52 ? `${message.slice(0, 50)}...` : message;
        const created = await db.createConversation(userId, title);
        activeConversationId = created.id;
      }

      await db.addConversationMessage(userId, activeConversationId, 'user', message);
    }

    const aiResponse = await geminiPrivacyService.answerPrivacyQuestion(
      message,
      historyMessages
    );

    if (saveHistory && activeConversationId) {
      await db.addConversationMessage(userId, activeConversationId, 'assistant', aiResponse.reply);
    }

    res.status(200).json({
      success: true,
      message: 'Assistant response generated',
      data: {
        conversationId: activeConversationId,
        reply: aiResponse.reply,
        suggestedFollowUps: aiResponse.suggestedFollowUps,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const listAssistantConversations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversations = await db.listConversations(req.user!.id);
    res.status(200).json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: { conversations },
    });
  } catch (err) {
    next(err);
  }
};

export const getAssistantConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversationId = String(req.params.conversationId || '');
    if (!conversationId) {
      throw new AppError('Conversation ID is required', 400, 'INVALID_CONVERSATION_ID');
    }
    const result = await db.getConversationWithMessages(req.user!.id, conversationId);
    if (!result) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      message: 'Conversation retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAssistantConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversationId = String(req.params.conversationId || '');
    if (!conversationId) {
      throw new AppError('Conversation ID is required', 400, 'INVALID_CONVERSATION_ID');
    }
    const deleted = await db.deleteConversation(req.user!.id, conversationId);
    if (!deleted) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully',
      data: { deletedConversationId: conversationId },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// SECURITY ALERTS CONTROLLERS
// ============================================================================

export const listAlerts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alerts = await db.listSecurityAlerts(req.user!.id);
    res.status(200).json({
      success: true,
      message: 'Security alerts retrieved successfully',
      data: { alerts },
    });
  } catch (err) {
    next(err);
  }
};

export const markAlertAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alertId = String(req.params.alertId || '');
    if (!alertId) {
      throw new AppError('Alert ID is required', 400, 'INVALID_ALERT_ID');
    }
    const updated = await db.markAlertRead(req.user!.id, alertId);
    if (!updated) {
      throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      message: 'Alert marked as read',
      data: { alert: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAlertById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alertId = String(req.params.alertId || '');
    if (!alertId) {
      throw new AppError('Alert ID is required', 400, 'INVALID_ALERT_ID');
    }
    const deleted = await db.deleteAlert(req.user!.id, alertId);
    if (!deleted) {
      throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      message: 'Security alert deleted',
      data: { deletedAlertId: alertId },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// USER SETTINGS CONTROLLERS
// ============================================================================

export const getUserSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await db.getOrCreateSettings(req.user!.id);
    res.status(200).json({
      success: true,
      message: 'User settings retrieved successfully',
      data: { settings },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = userSettingsUpdateSchema.parse(req.body);
    const settings = await db.updateSettings(req.user!.id, validated);
    res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: { settings },
    });
  } catch (err) {
    next(err);
  }
};

