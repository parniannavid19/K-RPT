import React, { useEffect, useState } from 'react';
import type { PermissionItem, PermissionTreeNode, User } from '../types';
import {
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FolderInput,
  Hash,
  Info,
  KeyRound,
  Layers,
  Lock,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { permissionsApi } from '../api/client';
import { useToast } from './Toast';

interface PermissionDetailViewProps {
  permission: PermissionItem | null;
  treeNodes: PermissionTreeNode[];
  currentUser: User | null;
  onRefresh: () => void;
  onDeleted?: () => void;
  isLoading: boolean;
}

export const PermissionDetailView: React.FC<PermissionDetailViewProps> = ({
  permission,
  treeNodes,
  currentUser,
  onRefresh,
  onDeleted,
  isLoading,
}) => {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockSessionId, setLockSessionId] = useState<string | null>(null);

  // مودال انتقال به سطح دیگر
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetMoveNodeId, setTargetMoveNodeId] = useState<number>(0);
  const [isMoving, setIsMoving] = useState(false);

  // فیلدهای فرم در حالت ویرایش
  const [persianName, setPersianName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [resourceNumber, setResourceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<number>(0);

  // همگام‌سازی فیلدها با اطلاعات دریافت شده
  useEffect(() => {
    if (permission) {
      setPersianName(permission.persianName || '');
      setEnglishName(permission.englishName || '');
      setResourceNumber(permission.resourceNumber || '');
      setDescription(permission.description || '');
      setSelectedNodeId(permission.nodeId);
      setIsEditing(false);
      setLockSessionId(null);
    }
  }, [permission?.permissionId]);

  // آزادسازی خودکار قفل در صورت بستن یا جابجایی تب یا خروج از صفحه
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isEditing && permission?.permissionId && lockSessionId) {
        navigator.sendBeacon?.(
          `/api/permissions/${permission.permissionId}/unlock?sessionId=${lockSessionId}`
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isEditing && permission?.permissionId && lockSessionId) {
        permissionsApi.unlock(permission.permissionId, lockSessionId).catch(() => {});
      }
    };
  }, [isEditing, permission?.permissionId, lockSessionId]);

  // ارسال ضربان قلب (Heartbeat) قفل هر ۱۵ ثانیه
  useEffect(() => {
    if (!isEditing || !permission?.permissionId || !lockSessionId) return;

    const interval = setInterval(() => {
      permissionsApi.heartbeat(permission.permissionId, lockSessionId).catch(() => {
        showToast('نشست ویرایش شما منقضی شده است.', 'warning');
        setIsEditing(false);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isEditing, permission?.permissionId, lockSessionId]);

  // لیست گره‌ها برای سلکتور تغییر سطح
  const flatNodes = React.useMemo(() => {
    const list: { nodeId: number; title: string; depth: number; resourceCode?: string }[] = [];
    const traverse = (items: PermissionTreeNode[], depth = 0) => {
      for (const item of items) {
        list.push({
          nodeId: item.nodeId,
          title: item.title,
          depth,
          resourceCode: item.resourceCode,
        });
        if (item.children && item.children.length > 0) {
          traverse(item.children, depth + 1);
        }
      }
    };
    traverse(treeNodes);
    return list;
  }, [treeNodes]);

  // پیدا کردن مسیر کامل درختی برای Breadcrumb
  const breadcrumbPath = React.useMemo(() => {
    if (!permission) return [];
    const path: { title: string; resourceCode?: string }[] = [];

    const findPath = (nodes: PermissionTreeNode[], targetId: number): boolean => {
      for (const n of nodes) {
        if (n.nodeId === targetId) {
          path.unshift({ title: n.title, resourceCode: n.resourceCode });
          return true;
        }
        if (n.children && n.children.length > 0) {
          if (findPath(n.children, targetId)) {
            path.unshift({ title: n.title, resourceCode: n.resourceCode });
            return true;
          }
        }
      }
      return false;
    };

    findPath(treeNodes, permission.nodeId);
    return path;
  }, [treeNodes, permission?.nodeId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span>در حال دریافت شناسنامه دسترسی...</span>
        </div>
      </div>
    );
  }

  if (!permission) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 max-w-sm">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm mb-1">دسترسی مورد نظر را انتخاب نمایید</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            از منوی درختی سمت راست، یکی از سطوح را باز کرده و بر روی عنوان دسترسی کلیک فرمایید تا شناسنامه و مشخصات آن
            نمایش داده شود.
          </p>
        </div>
      </div>
    );
  }

  // آیا قفل توسط کاربر دیگری نگه‌داشته شده است؟
  const isLockedByOther =
    permission.isLocked &&
    currentUser &&
    permission.lockedByUserId !== null &&
    permission.lockedByUserId !== currentUser.userId;

  // ۱. شروع ویرایش (تخصیص خودکار قفل)
  const handleStartEdit = async () => {
    try {
      const res = await permissionsApi.lock(permission.permissionId);
      if (res.success) {
        setLockSessionId(res.sessionId);
        setIsEditing(true);
        showToast('قفل دسترسی با موفقیت تخصیص یافت و حالت ویرایش فعال شد.', 'info');
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `این دسترسی هم‌اکنون توسط «${permission.lockedByUserName || 'کاربر دیگر'}» در حال ویرایش است.`;
      showToast(errorMsg, 'error');
    }
  };

  // ۲. انصراف از ویرایش و آزادسازی قفل
  const handleCancelEdit = async () => {
    if (lockSessionId) {
      try {
        await permissionsApi.unlock(permission.permissionId, lockSessionId);
      } catch {
        // نادیده‌گرفتن خطا در خروج
      }
    }
    setPersianName(permission.persianName || '');
    setEnglishName(permission.englishName || '');
    setResourceNumber(permission.resourceNumber || '');
    setDescription(permission.description || '');
    setSelectedNodeId(permission.nodeId);
    setIsEditing(false);
    setLockSessionId(null);
    onRefresh();
  };

  // ۳. ذخیره تغییرات دسترسی (نام انگلیسی اختیاری است)
  const handleSaveChanges = async () => {
    if (!persianName.trim() || !resourceNumber.trim()) {
      showToast('نام فارسی و شماره منبع الزامی هستند.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await permissionsApi.update(permission.permissionId, {
        persianName: persianName.trim(),
        englishName: englishName.trim() || undefined,
        resourceNumber: resourceNumber.trim(),
        description: description.trim() || undefined,
        nodeId: selectedNodeId !== permission.nodeId ? selectedNodeId : undefined,
      });

      showToast('تغییرات با موفقیت ذخیره شد و وضعیت به «قابل بررسی» تغییر یافت.', 'success');
      setIsEditing(false);
      setLockSessionId(null);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'خطا در ذخیره تغییرات دسترسی.';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ۴. تایید نهایی دسترسی
  const handleVerify = async () => {
    if (!confirm('آیا از تایید نهایی این دسترسی اطمینان دارید؟')) return;

    setIsVerifying(true);
    try {
      await permissionsApi.verify(permission.permissionId);
      showToast('دسترسی با موفقیت تایید شد.', 'success');
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      showToast('خطا در تایید دسترسی.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // ۵. حذف دسترسی
  const handleDeletePermission = async () => {
    if (!confirm(`آیا از حذف دسترسی «${permission.persianName}» اطمینان دارید؟`)) return;

    try {
      await permissionsApi.delete(permission.permissionId);
      showToast('دسترسی با موفقیت حذف شد.', 'success');
      onDeleted?.();
    } catch (err: unknown) {
      console.error(err);
      showToast('خطا در حذف دسترسی.', 'error');
    }
  };

  // ۶. انتقال سریع دسترسی به سطح دیگر
  const handleQuickMove = async () => {
    if (!targetMoveNodeId || targetMoveNodeId === permission.nodeId) {
      setShowMoveModal(false);
      return;
    }

    setIsMoving(true);
    try {
      await permissionsApi.move(permission.permissionId, targetMoveNodeId);
      showToast('دسترسی با موفقیت به سطح انتخابی منتقل شد.', 'success');
      setShowMoveModal(false);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      showToast('خطا در انتقال دسترسی.', 'error');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/60">
      {/* نوار وضعیت قفل توسط سایر کاربران */}
      {isLockedByOther && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-rose-800 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>این دسترسی توسط «{permission.lockedByUserName}» در حال ویرایش است.</span>
          </div>
          <span className="text-[11px] font-normal text-rose-600 bg-white/80 px-2 py-0.5 rounded-md border border-rose-200">
            امکان ویرایش هم‌زمان مسدود می‌باشد
          </span>
        </div>
      )}

      {/* نوار وضعیت حالت ویرایش کاربر جاری */}
      {isEditing && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 flex items-center justify-between text-blue-900 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-600" />
            <span>شما در حال حاضر این دسترسی را در حالت ویرایش قفل کرده‌اید.</span>
          </div>
          <span className="text-[11px] font-normal text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
            ضربان قفل فعال است
          </span>
        </div>
      )}

      {/* هدر شناسنامه دسترسی */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            {/* مسیر ساختار درختی (Breadcrumb) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium overflow-x-auto pb-0.5">
              <span className="text-slate-400">ساختار درختی دسترسی‌ها</span>
              {breadcrumbPath.map((item, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                    <span>{item.title}</span>
                    {item.resourceCode && (
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded border border-slate-200">
                        {item.resourceCode}
                      </span>
                    )}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* عنوان اصلی دسترسی */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {isEditing ? (
                  <span className="text-blue-700">ویرایش دسترسی: {permission.persianName}</span>
                ) : (
                  permission.persianName
                )}
              </h1>

              {/* برچسب شماره منبع */}
              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-0.5 rounded-lg font-mono font-bold">
                <Hash className="w-3.5 h-3.5" />
                <span>{permission.resourceNumber}</span>
              </span>

              {/* برچسب نام انگلیسی (در صورت وجود) */}
              {permission.englishName && (
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-lg font-mono font-medium border border-slate-200" dir="ltr">
                  {permission.englishName}
                </span>
              )}

              {/* برچسب وضعیت */}
              {permission.status === 3 ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-lg font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تایید شده</span>
                </span>
              ) : permission.status === 2 ? (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-lg font-bold">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>قابل بررسی</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-lg font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>در انتظار</span>
                </span>
              )}
            </div>
          </div>

          {/* نوار دکمه‌های عملیاتی */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>انصراف</span>
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>ذخیره تغییرات</span>
                </button>
              </>
            ) : (
              <>
                {/* دکمه انتقال دسترسی به سطح دیگر */}
                <button
                  onClick={() => {
                    setTargetMoveNodeId(permission.nodeId);
                    setShowMoveModal(true);
                  }}
                  title="انتقال این دسترسی به سطح یا شاخه دیگر"
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <FolderInput className="w-4 h-4 text-slate-600" />
                  <span>انتقال به سطح دیگر</span>
                </button>

                {/* دکمه ویرایش (با قفل‌گذاری خودکار) */}
                <button
                  onClick={handleStartEdit}
                  disabled={Boolean(isLockedByOther)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Edit3 className="w-4 h-4 text-slate-600" />
                  <span>ویرایش دسترسی</span>
                </button>

                {/* دکمه تایید دسترسی */}
                {permission.status !== 3 && currentUser && currentUser.roleId >= 2 && (
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying || Boolean(isLockedByOther)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>تایید دسترسی</span>
                  </button>
                )}

                {/* دکمه حذف دسترسی */}
                <button
                  onClick={handleDeletePermission}
                  disabled={Boolean(isLockedByOther)}
                  title="حذف دائمی این دسترسی"
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>حذف</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* محتوای اسکرول‌شونده مشخصات دسترسی */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ۱. کارت مشخصات اصلی دسترسی */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">مشخصات اصلی و شماره منبع دسترسی</h2>
              <p className="text-[11px] text-slate-500">عناوین، شناسه منبع و موقعیت شاخه درختی</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* نام فارسی */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نام فارسی دسترسی <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={persianName}
                  onChange={(e) => setPersianName(e.target.value)}
                  placeholder="مثال: مشاهده فهرست کاربران"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-semibold"
                />
              ) : (
                <div className="text-xs font-bold text-slate-900 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span>{permission.persianName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(permission.persianName);
                      showToast('نام فارسی دسترسی در کلیپ‌بورد کپی شد.', 'info');
                    }}
                    title="کپی نام فارسی دسترسی"
                    className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* نام انگلیسی (اختیاری) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نام انگلیسی (سیستمی - اختیاری)
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={englishName}
                  onChange={(e) => setEnglishName(e.target.value)}
                  placeholder="مثال: ViewUserList (اختیاری)"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                  dir="ltr"
                />
              ) : (
                <div className="text-xs font-mono font-medium text-slate-800 p-2.5 rounded-xl bg-slate-50 border border-slate-100" dir="ltr">
                  {permission.englishName || <span className="text-slate-400 italic font-sans">— بدون نام انگلیسی —</span>}
                </div>
              )}
            </div>

            {/* شماره منبع */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                شماره / کد منبع دسترسی <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={resourceNumber}
                  onChange={(e) => setResourceNumber(e.target.value)}
                  placeholder="مثال: 1001 یا PERM-1001"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-blue-600 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                  dir="ltr"
                />
              ) : (
                <div className="text-xs font-mono font-bold text-blue-700 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between" dir="ltr">
                  <span>{permission.resourceNumber}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(permission.resourceNumber);
                      showToast('شماره منبع در کلیپ‌بورد کپی شد.', 'info');
                    }}
                    title="کپی شماره منبع"
                    className="text-blue-500 hover:text-blue-800 p-0.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* سطح درختی و کد منبع سطح */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سطح ساختار درختی (مکان قرارگیری)
              </label>
              {isEditing ? (
                <select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                >
                  {flatNodes.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {'— '.repeat(n.depth)} {n.title} {n.resourceCode ? `(${n.resourceCode})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-slate-800 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold">{permission.nodeTitle || 'سطح عمومی'}</span>
                    {permission.nodeTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(permission.nodeTitle!);
                          showToast('نام سطح ساختار در کلیپ‌بورد کپی شد.', 'info');
                        }}
                        title="کپی نام سطح"
                        className="text-slate-400 hover:text-blue-600 p-0.5"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    {permission.nodeResourceCode && (
                      <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded-md">
                        کد منبع سطح: {permission.nodeResourceCode}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setTargetMoveNodeId(permission.nodeId);
                      setShowMoveModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    <span>تغییر مکان</span>
                  </button>
                </div>
              )}
            </div>

            {/* کد منبع سطح جاری */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                کد منبع سطح والد
              </label>
              <div className="text-xs font-mono text-slate-700 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between" dir="ltr">
                <span>{permission.nodeResourceCode || '— بدون کد —'}</span>
                {permission.nodeResourceCode && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(permission.nodeResourceCode!);
                      showToast('کد منبع سطح والد در کلیپ‌بورد کپی شد.', 'info');
                    }}
                    title="کپی کد منبع سطح والد"
                    className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ۲. باکس ویژه درج توضیحات دسترسی */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">باکس درج توضیحات دسترسی</h2>
                <p className="text-[11px] text-slate-500">
                  شرح کامل شرایط بهره‌برداری، متدهای مرتبط، رفتار امنیتی و یادداشت‌های عملکردی
                </p>
              </div>
            </div>

            {isEditing && (
              <span className="text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                در حال ویرایش متن توضیحات
              </span>
            )}
          </div>

          {isEditing ? (
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="در این قسمت توضیحات دقیق عملکرد دسترسی، فرم‌ها و منوهای مرتبط، وابستگی‌ها و نقش‌های واجد شرایط را درج نمایید..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all leading-relaxed resize-y"
            />
          ) : (
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-700 leading-relaxed min-h-[90px] whitespace-pre-wrap">
              {permission.description ? (
                permission.description
              ) : (
                <span className="text-slate-400 italic">
                  هنوز توضیحاتی برای این دسترسی ثبت نشده است. برای درج توضیحات بر روی دکمه «ویرایش دسترسی» کلیک فرمایید.
                </span>
              )}
            </div>
          )}
        </div>

        {/* ۳. کارت وضعیت تاییدات و شناسنامه رخدادها */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">اطلاعات تایید و تاریخچه ثبت</h2>
              <p className="text-[11px] text-slate-500">گزارش وضعیت اعتبارسنجی و آخرین تغییرات</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* وضعیت تایید */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 text-[10px] block font-medium">وضعیت فرآیندی</span>
              <div className="font-bold">
                {permission.status === 3 ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تایید شده نهایی</span>
                  </span>
                ) : permission.status === 2 ? (
                  <span className="text-blue-700 flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>قابل بررسی</span>
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>در انتظار تکمیل</span>
                  </span>
                )}
              </div>
            </div>

            {/* کاربر تاییدکننده */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 text-[10px] block font-medium">تاییدکننده</span>
              <div className="font-bold text-slate-800">
                {permission.verifiedByUserName || '— هنوز تایید نشده —'}
              </div>
            </div>

            {/* تاریخ تایید */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 text-[10px] block font-medium">تاریخ تایید</span>
              <div className="font-mono text-slate-700">
                {permission.verifiedAt ? new Date(permission.verifiedAt).toLocaleDateString('fa-IR') : '—'}
              </div>
            </div>

            {/* تاریخ آخرین به‌روزرسانی */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 text-[10px] block font-medium">آخرین به‌روزرسانی</span>
              <div className="font-mono text-slate-700">
                {permission.updatedAt ? new Date(permission.updatedAt).toLocaleDateString('fa-IR') : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* مدال انتقال سریع دسترسی به سطح دیگر */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-blue-600" />
                <span>انتقال دسترسی به سطح دیگر</span>
              </h3>
              <button
                onClick={() => setShowMoveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-500 block mb-1">دسترسی انتخابی:</span>
                <span className="font-bold text-slate-900">{permission.persianName}</span>
                <span className="font-mono text-blue-600 mr-2 font-bold">#{permission.resourceNumber}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  انتخاب سطح مقصد در درختواره
                </label>
                <select
                  value={targetMoveNodeId}
                  onChange={(e) => setTargetMoveNodeId(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                >
                  {flatNodes.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {'— '.repeat(n.depth)} {n.title} {n.resourceCode ? `(${n.resourceCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  disabled={isMoving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleQuickMove}
                  disabled={isMoving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  {isMoving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FolderInput className="w-4 h-4" />}
                  <span>تایید انتقال</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
