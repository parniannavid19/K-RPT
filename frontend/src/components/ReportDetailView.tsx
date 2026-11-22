import React, { useEffect, useRef, useState } from 'react';
import type { FieldBankItem, ParameterBankItem, ReportDetail, Tag, User } from '../types';
import { fieldBankApi, parameterBankApi, reportsApi, tagsApi } from '../api/client';
import { FormulaBuilder } from './FormulaBuilder';
import { MockReportPreview } from './MockReportPreview';
import { useToast } from './Toast';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Folder,
  GitCompare,
  GripVertical,
  Lock,
  Plus,
  Search,
  Sparkles,
  Tag as TagIcon,
  Terminal,
  Trash2,
  Unlock,
} from 'lucide-react';

interface ReportDetailViewProps {
  report: ReportDetail | null;
  currentUser: User | null;
  onRefresh: () => void;
  onCompareWith: (reportId: number) => void;
  isLoading: boolean;
  onReportDeleted?: () => void;
  moduleTitle?: string;
  fieldBankVersion?: number;
}

export const ReportDetailView: React.FC<ReportDetailViewProps> = ({
  report,
  currentUser,
  onRefresh,
  onCompareWith,
  isLoading,
  onReportDeleted,
  moduleTitle,
  fieldBankVersion,
}) => {
  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const prevReportIdRef = useRef<number | null>(null);

  // حالت‌های ویرایش
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSqlQuery, setEditSqlQuery] = useState('');
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [editFields, setEditFields] = useState<ReportDetail['fields']>([]);
  const [editParams, setEditParams] = useState<ReportDetail['parameters']>([]);
  const [editTags, setEditTags] = useState<Tag[]>([]);

  // برچسب جدید سریع در حالت ویرایش
  const [newTagNameInput, setNewTagNameInput] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // بانک‌های مرکزی جهت انتخاب
  const [availableBankFields, setAvailableBankFields] = useState<FieldBankItem[]>([]);
  const [selectedBankFieldId, setSelectedBankFieldId] = useState<number | ''>('');
  const [availableBankParams, setAvailableBankParams] = useState<ParameterBankItem[]>([]);
  const [selectedBankParamId, setSelectedBankParamId] = useState<number | ''>('');
  const [allSystemTags, setAllSystemTags] = useState<Tag[]>([]);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [fieldFilterText, setFieldFilterText] = useState('');

  // فیلدی که فرمول‌ساز آن در حال ویرایش است
  const [formulaEditingFieldIndex, setFormulaEditingFieldIndex] = useState<number | null>(null);
  // ایندکس فیلد در حال کشیدن با ماوس (Drag & Drop)
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null);

  // بستن ابزار فرمول‌ساز با کلید Esc
  useEffect(() => {
    if (formulaEditingFieldIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFormulaEditingFieldIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formulaEditingFieldIndex]);

  useEffect(() => {
    if (report) {
      const isDifferentReport = prevReportIdRef.current !== report.reportId;
      prevReportIdRef.current = report.reportId;

      setEditTitle(report.title);
      setEditDesc(report.functionalDescription || '');
      setEditSqlQuery(report.sqlQuery || '');

      if (isDifferentReport || !isEditing) {
        setEditFields(report.fields || []);
        setEditParams(report.parameters || []);
        setEditTags(report.tags || []);
        setIsEditing(false);
        setFormulaEditingFieldIndex(null);
      } else {
        // همگام‌سازی لحظه‌ای نام و مشخصات فیلدهای اصلاح‌شده در بانک بدون اختلال در فرم ویرایش باز
        setEditFields((prev) =>
          prev.map((pf) => {
            const updated = report.fields?.find((rf) => rf.fieldId === pf.fieldId);
            return updated
              ? { ...pf, displayName: updated.displayName, technicalName: updated.technicalName }
              : pf;
          })
        );
      }
    }
  }, [report]);

  // واکنش زنده به تغییرات بانک مرکزی فیلدها
  useEffect(() => {
    if (fieldBankVersion && fieldBankVersion > 0) {
      fieldBankApi.getAll().then((bankFields) => {
        setAvailableBankFields(bankFields);
        setEditFields((prev) =>
          prev.map((pf) => {
            const bf = bankFields.find((b) => b.fieldId === pf.fieldId);
            return bf
              ? { ...pf, displayName: bf.displayName, technicalName: bf.technicalName }
              : pf;
          })
        );
      });
      if (!isEditing) {
        onRefresh();
      }
    }
  }, [fieldBankVersion]);

  useEffect(() => {
    if (isEditing) {
      fieldBankApi.getAll().then(setAvailableBankFields);
      parameterBankApi.getAll().then(setAvailableBankParams);
      tagsApi.getAll().then(setAllSystemTags);
    }
  }, [isEditing]);

  // پالس ضربان قلب (Heartbeat) برای تمدید قفل به صورت خودکار هر ۶۰ ثانیه
  useEffect(() => {
    if (!report || !currentSessionId || !currentUser) return;

    const interval = setInterval(() => {
      reportsApi.heartbeat(report.reportId, currentSessionId).catch(() => {
        setCurrentSessionId(null);
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [report, currentSessionId, currentUser]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl animate-shimmer">
        <div className="h-4 w-48 bg-slate-200 rounded-md"></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 w-24 bg-slate-200 rounded-md"></div>
              <div className="h-7 w-72 bg-slate-200 rounded-md"></div>
            </div>
            <div className="h-9 w-32 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
        <div className="h-28 bg-white border border-slate-200 rounded-2xl"></div>
        <div className="h-48 bg-white border border-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-bold text-slate-600 mb-1">گزارشی انتخاب نشده است</h3>
        <p className="text-xs text-slate-400">لطفاً برای مشاهده و بررسی، یک گزارش را از درختواره سمت راست انتخاب کنید.</p>
      </div>
    );
  }

  const isLockedByMe = report.isLocked && currentUser && report.lockedByUserId === currentUser.userId;
  const isLockedByOther = report.isLocked && (!currentUser || report.lockedByUserId !== currentUser.userId);
  const canEdit = currentUser && (currentUser.roleId === 2 || currentUser.roleId === 3);

  const handleLock = async () => {
    if (!currentUser) {
      showToast('لطفاً ابتدا وارد سیستم شوید.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await reportsApi.lock(report.reportId);
      setCurrentSessionId(res.sessionId);
      showToast('گزارش با موفقیت قفل و آماده کار شد.', 'success');
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.message || 
        (err.response?.status === 401 ? 'نشست کاربری منقضی شده بود؛ لطفاً مجدداً دکمه قفل را بزنید.' : '') ||
        (err.response?.status === 403 ? 'دسترسی مجاز برای قفل‌گذاری این گزارش وجود ندارد.' : '') ||
        'خطا در تخصیص قفل';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlock = async () => {
    setActionLoading(true);
    try {
      await reportsApi.unlock(report.reportId, currentSessionId || undefined, currentUser?.roleId === 3);
      setCurrentSessionId(null);
      showToast('قفل گزارش آزاد شد.', 'info');
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در آزادسازی قفل', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!window.confirm('آیا از تایید نهایی این گزارش اطمینان دارید؟ وضعیت به «تایید شده» تغییر خواهد یافت.')) return;
    setActionLoading(true);
    try {
      await reportsApi.verify(report.reportId);
      showToast('گزارش با موفقیت تایید نهایی شد.', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در تایید گزارش', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!window.confirm(`آیا از حذف کامل گزارش «${report.title}» (${report.reportCode}) اطمینان دارید؟`)) return;
    setActionLoading(true);
    try {
      await reportsApi.delete(report.reportId);
      showToast('گزارش با موفقیت حذف شد.', 'info');
      if (onReportDeleted) onReportDeleted();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در حذف گزارش', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // افزودن فیلد از بانک فیلدها
  const handleAddFieldToReport = () => {
    if (!selectedBankFieldId) return;
    const found = availableBankFields.find((f) => f.fieldId === Number(selectedBankFieldId));
    if (!found) return;

    if (editFields.some((f) => f.fieldId === found.fieldId)) {
      showToast('این فیلد قبلاً به گزارش اضافه شده است.', 'error');
      return;
    }

    setEditFields([
      ...editFields,
      {
        fieldId: found.fieldId,
        displayName: found.displayName,
        technicalName: found.technicalName,
        displayOrder: editFields.length + 1,
        customFormula: '',
        customNote: '',
      },
    ]);
    setSelectedBankFieldId('');
    showToast(`فیلد «${found.displayName}» افزوده شد.`, 'success');
  };

  // حذف فیلد از گزارش با به‌روزرسانی ترتیب
  const handleRemoveFieldFromReport = (fieldId: number) => {
    const remaining = editFields.filter((f) => f.fieldId !== fieldId);
    const reindexed = remaining.map((f, idx) => ({
      ...f,
      displayOrder: idx + 1,
    }));
    setEditFields(reindexed);
  };

  // جابه‌جایی چیدمان فیلدها در گزارش (Move Up / Down)
  const handleMoveField = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= editFields.length) return;
    const updated = [...editFields];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);

    // بازشماری ترتیب نمایش بر اساس چیدمان جدید
    const reindexed = updated.map((f, idx) => ({
      ...f,
      displayOrder: idx + 1,
    }));
    setEditFields(reindexed);

    if (formulaEditingFieldIndex !== null) {
      if (formulaEditingFieldIndex === fromIndex) {
        setFormulaEditingFieldIndex(toIndex);
      } else if (formulaEditingFieldIndex === toIndex) {
        setFormulaEditingFieldIndex(fromIndex);
      }
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedFieldIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedFieldIndex === null || draggedFieldIndex === targetIndex) {
      setDraggedFieldIndex(null);
      return;
    }
    handleMoveField(draggedFieldIndex, targetIndex);
    setDraggedFieldIndex(null);
  };

  // افزودن پارامتر از بانک پارامترها
  const handleAddParamToReport = () => {
    if (!selectedBankParamId) return;
    const found = availableBankParams.find((p) => p.parameterBankId === Number(selectedBankParamId));
    if (!found) return;

    if (editParams.some((p) => p.parameterName.trim() === found.parameterName.trim())) {
      showToast('این پارامتر قبلاً به گزارش افزوده شده است.', 'error');
      return;
    }

    setEditParams([
      ...editParams,
      {
        parameterId: Math.floor(Math.random() * -1000), // موقت تا ذخیره در دیتابیس
        parameterName: found.parameterName,
        dataType: found.dataType,
        isRequired: found.defaultIsRequired,
        description: found.description || '',
      },
    ]);
    setSelectedBankParamId('');
    showToast(`پارامتر «${found.parameterName}» افزوده شد.`, 'success');
  };

  const handleRemoveParamFromReport = (idx: number) => {
    const updated = [...editParams];
    updated.splice(idx, 1);
    setEditParams(updated);
  };

  // تگ‌ها
  const toggleTagInReport = (tag: Tag) => {
    if (editTags.some((t) => t.tagId === tag.tagId)) {
      setEditTags(editTags.filter((t) => t.tagId !== tag.tagId));
    } else {
      setEditTags([...editTags, tag]);
    }
  };

  // ایجاد سریع برچسب و انتساب به گزارش
  const handleQuickCreateTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTagNameInput.trim()) return;
    setIsCreatingTag(true);
    try {
      const created = await tagsApi.create({ tagName: newTagNameInput.trim() });
      if (!allSystemTags.some((t) => t.tagId === created.tagId)) {
        setAllSystemTags((prev) => [...prev, created]);
      }
      if (!editTags.some((t) => t.tagId === created.tagId)) {
        setEditTags((prev) => [...prev, created]);
      }
      setNewTagNameInput('');
      showToast(`برچسب «${created.tagName}» ایجاد و به این گزارش انتساب یافت.`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ایجاد برچسب جدید', 'error');
    } finally {
      setIsCreatingTag(false);
    }
  };

  // کپی کوئری گزارش در کلیپ‌بورد
  const copyQueryToClipboard = (textToCopy?: string) => {
    const text = textToCopy !== undefined ? textToCopy : (isEditing ? editSqlQuery : report?.sqlQuery);
    if (!text || !text.trim()) {
      showToast('کوئری برای کپی وجود ندارد.', 'error');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedQuery(true);
    showToast('کوئری گزارش با موفقیت در کلیپ‌بورد کپی شد.', 'info');
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  // تولید خودکار ساختار اسکریپت کوئری استاندارد بر اساس فیلدها و شروط گزارش
  const generateDefaultQuery = (): string => {
    const currentFields = isEditing ? editFields : report?.fields || [];
    const currentParams = isEditing ? editParams : report?.parameters || [];
    const repTitle = isEditing ? editTitle : report?.title || '';
    const repCode = report?.reportCode || '';

    const cols = currentFields.map((f) => {
      const colName = f.technicalName ? `[${f.technicalName}]` : `[${f.displayName.replace(/\s+/g, '_')}]`;
      return `    ${colName} AS [${f.displayName}]`;
    });
    const colsStr = cols.length > 0 ? cols.join(',\n') : '    *';

    const whereClauses = currentParams.map((p) => {
      const paramName = p.parameterName.replace(/\s+/g, '_');
      return `    -- فیلتر: ${p.parameterName} (${p.isRequired ? 'اجباری' : 'اختیاری'})\n    AND (@${paramName} IS NULL OR [ستون_${paramName}] = @${paramName})`;
    });
    const whereStr = whereClauses.length > 0 ? '\n' + whereClauses.join('\n') : '';

    return `-- =============================================\n-- عنوان گزارش: ${repTitle}\n-- کد یکتا: ${repCode}\n-- استخراج‌شده از کاتالوگ گزارش‌ها (K-RPT)\n-- =============================================\nSELECT\n${colsStr}\nFROM [نام_جدول_یا_ویو]\nWHERE 1 = 1${whereStr};`;
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      await reportsApi.update(report.reportId, {
        title: editTitle,
        functionalDescription: editDesc,
        sqlQuery: editSqlQuery,
        fields: editFields,
        parameters: editParams,
        tags: editTags,
      });
      setIsEditing(false);
      showToast('تغییرات گزارش با موفقیت ذخیره شد.', 'success');
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.message || 
        (err.response?.status === 401 ? 'نشست کاربری منقضی شده بود؛ سیستم متصل شد، لطفاً دوباره دکمه ذخیره را بزنید.' : '') ||
        (err.response?.status === 403 ? 'دسترسی مجاز برای ذخیره تغییرات وجود ندارد.' : '') ||
        'خطا در ذخیره تغییرات';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredFields = (isEditing ? editFields : report.fields).filter((f) => {
    if (!fieldFilterText.trim()) return true;
    const term = fieldFilterText.toLowerCase();
    return (
      f.displayName.toLowerCase().includes(term) ||
      (f.technicalName && f.technicalName.toLowerCase().includes(term)) ||
      (f.customNote && f.customNote.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* بردکرامب (Breadcrumb) */}
      <nav aria-label="موقعیت در سامانه" className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
          <Folder className="w-3.5 h-3.5" />
          <span>{moduleTitle || 'ماژول سیستم'}</span>
        </span>
        <ChevronLeft className="w-3 h-3 text-slate-300" />
        <span className="font-bold text-slate-800">{report.title}</span>
        <span className="font-mono text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded">
          {report.reportCode}
        </span>
      </nav>

      {/* بنر وضعیت قفل */}
      {isLockedByOther && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between text-rose-800 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="font-bold text-rose-900">گزارش در حال بررسی است</p>
              <p className="text-[11px] text-rose-700">این گزارش هم‌اکنون توسط «{report.lockedByUserName}» در حال کار است (حالت مشاهده).</p>
            </div>
          </div>
          {currentUser?.roleId === 3 && (
            <button
              onClick={handleUnlock}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl font-bold shadow-xs transition-colors shrink-0"
            >
              آزادسازی قفل (ادمین)
            </button>
          )}
        </div>
      )}

      {isLockedByMe && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between text-blue-900 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Unlock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">قفل فعال: </span>
              <span className="text-blue-700">این گزارش در اختیار شماست و ضربان قلب فعال است.</span>
            </div>
          </div>
          <button
            onClick={handleUnlock}
            className="bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl font-bold transition-colors"
          >
            آزادسازی قفل
          </button>
        </div>
      )}

      {/* هدر شناسنامه گزارش */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
              {report.reportCode}
            </span>

            {report.status === 3 ? (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> تایید شده
              </span>
            ) : report.status === 2 ? (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
                <Edit3 className="w-3.5 h-3.5 text-blue-600" /> در حال تکمیل
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> در انتظار بررسی
              </span>
            )}
          </div>

          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-lg font-bold text-slate-900 border border-blue-300 rounded-xl px-3 py-1.5 w-full focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{report.title}</h1>
          )}

          {report.verifiedByUserName && (
            <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>تایید شده توسط {report.verifiedByUserName}</span>
            </p>
          )}
        </div>

        {/* دکمه‌های عملیاتی هدر */}
        <div className="flex items-center gap-2 shrink-0">
          {!report.isLocked && (
            <button
              onClick={handleLock}
              disabled={actionLoading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border border-slate-200 active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span>قفل‌گذاری و شروع کار</span>
            </button>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border border-slate-200 active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>ویرایش</span>
            </button>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={handleDeleteReport}
              disabled={actionLoading}
              title="حذف این گزارش"
              className="text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs p-2 rounded-xl transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3.5 py-2 rounded-xl font-medium"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-xs active:scale-95"
              >
                ذخیره تغییرات
              </button>
            </div>
          )}

          {report.status !== 3 && !isEditing && (
            <button
              onClick={handleVerify}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تایید نهایی گزارش</span>
            </button>
          )}
        </div>
      </div>

      {/* ۱. توضیحات کاربردی */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          توضیحات کاربردی و سناریوی استفاده
        </h3>
        {isEditing ? (
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={3}
            className="w-full text-xs text-slate-700 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 leading-relaxed"
            placeholder="سناریوی کاربردی گزارش را وارد کنید..."
          />
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {report.functionalDescription || 'توضیحات کاربردی برای این گزارش ثبت نشده است.'}
          </p>
        )}
      </div>

      {/* ۲. کوئری و اسکریپت استخراج داده‌های گزارش (SQL Query) با قابلیت کپی در کلیپ‌بورد */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-xs">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                کوئری و اسکریپت دیتابیس گزارش (SQL Query)
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditing
                  ? 'کوئری استخراج گزارش را وارد کرده یا جهت استفاده در محیط پایگاه داده در کلیپ‌بورد کپی فرمایید.'
                  : 'اسکریپت و کدهای SQL استخراج داده‌های این گزارش'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  const q = generateDefaultQuery();
                  setEditSqlQuery(q);
                  showToast('کوئری نمونه بر اساس فیلدها و شروط گزارش تولید شد.', 'info');
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-indigo-200 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>تولید خودکار کوئری نمونه</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const targetText = isEditing ? (editSqlQuery || generateDefaultQuery()) : (report.sqlQuery || generateDefaultQuery());
                copyQueryToClipboard(targetText);
              }}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer ${
                copiedQuery
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copiedQuery ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedQuery ? 'کپی شد!' : 'کپی کوئری در کلیپ‌بورد'}</span>
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="relative">
            <textarea
              value={editSqlQuery}
              onChange={(e) => setEditSqlQuery(e.target.value)}
              rows={7}
              className="w-full text-xs font-mono text-emerald-400 bg-slate-950 border border-slate-800 rounded-2xl p-4 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed shadow-inner select-all"
              placeholder="-- کوئری یا اسکریپت استخراج گزارش را اینجا وارد نمایید (یا از دکمه «تولید خودکار کوئری نمونه» استفاده فرمایید)..."
              dir="ltr"
            />
          </div>
        ) : report.sqlQuery ? (
          <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs leading-relaxed border border-slate-800 overflow-x-auto text-left shadow-inner select-all" dir="ltr">
            <pre className="whitespace-pre-wrap">{report.sqlQuery}</pre>
          </div>
        ) : (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>اسکریپت SQL اختصاصی برای این گزارش ثبت نشده است (در حالت ویرایش می‌توانید کوئری را وارد یا تولید فرمایید).</span>
            <button
              type="button"
              onClick={() => copyQueryToClipboard(generateDefaultQuery())}
              className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 font-bold shadow-2xs shrink-0 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>کپی قالب کوئری استاندارد این گزارش</span>
            </button>
          </div>
        )}
      </div>

      {/* ۳. فیلدهای خروجی گزارش (بانک مرکزی فیلدها) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              فیلدهای خروجی گزارش (بانک مرکزی فیلدها)
            </h3>
            <span className="text-[11px] text-slate-500">
              تعداد: {filteredFields.length} فیلد
              {isEditing && (
                <span className="text-indigo-600 font-bold mr-2">
                  (با دکمه‌های فلش یا کشیدن سطرها چیدمان ستون‌ها را تنظیم کنید)
                </span>
              )}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            <input
              type="text"
              value={fieldFilterText}
              onChange={(e) => setFieldFilterText(e.target.value)}
              placeholder="فیلتر فیلدها..."
              className="text-xs pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* انتخاب فیلد جدید از بانک فیلدها در حالت ویرایش */}
        {isEditing && (
          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <select
              value={selectedBankFieldId}
              onChange={(e) => setSelectedBankFieldId(e.target.value ? Number(e.target.value) : '')}
              className="flex-1 text-xs border border-slate-300 rounded-xl p-2 bg-white"
            >
              <option value="">انتخاب فیلد از بانک مرکزی فیلدها جهت اضافه کردن...</option>
              {availableBankFields.map((bf) => (
                <option key={bf.fieldId} value={bf.fieldId}>
                  {bf.displayName} {bf.technicalName ? `(${bf.technicalName})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddFieldToReport}
              disabled={!selectedBankFieldId}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن به گزارش</span>
            </button>
          </div>
        )}

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                <th className="py-2.5 px-3 w-16 text-center">چیدمان / ردیف</th>
                <th className="py-2.5 px-3">عنوان استاندارد</th>
                <th className="py-2.5 px-3 font-mono">نام فنی/دیتابیسی</th>
                <th className="py-2.5 px-3">توضیح اختصاصی / فرمول خاص این فیلد</th>
                {isEditing && <th className="py-2.5 px-2 text-center w-28">عملیات و چیدمان</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFields.map((field, idx) => {
                const canReorder = isEditing && !fieldFilterText;
                return (
                  <tr
                    key={field.fieldId}
                    draggable={canReorder}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      canReorder ? 'cursor-move' : ''
                    } ${
                      draggedFieldIndex === idx
                        ? 'opacity-40 bg-indigo-50 border-2 border-dashed border-indigo-400'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center border-l border-slate-100">
                      <div className="flex items-center justify-center gap-1.5">
                        {canReorder && (
                          <span
                            title="برای تغییر ترتیب، این سطر را با ماوس بکشید و در جایگاه دلخواه رها کنید (Drag & Drop)"
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 p-0.5 rounded hover:bg-slate-200/60 transition-colors"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span className="font-mono text-slate-700 font-bold text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 min-w-5 text-center">
                          {idx + 1}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{field.displayName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{field.technicalName || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={field.customNote || ''}
                            onChange={(e) => {
                              const updated = [...editFields];
                              updated[idx] = { ...updated[idx], customNote: e.target.value };
                              setEditFields(updated);
                            }}
                            placeholder="توضیح تفاوت یا یادداشت خاص..."
                            className="w-full text-xs border border-slate-300 rounded-lg p-1.5"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={field.customFormula || ''}
                              onChange={(e) => {
                                const updated = [...editFields];
                                updated[idx] = { ...updated[idx], customFormula: e.target.value };
                                setEditFields(updated);
                              }}
                              placeholder="فرمول اختصاصی این فیلد (اختیاری)..."
                              className="flex-1 text-[11px] font-mono border border-slate-200 rounded-lg p-1 bg-slate-50"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              onClick={() => setFormulaEditingFieldIndex(formulaEditingFieldIndex === idx ? null : idx)}
                              className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded font-bold"
                            >
                              عملگرها
                            </button>
                          </div>

                          {/* فرمول‌ساز بازشونده برای فیلد مشخص */}
                          {formulaEditingFieldIndex === idx && (
                            <div className="pt-2">
                              <FormulaBuilder
                                formula={field.customFormula || ''}
                                onChange={(val) => {
                                  const updated = [...editFields];
                                  updated[idx] = { ...updated[idx], customFormula: val };
                                  setEditFields(updated);
                                }}
                                availableFields={editFields.filter((_, i) => i !== idx)}
                                label={`فرمول محاسباتی فیلد «${field.displayName}»`}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {field.customNote && (
                            <p className="text-slate-600 text-xs">{field.customNote}</p>
                          )}
                          {field.customFormula && (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 bg-indigo-50/90 text-indigo-700 border border-indigo-200/90 px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-2xs" dir="auto">
                                <span className="text-[10px] bg-indigo-600 text-white px-1 py-0.2 rounded font-mono font-bold">fx</span>
                                <span>{field.customFormula}</span>
                              </span>
                            </div>
                          )}
                          {!field.customNote && !field.customFormula && <span className="text-slate-400">-</span>}
                        </div>
                      )}
                    </td>
                    {isEditing && (
                      <td className="py-2.5 px-2 text-center border-r border-slate-100">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveField(idx, idx - 1)}
                            disabled={idx === 0 || Boolean(fieldFilterText)}
                            title="انتقال به بالا (یک پله جلوتر در پیش‌نمایش)"
                            className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-slate-400 p-1 rounded hover:bg-slate-100 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveField(idx, idx + 1)}
                            disabled={idx === editFields.length - 1 || Boolean(fieldFilterText)}
                            title="انتقال به پایین (یک پله عقب‌تر در پیش‌نمایش)"
                            className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-slate-400 p-1 rounded hover:bg-slate-100 transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFieldFromReport(field.fieldId)}
                            title="حذف فیلد از گزارش"
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors mr-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ۴. پیش‌نمایش و خروجی شبیه‌سازی‌شده گزارش (با تفکیک رنگ ستون‌های فرمول‌دار) */}
      <MockReportPreview
        reportTitle={isEditing ? editTitle : report.title}
        reportCode={report.reportCode}
        fields={isEditing ? editFields : (report.fields || [])}
        parameters={isEditing ? editParams : (report.parameters || [])}
        onOpenFieldManager={() => setIsEditing(true)}
      />

      {/* ۵. پارامترهای ورودی (متصل به بانک پارامترها) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600" />
            پارامترهای ورودی گزارش (فیلترها)
          </h3>
          <span className="text-[11px] text-slate-500">
            تعداد: {isEditing ? editParams.length : report.parameters.length} پارامتر
          </span>
        </div>

        {/* انتخاب پارامتر از بانک پارامترها در حالت ویرایش */}
        {isEditing && (
          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-3">
            <select
              value={selectedBankParamId}
              onChange={(e) => setSelectedBankParamId(e.target.value ? Number(e.target.value) : '')}
              className="flex-1 text-xs border border-slate-300 rounded-xl p-2 bg-white"
            >
              <option value="">انتخاب پارامتر از مخزن مرکزی پارامترها...</option>
              {availableBankParams.map((bp) => (
                <option key={bp.parameterBankId} value={bp.parameterBankId}>
                  {bp.parameterName} ({bp.defaultIsRequired ? 'اجباری' : 'اختیاری'})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddParamToReport}
              disabled={!selectedBankParamId}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن پارامتر</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(isEditing ? editParams : report.parameters).map((param, pIdx) => (
            <div key={param.parameterId || pIdx} className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/70 space-y-1 relative group">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-900">{param.parameterName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  param.isRequired ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {param.isRequired ? 'اجباری' : 'اختیاری'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">{param.description || 'بدون توضیح'}</p>

              {isEditing && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 mt-2">
                  <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={param.isRequired}
                      onChange={(e) => {
                        const updated = [...editParams];
                        updated[pIdx] = { ...updated[pIdx], isRequired: e.target.checked };
                        setEditParams(updated);
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span>اجباری</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveParamFromReport(pIdx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ۶. برچسب‌ها و گزارش‌های مرتبط */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* برچسب‌ها */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-blue-500" />
              برچسب‌های گزارش
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {isEditing ? `${editTags.length} برچسب انتخاب‌شده` : `${report.tags.length} برچسب فعال`}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              {/* ایجاد سریع برچسب جدید */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <input
                  type="text"
                  value={newTagNameInput}
                  onChange={(e) => setNewTagNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickCreateTag();
                    }
                  }}
                  placeholder="ایجاد برچسب جدید (مثلاً: مالی)..."
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleQuickCreateTag}
                  disabled={!newTagNameInput.trim() || isCreatingTag}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shrink-0 shadow-2xs transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isCreatingTag ? '...' : 'افزودن'}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500">برای تخصیص یا لغو تخصیص، روی برچسب‌های زیر کلیک فرمایید:</p>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100">
                  {allSystemTags.map((tag) => {
                    const isChecked = editTags.some((t) => t.tagId === tag.tagId);
                    return (
                      <button
                        key={tag.tagId}
                        type="button"
                        onClick={() => toggleTagInReport(tag)}
                        style={{
                          backgroundColor: isChecked ? tag.colorHex : `${tag.colorHex}15`,
                          color: isChecked ? '#fff' : tag.colorHex,
                          borderColor: tag.colorHex,
                        }}
                        className={`text-xs font-bold px-3 py-1 rounded-xl border transition-all cursor-pointer ${
                          isChecked ? 'shadow-xs scale-105 ring-2 ring-offset-1' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        #{tag.tagName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 min-h-12 items-center">
              {report.tags.length === 0 ? (
                <p className="text-xs text-slate-400">برچسبی به این گزارش تخصیص داده نشده است (جهت انتساب، دکمه ویرایش بالای صفحه را بزنید).</p>
              ) : (
                report.tags.map((tag) => (
                  <span
                    key={tag.tagId}
                    style={{ backgroundColor: `${tag.colorHex}15`, color: tag.colorHex }}
                    className="text-xs font-bold px-3 py-1 rounded-xl border border-current shadow-2xs"
                  >
                    #{tag.tagName}
                  </span>
                ))
              )}
            </div>
          )}
        </div>

        {/* گزارش‌های مرتبط */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-purple-600" />
            گزارش‌های مشابه و مرتبط
          </h3>
          {report.relations.length === 0 ? (
            <p className="text-xs text-slate-400">ارتباط یا تبارشناسی برای این گزارش ثبت نشده است.</p>
          ) : (
            <div className="space-y-2">
              {report.relations.map((rel) => (
                <div key={rel.relationId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800">{rel.targetTitle}</span>
                    <span className="text-[10px] text-slate-400 font-mono mr-2">({rel.targetReportCode})</span>
                  </div>
                  <button
                    onClick={() => onCompareWith(rel.targetReportId)}
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold"
                  >
                    <span>مقایسه</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
