import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { supabaseAdmin } from '../../config/supabase';
import {
  AssistantConversationRecord,
  AssistantMessageRecord,
  FindingRecord,
  ProfileRecord,
  RedactionRecord,
  ScanRecord,
  ScanReportRecord,
  SecurityAlertRecord,
  UserSettingsRecord,
} from '../../types';
import { logger } from '../../utils/logger';

interface LocalDatabaseState {
  profiles: ProfileRecord[];
  scans: ScanRecord[];
  findings: FindingRecord[];
  scan_reports: ScanReportRecord[];
  redaction_records: RedactionRecord[];
  security_alerts: SecurityAlertRecord[];
  user_settings: UserSettingsRecord[];
  assistant_conversations: AssistantConversationRecord[];
  assistant_messages: AssistantMessageRecord[];
}

const LOCAL_DB_FILE = path.resolve(process.cwd(), 'temp', 'local_db.json');

// Ephemeral in-memory map for raw finding values during active redaction sessions (never persisted to disk/DB)
const ephemeralRawMatchStore = new Map<string, string>();

export const setEphemeralFindingRawValue = (findingId: string, rawValue: string): void => {
  ephemeralRawMatchStore.set(findingId, rawValue);
};

export const getEphemeralFindingRawValue = (findingId: string): string | undefined => {
  return ephemeralRawMatchStore.get(findingId);
};

class DatabaseService {
  private state: LocalDatabaseState = {
    profiles: [],
    scans: [],
    findings: [],
    scan_reports: [],
    redaction_records: [],
    security_alerts: [],
    user_settings: [],
    assistant_conversations: [],
    assistant_messages: [],
  };

  private supabaseSchemaUnavailable = false;

  constructor() {
    this.loadLocalState();
  }

  private get useSupabase(): boolean {
    return !env.isPlaceholderSupabase && env.NODE_ENV !== 'test' && !this.supabaseSchemaUnavailable;
  }

