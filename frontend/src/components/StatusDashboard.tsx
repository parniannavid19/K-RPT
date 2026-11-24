import React, { useEffect, useState } from 'react';
import type { DashboardStats, SystemDomain, User } from '../types';
import { dashboardApi } from '../api/client';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  Edit3,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';

interface StatusDashboardProps {
  onNavigateDomain: (domain: SystemDomain) => void;
  currentUser: User | null;
  onOpenFieldBank?: () => void;
  onOpenAdminSettings?: () => void;
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({
  onNavigateDomain,
  currentUser,
  onOpenFieldBank,
  onOpenAdminSettings,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/70 p-6 space-y-6 select-none">
      {/* ۱. بنر خوش‌آمدگویی و هدر داشبورد */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-96 bg-white/5 blur-3xl rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-white/15 border border-white/20 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>داشبورد وضعیت یکپارچه</span>
              </span>
              <span className="text-blue-200 text-xs font-mono">سیستم کا د گ</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              پایش جامع وضعیت گزارش‌ها، دسترسی‌ها و کانفیگ‌ها
            </h1>
            <p className="text-xs text-blue-100/80 leading-relaxed max-w-2xl">
              خلاصه برخط وضعیت اعتبارسنجی، گزارش‌های در دست بررسی، درختواره دسترسی‌ها و آمادگی زیرسیستم‌های نرم‌افزار.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchStats}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-xs"
              title="تازه‌سازی آمار"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تازه‌سازی</span>
            </button>
            <div className="text-[11px] text-blue-200 bg-white/10 border border-white/15 px-3 py-2 rounded-xl flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-300" />
              <span>به‌روزرسانی: {lastUpdated.toLocaleTimeString('fa-IR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ۲. کارت‌های شاخص کلیدی بالا (Top Key Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* کل موجودیت‌ها */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">کل اقلام ثبت‌شده</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {stats ? (stats.summary.totalEntities).toLocaleString('fa-IR') : '—'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">موجودیت فعال</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <span>گزارش‌ها: {stats?.reports.total ?? 0}</span>
            <span className="text-slate-300">•</span>
            <span>دسترسی‌ها: {stats?.permissions.total ?? 0}</span>
          </div>
        </div>

        {/* نرخ تایید و بررسی کلی */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">نرخ تایید نهایی</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {stats ? `${stats.summary.verificationRate}٪` : '—'}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold">
              ({stats ? (stats.summary.totalVerified).toLocaleString('fa-IR') : 0} تایید شده)
            </span>
          </div>
          {/* نوار پیشرفت */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats?.summary.verificationRate ?? 0}%` }}
            />
          </div>
        </div>

        {/* نیازمند اقدام و بررسی */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">در انتظار بررسی و اقدام</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 font-mono">
              {stats ? (stats.summary.totalPending + stats.summary.totalUnderReview).toLocaleString('fa-IR') : '—'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">مورد بازبینی</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <span>در انتظار: {stats?.summary.totalPending ?? 0}</span>
            <span className="text-slate-300">•</span>
            <span>قابل بررسی: {stats?.summary.totalUnderReview ?? 0}</span>
          </div>
        </div>

        {/* نشست‌های قفل و ویرایش هم‌زمان */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">نشست‌های فعال ویرایش</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 font-mono">
              {stats ? stats.summary.totalLocked.toLocaleString('fa-IR') : '۰'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">قفل همروندی</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <span>گزارش‌ها: {stats?.reports.locked ?? 0}</span>
            <span className="text-slate-300">•</span>
            <span>دسترسی‌ها: {stats?.permissions.locked ?? 0}</span>
          </div>
        </div>
      </div>

      {/* ۳. کارت‌های تفصیلی دامنه‌های اصلی (گزارش‌ها | دسترسی‌ها | کانفیگ‌ها) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* پنل ۱: گزارش‌ها (Reports Domain) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-5 hover:border-blue-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">وضعیت گزارش‌ها</h3>
                  <span className="text-[11px] text-slate-400">کاتالوگ و درختواره گزارش‌های سامانه</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                {stats?.reports.total ?? 0} گزارش
              </span>
            </div>

            {/* کارت‌های ۴ وضعیت گزارش */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold">
                  <span>تایید شده</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-lg font-black text-emerald-700 font-mono">
                  {stats?.reports.verified ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1">
                <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold">
                  <span>قابل بررسی</span>
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-lg font-black text-blue-700 font-mono">
                  {stats?.reports.underReview ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-1">
                <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold">
                  <span>در انتظار</span>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-lg font-black text-amber-700 font-mono">
                  {stats?.reports.pending ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-1">
                <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold">
                  <span>قفل / ویرایش</span>
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-lg font-black text-rose-700 font-mono">
                  {stats?.reports.locked ?? 0}
                </div>
              </div>
            </div>

            {/* توضیحات تکمیلی */}
            <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              تعداد ماژول‌ها و شاخه‌های سازمانی: <strong className="text-slate-800 font-mono">{stats?.reports.totalNodes ?? 0}</strong> سطح.
              تمامی گزارش‌ها با پارامترها و فرمول‌های محاسباتی آماده بهره‌برداری هستند.
            </div>
          </div>

          {/* دکمه ورود به بخش گزارش‌ها */}
          <button
            onClick={() => onNavigateDomain('reports')}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <span>ورود به مدیریت گزارش‌ها</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* پنل ۲: دسترسی‌ها (Permissions Domain) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-5 hover:border-emerald-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">وضعیت دسترسی‌ها</h3>
                  <span className="text-[11px] text-slate-400">درختواره سلسله‌مراتبی و ماتریس امنیت</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {stats?.permissions.total ?? 0} دسترسی
              </span>
            </div>

            {/* کارت‌های ۴ وضعیت دسترسی */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold">
                  <span>تایید شده</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-lg font-black text-emerald-700 font-mono">
                  {stats?.permissions.verified ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1">
                <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold">
                  <span>قابل بررسی</span>
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-lg font-black text-blue-700 font-mono">
                  {stats?.permissions.underReview ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-1">
                <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold">
                  <span>در انتظار</span>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-lg font-black text-amber-700 font-mono">
                  {stats?.permissions.pending ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-1">
                <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold">
                  <span>قفل / ویرایش</span>
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-lg font-black text-rose-700 font-mono">
                  {stats?.permissions.locked ?? 0}
                </div>
              </div>
            </div>

            {/* توضیحات تکمیلی */}
            <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              تعداد کل سطوح و ماژول‌های درختی: <strong className="text-slate-800 font-mono">{stats?.permissions.totalNodes ?? 0}</strong> سطح.
              تمامی ۲۱ شاخه اصلی بر اساس چیدمان اختصاصی سازمان مرتب‌سازی شده‌اند.
            </div>
          </div>

          {/* دکمه ورود به بخش دسترسی‌ها */}
          <button
            onClick={() => onNavigateDomain('permissions')}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <span>ورود به مدیریت دسترسی‌ها</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* پنل ۳: کانفیگ‌ها (Configs Domain - فاز آتی) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-5 hover:border-slate-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">وضعیت کانفیگ‌ها</h3>
                  <span className="text-[11px] text-slate-400">پیکربندی پارامترها و قوانین سیستمی</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                فاز آتی (به زودی)
              </span>
            </div>

            {/* کارت‌های برنامه‌ریزی کانفیگ */}
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">پارامترهای عمومی زیرسیستم‌ها</span>
                <span className="text-[10px] text-slate-400 font-medium">در صف طراحی</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">قوانین اعتبارسنجی محاسبات</span>
                <span className="text-[10px] text-slate-400 font-medium">برنامه‌ریزی‌شده</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">انتقال تنظیمات بین محیط‌ها</span>
                <span className="text-[10px] text-slate-400 font-medium">فاز ۲</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              این ماژول پس از استقرار نهایی ماتریس دسترسی‌ها و اتصال ماژول‌های گزارش، فعال و در دسترس کاربران قرار خواهد گرفت.
            </div>
          </div>

          {/* دکمه راهنما/غیرفعال */}
          <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 select-none">
            <Clock className="w-4 h-4" />
            <span>به زودی در دسترس خواهد بود</span>
          </div>
        </div>
      </div>

      {/* ۴. نوار دسترسی سریع و سلامت داده‌ها */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">دسترسی‌های سریع به امکانات سیستم</h4>
              <p className="text-[11px] text-slate-400">جابجایی آنی بین بخش‌های پرکاربرد بدون فوت وقت</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateDomain('reports')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>فهرست گزارش‌ها</span>
            </button>
            <button
              onClick={() => onNavigateDomain('permissions')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>درختواره دسترسی‌ها</span>
            </button>
            {onOpenFieldBank && (
              <button
                onClick={onOpenFieldBank}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>بانک مرکزی فیلدها</span>
              </button>
            )}
            {currentUser?.roleId === 3 && onOpenAdminSettings && (
              <button
                onClick={onOpenAdminSettings}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>مدیریت کاربران و سیستم</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
