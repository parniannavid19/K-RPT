import React, { useState } from 'react';
import type { SystemDomain, User } from '../types';
import { BarChart3, Database, LogIn, LogOut, Settings, Shield, ShieldCheck, Sliders } from 'lucide-react';
import { authApi } from '../api/client';
import { APP_VERSION_LABEL } from '../config/version';

interface HeaderProps {
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onOpenFieldBank: () => void;
  onOpenAdminSettings: () => void;
  activeDomain: SystemDomain;
  setActiveDomain: (domain: SystemDomain) => void;
  activeTab: 'detail' | 'search' | 'diff';
  setActiveTab: (tab: 'detail' | 'search' | 'diff') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  onOpenFieldBank,
  onOpenAdminSettings,
  activeDomain,
  setActiveDomain,
  activeTab,
  setActiveTab,
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  // بستن پنجره لاگین با دکمه Esc
  React.useEffect(() => {
    if (!showLoginModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLoginModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLoginModal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.login(username, password);
      onUserChange(res.user);
      setShowLoginModal(false);
      setError('');
    } catch {
      setError('نام کاربری یا کلمه عبور نادرست است.');
    }
  };

  const handleLogout = () => {
    authApi.logout();
    onUserChange(null);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* سمت راست: لوگو و نام سامانه + سوئیچر بخش‌های اصلی */}
          <div className="flex items-center space-x-reverse space-x-6">
            <div className="flex items-center space-x-reverse space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">K-RPT</span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">{APP_VERSION_LABEL}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">سیستم کا د گ</p>
              </div>
            </div>

            {/* سوئیچر بخش‌های سامانه (گزارش‌ها | دسترسی‌ها | کانفیگ‌ها) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
              <button
                onClick={() => setActiveDomain('reports')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeDomain === 'reports'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>گزارش‌ها</span>
              </button>

              <button
                onClick={() => setActiveDomain('permissions')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeDomain === 'permissions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>دسترسی‌ها</span>
              </button>

              <div
                title="ماژول کانفیگ‌ها در فازهای آتی اضافه خواهد شد"
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 flex items-center gap-1 cursor-not-allowed select-none opacity-60"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>کانفیگ‌ها</span>
                <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-normal">به زودی</span>
              </div>
            </div>
          </div>

          {/* تب‌های بالای صفحه مختص دامنه گزارش‌ها */}
          {activeDomain === 'reports' ? (
            <nav className="flex space-x-reverse space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('detail')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'detail'
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                شناسنامه گزارش
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'search'
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                جستجوی پیشرفته
              </button>
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'diff'
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مقایسه گزارش‌ها
              </button>
            </nav>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-4 py-1.5 rounded-xl text-xs font-bold">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>ماژول مدیریت درختواره و سطوح دسترسی</span>
            </div>
          )}

          {/* بخش کاربری، بانک فیلدها و دکمه تنظیمات ادمین */}
          <div className="flex items-center gap-3">
            {/* دکمه‌های مخازن داده و ابزارها (بانک فیلدها مختص گزارش‌ها) */}
            <div className="flex items-center gap-2">
              {activeDomain === 'reports' && (
                <button
                  onClick={onOpenFieldBank}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-colors border border-slate-200 shadow-2xs active:scale-95"
                >
                  <Database className="w-4 h-4 text-slate-500" />
                  <span>بانک مرکزی فیلدها</span>
                </button>
              )}

              {/* دکمه تنظیمات مخصوص مدیر سیستم (Admin) */}
              {currentUser?.roleId === 3 && (
                <button
                  onClick={onOpenAdminSettings}
                  title="تنظیمات سیستم و مدیریت کاربران"
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
                >
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span>تنظیمات</span>
                </button>
              )}
            </div>

            {/* جداکننده عمودی شکیل */}
            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* کارت هویت و پروفایل کاربر لاگین‌شده */}
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 px-3.5 py-1.5 rounded-2xl transition-colors shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.fullName}</div>
                  <div className="text-[10px] text-blue-600 font-medium">{currentUser.roleName}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="خروج از سیستم"
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors mr-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-medium flex items-center gap-1.5 shadow-xs transition-colors active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>ورود به سیستم</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* مدال ورود به سیستم */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                ورود به سامانه کاتالوگ گزارش‌ها
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {error && <div className="mb-4 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نام کاربری</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="admin یا analyst1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">کلمه عبور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                <p className="font-semibold text-slate-700 mb-1">کاربران پیش‌فرض سامانه:</p>
                <p>مدیر سیستم: <code className="text-blue-600 font-mono">admin</code> / <code className="font-mono">admin123</code></p>
                <p>کارشناس: <code className="text-blue-600 font-mono">analyst1</code> / <code className="font-mono">analyst123</code></p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  ورود
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