  private loadLocalState(): void {
    if (env.NODE_ENV === 'test') return;
    try {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<LocalDatabaseState>;
        this.state = {
          profiles: parsed.profiles || [],
          scans: parsed.scans || [],
          findings: parsed.findings || [],
          scan_reports: parsed.scan_reports || [],
          redaction_records: parsed.redaction_records || [],
          security_alerts: parsed.security_alerts || [],
          user_settings: parsed.user_settings || [],
          assistant_conversations: parsed.assistant_conversations || [],
          assistant_messages: parsed.assistant_messages || [],
        };
      }
    } catch (err) {
      logger.warn({ err }, 'Could not load local fallback state, initializing empty store');
    }
  }

  private saveLocalState(): void {
    if (env.NODE_ENV === 'test') return;
    try {
      const dir = path.dirname(LOCAL_DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      logger.warn({ err }, 'Failed to save local state');
    }
  }

  public resetTestState(): void {
    this.state = {
      profiles: [],
      scans: [],
      findings: [],
      scan_reports: [],
      redaction_records: [],
      security_alerts: [],
      user_settings: [],
      assistant_conversations: [],
      assistant_messages: [],
    };
    ephemeralRawMatchStore.clear();
  }

  // ============================================================================
  // PROFILES
  // ============================================================================
  async getOrCreateProfile(user: { id: string; email: string; fullName?: string; avatarUrl?: string }): Promise<ProfileRecord> {
    if (this.useSupabase) {
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        logger.warn(
          { fetchError },
          'Supabase profiles table not yet migrated or unreachable; falling back to local persistence store'
        );
        this.supabaseSchemaUnavailable = true;
      } else {
        if (existing) return existing as ProfileRecord;

        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.fullName || user.email.split('@')[0],
          avatar_url: user.avatarUrl || null,
        };
        const { data: created, error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert(newProfile)
          .select('*')
          .single();

        if (insertError) {
          logger.warn(
            { insertError },
            'Supabase profile insert fallback triggered; using local persistence store'
          );
          this.supabaseSchemaUnavailable = true;
        } else {
          await this.getOrCreateSettings(user.id);
          return created as ProfileRecord;
        }
      }
    }

    let profile = this.state.profiles.find((p) => p.id === user.id);
    if (!profile) {
      const now = new Date().toISOString();
      profile = {
        id: user.id,
        email: user.email,
        full_name: user.fullName || user.email.split('@')[0],
        avatar_url: user.avatarUrl || null,
        created_at: now,
        updated_at: now,
      };
      this.state.profiles.push(profile);
      await this.getOrCreateSettings(user.id);
      this.saveLocalState();
    }
    return profile;
  }

  async updateProfile(userId: string, updates: { full_name?: string; avatar_url?: string | null }): Promise<ProfileRecord> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data as ProfileRecord;
    }

    const profile = this.state.profiles.find((p) => p.id === userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    if (updates.full_name !== undefined) profile.full_name = updates.full_name;
    if (updates.avatar_url !== undefined) profile.avatar_url = updates.avatar_url;
    profile.updated_at = new Date().toISOString();
    this.saveLocalState();
    return profile;
  }

  async deleteAccountData(userId: string): Promise<void> {
    if (this.useSupabase) {
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (err) {
        logger.warn({ err, userId }, 'Supabase auth admin deleteUser warning');
      }
      return;
    }

    this.state.profiles = this.state.profiles.filter((p) => p.id !== userId);
    this.state.scans = this.state.scans.filter((s) => s.user_id !== userId);
    this.state.findings = this.state.findings.filter((f) => f.user_id !== userId);
    this.state.scan_reports = this.state.scan_reports.filter((r) => r.user_id !== userId);
    this.state.redaction_records = this.state.redaction_records.filter((r) => r.user_id !== userId);
    this.state.security_alerts = this.state.security_alerts.filter((a) => a.user_id !== userId);
    this.state.user_settings = this.state.user_settings.filter((s) => s.user_id !== userId);
    this.state.assistant_conversations = this.state.assistant_conversations.filter((c) => c.user_id !== userId);
    this.state.assistant_messages = this.state.assistant_messages.filter((m) => m.user_id !== userId);
    this.saveLocalState();
  }

  // ============================================================================
  // USER SETTINGS
  // ============================================================================
  async getOrCreateSettings(userId: string): Promise<UserSettingsRecord> {
    if (this.useSupabase) {
      const { data: existing, error } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (existing) return existing as UserSettingsRecord;

      const { data: created, error: insertErr } = await supabaseAdmin
        .from('user_settings')
        .insert({
          user_id: userId,
          auto_delete_original: true,
          retain_scan_history: true,
          retain_redacted_files: true,
          security_notifications: true,
        })
        .select('*')
        .single();
      if (insertErr) throw insertErr;
      return created as UserSettingsRecord;
    }

    let settings = this.state.user_settings.find((s) => s.user_id === userId);
    if (!settings) {
      const now = new Date().toISOString();
      settings = {
        id: uuidv4(),
        user_id: userId,
        auto_delete_original: true,
        retain_scan_history: true,
        retain_redacted_files: true,
        security_notifications: true,
        created_at: now,
        updated_at: now,
      };
      this.state.user_settings.push(settings);
      this.saveLocalState();
    }
    return settings;
  }

  async updateSettings(userId: string, updates: Partial<UserSettingsRecord>): Promise<UserSettingsRecord> {
    await this.getOrCreateSettings(userId);
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .update({
          auto_delete_original: updates.auto_delete_original,
          retain_scan_history: updates.retain_scan_history,
          retain_redacted_files: updates.retain_redacted_files,
          security_notifications: updates.security_notifications,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data as UserSettingsRecord;
    }

    const settings = this.state.user_settings.find((s) => s.user_id === userId)!;
    if (updates.auto_delete_original !== undefined) settings.auto_delete_original = updates.auto_delete_original;
    if (updates.retain_scan_history !== undefined) settings.retain_scan_history = updates.retain_scan_history;
    if (updates.retain_redacted_files !== undefined) settings.retain_redacted_files = updates.retain_redacted_files;
    if (updates.security_notifications !== undefined) settings.security_notifications = updates.security_notifications;
    settings.updated_at = new Date().toISOString();
    this.saveLocalState();
    return settings;
  }

  // ============================================================================
  // SCANS
  // ============================================================================
  async createScan(scanData: Omit<ScanRecord, 'id' | 'created_at' | 'completed_at'>): Promise<ScanRecord> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('scans')
        .insert({
          user_id: scanData.user_id,
          original_filename: scanData.original_filename,
          stored_filename: scanData.stored_filename,
          file_type: scanData.file_type,
          file_size: scanData.file_size,
          storage_path: scanData.storage_path,
          scan_type: scanData.scan_type,
          description: scanData.description,
          sensitivity_preference: scanData.sensitivity_preference,
          extracted_text: scanData.extracted_text,
          status: scanData.status,
          risk_score: scanData.risk_score,
          risk_level: scanData.risk_level,
          total_findings: scanData.total_findings,
          redaction_status: scanData.redaction_status,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as ScanRecord;
    }

    const record: ScanRecord = {
      ...scanData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    this.state.scans.push(record);
    this.saveLocalState();
    return record;
  }

  async updateScan(userId: string, scanId: string, updates: Partial<ScanRecord>): Promise<ScanRecord> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('scans')
        .update(updates)
        .eq('id', scanId)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data as ScanRecord;
    }

    const scan = this.state.scans.find((s) => s.id === scanId && s.user_id === userId);
    if (!scan) {
      throw new Error('Scan not found or access denied');
    }
    Object.assign(scan, updates);
    this.saveLocalState();
    return scan;
  }

  async getScanById(userId: string, scanId: string): Promise<ScanRecord | null> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as ScanRecord) || null;
    }

    return this.state.scans.find((s) => s.id === scanId && s.user_id === userId) || null;
  }

  async listScans(
    userId: string,
    filters: {
      page?: number;
      limit?: number;
      riskLevel?: string;
      status?: string;
      fileType?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ scans: ScanRecord[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    if (this.useSupabase) {
      let query = supabaseAdmin
        .from('scans')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters.riskLevel) query = query.eq('risk_level', filters.riskLevel);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.fileType) query = query.ilike('file_type', `%${filters.fileType}%`);
      if (filters.search) query = query.ilike('original_filename', `%${filters.search}%`);
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return {
        scans: (data as ScanRecord[]) || [],
        total: count || 0,
        page,
        limit,
      };
    }

    let items = this.state.scans
      .filter((s) => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (filters.riskLevel) {
      items = items.filter((s) => s.risk_level === filters.riskLevel);
    }
    if (filters.status) {
      items = items.filter((s) => s.status === filters.status);
    }
    if (filters.fileType) {
      const ft = filters.fileType.toLowerCase();
      items = items.filter((s) => s.file_type.toLowerCase().includes(ft));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter((s) => s.original_filename.toLowerCase().includes(q));
    }
    if (filters.startDate) {
      items = items.filter((s) => new Date(s.created_at) >= new Date(filters.startDate!));
    }
    if (filters.endDate) {
      items = items.filter((s) => new Date(s.created_at) <= new Date(filters.endDate!));
    }

    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);
    return { scans: paginated, total, page, limit };
  }

  async deleteScan(userId: string, scanId: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error, count } = await supabaseAdmin
        .from('scans')
        .delete({ count: 'exact' })
        .eq('id', scanId)
        .eq('user_id', userId);
      if (error) throw error;
      return (count || 0) > 0;
    }

    const initialLen = this.state.scans.length;
    this.state.scans = this.state.scans.filter((s) => !(s.id === scanId && s.user_id === userId));
    if (this.state.scans.length === initialLen) return false;

    this.state.findings = this.state.findings.filter((f) => f.scan_id !== scanId);
    this.state.scan_reports = this.state.scan_reports.filter((r) => r.scan_id !== scanId);
    this.state.redaction_records = this.state.redaction_records.filter((r) => r.scan_id !== scanId);
    this.saveLocalState();
    return true;
  }

  async deleteAllScansForUser(userId: string): Promise<number> {
    if (this.useSupabase) {
      const { count, error } = await supabaseAdmin
        .from('scans')
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      if (error) throw error;
      return count || 0;
    }

    const userScans = this.state.scans.filter((s) => s.user_id === userId);
    const count = userScans.length;
    this.state.scans = this.state.scans.filter((s) => s.user_id !== userId);
    this.state.findings = this.state.findings.filter((f) => f.user_id !== userId);
    this.state.scan_reports = this.state.scan_reports.filter((r) => r.user_id !== userId);
    this.state.redaction_records = this.state.redaction_records.filter((r) => r.user_id !== userId);
    this.saveLocalState();
    return count;
  }

  // ============================================================================
  // FINDINGS
  // ============================================================================
  async replaceFindingsForScan(
    userId: string,
    scanId: string,
    findingsInput: Array<Omit<FindingRecord, 'id' | 'created_at'>>
  ): Promise<FindingRecord[]> {
    if (this.useSupabase) {
      await supabaseAdmin.from('findings').delete().eq('scan_id', scanId).eq('user_id', userId);

      if (findingsInput.length === 0) return [];

      const rowsToInsert = findingsInput.map((f) => ({
        scan_id: scanId,
        user_id: userId,
        category: f.category,
        subcategory: f.subcategory,
        severity: f.severity,
        confidence: f.confidence,
        detection_method: f.detection_method,
        page_number: f.page_number,
        start_offset: f.start_offset,
        end_offset: f.end_offset,
        masked_value: f.masked_value,
        explanation: f.explanation,
        recommended_action: f.recommended_action,
        is_redacted: f.is_redacted,
      }));

      const { data, error } = await supabaseAdmin.from('findings').insert(rowsToInsert).select('*');
      if (error) throw error;
      const inserted = (data as FindingRecord[]) || [];
      inserted.forEach((rec, idx) => {
        if (findingsInput[idx]?.raw_match) {
          setEphemeralFindingRawValue(rec.id, findingsInput[idx].raw_match!);
        }
      });
      return inserted;
    }

    this.state.findings = this.state.findings.filter((f) => !(f.scan_id === scanId && f.user_id === userId));
    const now = new Date().toISOString();
    const created: FindingRecord[] = findingsInput.map((f) => {
      const id = uuidv4();
      if (f.raw_match) {
        setEphemeralFindingRawValue(id, f.raw_match);
      }
      const { raw_match: _omit, ...persisted } = f;
      return {
        ...persisted,
        id,
        created_at: now,
      };
    });
    this.state.findings.push(...created);
    this.saveLocalState();
    return created;
  }

  async getFindingsByScan(userId: string, scanId: string): Promise<FindingRecord[]> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('findings')
        .select('*')
        .eq('scan_id', scanId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as FindingRecord[]) || [];
    }

    return this.state.findings.filter((f) => f.scan_id === scanId && f.user_id === userId);
  }

  async getAllFindingsForUser(userId: string): Promise<FindingRecord[]> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin.from('findings').select('*').eq('user_id', userId);
      if (error) throw error;
      return (data as FindingRecord[]) || [];
    }

    return this.state.findings.filter((f) => f.user_id === userId);
  }

  async updateFinding(
    userId: string,
    findingId: string,
    updates: Partial<Pick<FindingRecord, 'is_redacted' | 'severity' | 'recommended_action'>>
  ): Promise<FindingRecord | null> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('findings')
        .update(updates)
        .eq('id', findingId)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return (data as FindingRecord) || null;
    }

    const finding = this.state.findings.find((f) => f.id === findingId && f.user_id === userId);
    if (!finding) return null;
    Object.assign(finding, updates);
    this.saveLocalState();
    return finding;
  }

  async markFindingsRedacted(userId: string, scanId: string, findingIds: string[]): Promise<void> {
    if (this.useSupabase) {
      await supabaseAdmin
        .from('findings')
        .update({ is_redacted: true })
        .eq('scan_id', scanId)
        .eq('user_id', userId)
        .in('id', findingIds);
      return;
    }

    const idSet = new Set(findingIds);
    this.state.findings.forEach((f) => {
      if (f.scan_id === scanId && f.user_id === userId && idSet.has(f.id)) {
        f.is_redacted = true;
      }
    });
    this.saveLocalState();
  }

  // ============================================================================
  // SCAN REPORTS
  // ============================================================================
  async upsertScanReport(reportData: Omit<ScanReportRecord, 'id' | 'created_at'>): Promise<ScanReportRecord> {
    if (this.useSupabase) {
      await supabaseAdmin
        .from('scan_reports')
        .delete()
        .eq('scan_id', reportData.scan_id)
        .eq('user_id', reportData.user_id);

      const { data, error } = await supabaseAdmin
        .from('scan_reports')
        .insert({
          scan_id: reportData.scan_id,
          user_id: reportData.user_id,
          summary: reportData.summary,
          risk_explanation: reportData.risk_explanation,
          sharing_guidance: reportData.sharing_guidance,
          recommendations: reportData.recommendations,
          risk_breakdown: reportData.risk_breakdown,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as ScanReportRecord;
    }

    this.state.scan_reports = this.state.scan_reports.filter(
      (r) => !(r.scan_id === reportData.scan_id && r.user_id === reportData.user_id)
    );
    const created: ScanReportRecord = {
      ...reportData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    this.state.scan_reports.push(created);
    this.saveLocalState();
    return created;
  }

  async getScanReport(userId: string, scanId: string): Promise<ScanReportRecord | null> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('scan_reports')
        .select('*')
        .eq('scan_id', scanId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as ScanReportRecord) || null;
    }

    return this.state.scan_reports.find((r) => r.scan_id === scanId && r.user_id === userId) || null;
  }

  // ============================================================================
  // REDACTION RECORDS
  // ============================================================================
  async createRedactionRecord(recordData: Omit<RedactionRecord, 'id' | 'created_at'>): Promise<RedactionRecord> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('redaction_records')
        .insert({
          scan_id: recordData.scan_id,
          user_id: recordData.user_id,
          output_storage_path: recordData.output_storage_path,
          redacted_finding_ids: recordData.redacted_finding_ids,
          redaction_type: recordData.redaction_type,
          status: recordData.status,
          verification_passed: recordData.verification_passed ?? true,
          notes: recordData.notes,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as RedactionRecord;
    }

    const record: RedactionRecord = {
      ...recordData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    this.state.redaction_records.push(record);
    this.saveLocalState();
    return record;
  }

  async getRedactionRecordsByScan(userId: string, scanId: string): Promise<RedactionRecord[]> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('redaction_records')
        .select('*')
        .eq('scan_id', scanId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as RedactionRecord[]) || [];
    }

    return this.state.redaction_records
      .filter((r) => r.scan_id === scanId && r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ============================================================================
  // SECURITY ALERTS
  // ============================================================================
  async createSecurityAlert(alertData: Omit<SecurityAlertRecord, 'id' | 'created_at' | 'is_read'>): Promise<SecurityAlertRecord> {
    const settings = await this.getOrCreateSettings(alertData.user_id);
    if (!settings.security_notifications) {
      return {
        ...alertData,
        id: uuidv4(),
        is_read: true,
        created_at: new Date().toISOString(),
      };
    }

    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('security_alerts')
        .insert({
          user_id: alertData.user_id,
          scan_id: alertData.scan_id,
          title: alertData.title,
          message: alertData.message,
          severity: alertData.severity,
          is_read: false,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as SecurityAlertRecord;
    }

    const alert: SecurityAlertRecord = {
      ...alertData,
      id: uuidv4(),
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.state.security_alerts.push(alert);
    this.saveLocalState();
    return alert;
  }

  async listSecurityAlerts(userId: string): Promise<SecurityAlertRecord[]> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('security_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as SecurityAlertRecord[]) || [];
    }

    return this.state.security_alerts
      .filter((a) => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async markAlertRead(userId: string, alertId: string): Promise<SecurityAlertRecord | null> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('security_alerts')
        .update({ is_read: true })
        .eq('id', alertId)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return (data as SecurityAlertRecord) || null;
    }

    const alert = this.state.security_alerts.find((a) => a.id === alertId && a.user_id === userId);
    if (!alert) return null;
    alert.is_read = true;
    this.saveLocalState();
    return alert;
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    if (this.useSupabase) {
      const { count, error } = await supabaseAdmin
        .from('security_alerts')
        .delete({ count: 'exact' })
        .eq('id', alertId)
        .eq('user_id', userId);
      if (error) throw error;
      return (count || 0) > 0;
    }

    const prev = this.state.security_alerts.length;
    this.state.security_alerts = this.state.security_alerts.filter(
      (a) => !(a.id === alertId && a.user_id === userId)
    );
    if (this.state.security_alerts.length !== prev) {
      this.saveLocalState();
      return true;
    }
    return false;
  }

  // ============================================================================
  // ASSISTANT CONVERSATIONS & MESSAGES
  // ============================================================================
  async createConversation(userId: string, title: string): Promise<AssistantConversationRecord> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('assistant_conversations')
        .insert({ user_id: userId, title })
        .select('*')
        .single();
      if (error) throw error;
      return data as AssistantConversationRecord;
    }

    const conv: AssistantConversationRecord = {
      id: uuidv4(),
      user_id: userId,
      title,
      created_at: new Date().toISOString(),
    };
    this.state.assistant_conversations.push(conv);
    this.saveLocalState();
    return conv;
  }

  async listConversations(userId: string): Promise<AssistantConversationRecord[]> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('assistant_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as AssistantConversationRecord[]) || [];
    }

    return this.state.assistant_conversations
      .filter((c) => c.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getConversationWithMessages(
    userId: string,
    conversationId: string
  ): Promise<{ conversation: AssistantConversationRecord; messages: AssistantMessageRecord[] } | null> {
    if (this.useSupabase) {
      const { data: conv, error: convErr } = await supabaseAdmin
        .from('assistant_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (convErr) throw convErr;
      if (!conv) return null;

      const { data: msgs, error: msgErr } = await supabaseAdmin
        .from('assistant_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (msgErr) throw msgErr;

      return {
        conversation: conv as AssistantConversationRecord,
        messages: (msgs as AssistantMessageRecord[]) || [],
      };
    }

    const conversation = this.state.assistant_conversations.find(
      (c) => c.id === conversationId && c.user_id === userId
    );
    if (!conversation) return null;

    const messages = this.state.assistant_messages
      .filter((m) => m.conversation_id === conversationId && m.user_id === userId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return { conversation, messages };
  }

  async addConversationMessage(
    userId: string,
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<AssistantMessageRecord> {
    if (this.useSupabase) {
      const { data, error } = await supabaseAdmin
        .from('assistant_messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role,
          content,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as AssistantMessageRecord;
    }

    const msg: AssistantMessageRecord = {
      id: uuidv4(),
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
      created_at: new Date().toISOString(),
    };
    this.state.assistant_messages.push(msg);
    this.saveLocalState();
    return msg;
  }

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    if (this.useSupabase) {
      const { count, error } = await supabaseAdmin
        .from('assistant_conversations')
        .delete({ count: 'exact' })
        .eq('id', conversationId)
        .eq('user_id', userId);
      if (error) throw error;
      return (count || 0) > 0;
    }

    const prev = this.state.assistant_conversations.length;
    this.state.assistant_conversations = this.state.assistant_conversations.filter(
      (c) => !(c.id === conversationId && c.user_id === userId)
    );
    if (this.state.assistant_conversations.length === prev) return false;
    this.state.assistant_messages = this.state.assistant_messages.filter(
      (m) => m.conversation_id !== conversationId
    );
    this.saveLocalState();
    return true;
  }
}

export const db = new DatabaseService();

