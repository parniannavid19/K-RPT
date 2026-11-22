import React, { useEffect, useState } from 'react';
import type { Tag, User, UserDto } from '../types';
import { usersApi, systemApi, tagsApi } from '../api/client';
import { useToast } from './Toast';
import {
  AlertTriangle,
  Edit2,
  Plus,
  RefreshCw,
  Settings,
  Tag as TagIcon,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSystemReset: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSystemReset,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'tags' | 'reset'>('users');

  // متغیرهای کاربران
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [userFormSubmitting, setUserFormSubmitting] = useState(false);

  // متغیرهای برچسب‌ها
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3B82F6');
  const [tagSubmitting, setTagSubmitting] = useState(false);

  // متغیرهای ریست سیستم
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // بستن پنجره با دکمه Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const presetColors = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981',
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
    '#EC4899', '#64748B'
  ];

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'tags') loadTags();
    }
  }, [isOpen, activeTab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadTags = async () => {
    setLoadingTags(true);
    try {
      const data = await tagsApi.getAll();
      setTags(data);
    } finally {
      setLoadingTags(false);
    }
  };

  // کاربر
  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setRoleId(1);
    setIsActive(true);
    setShowUserForm(true);
  };

  const handleOpenEditUser = (u: UserDto) => {
    setEditingUserId(u.userId);
    setUsername(u.username);
    setFullName(u.fullName);
    setPassword('');
    setRoleId(u.roleId);
    setIsActive(u.isActive);
    setShowUserForm(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setUserFormSubmitting(true);
    try {
      if (editingUserId) {
        await usersApi.update(editingUserId, {
          fullName: fullName.trim(),
          roleId,
          isActive,
          newPassword: password.trim() ? password.trim() : undefined,
        });
        showToast('اطلاعات کاربر با موفقیت ذخیره شد.', 'success');
      } else {
        if (!username.trim() || !password.trim()) {
          showToast('نام کاربری و کلمه عبور الزامی است.', 'error');
          return;
        }
        await usersApi.create({
          username: username.trim(),
          password: password.trim(),
          fullName: fullName.trim(),
          roleId,
        });
        showToast('کاربر جدید با موفقیت ایجاد شد.', 'success');
      }

      setShowUserForm(false);
      loadUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت کاربر', 'error');
    } finally {
      setUserFormSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: UserDto) => {
    if (!window.confirm(`آیا از حذف حساب کاربری «${u.fullName}» (${u.username}) اطمینان دارید؟`)) return;

    try {
      await usersApi.delete(u.userId);
      showToast('کاربر با موفقیت حذف شد.', 'info');
      loadUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در حذف کاربر', 'error');
    }
  };

  // برچسب‌ها
  const handleOpenCreateTag = () => {
    setEditingTagId(null);
    setTagName('');
    setTagColor('#3B82F6');
    setShowTagForm(true);
  };

  const handleOpenEditTag = (t: Tag) => {
    setEditingTagId(t.tagId);
    setTagName(t.tagName);
    setTagColor(t.colorHex || '#3B82F6');
    setShowTagForm(true);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setTagSubmitting(true);
    try {
      if (editingTagId) {
        await tagsApi.update(editingTagId, { tagName: tagName.trim(), colorHex: tagColor });
        showToast('برچسب با موفقیت ویرایش شد.', 'success');
      } else {
        await tagsApi.create({ tagName: tagName.trim(), colorHex: tagColor });
        showToast('برچسب جدید با موفقیت ایجاد شد.', 'success');
      }
      setShowTagForm(false);
      loadTags();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت برچسب', 'error');
    } finally {
      setTagSubmitting(false);
    }
  };

  const handleDeleteTag = async (t: Tag) => {
    if (!window.confirm(`آیا از حذف برچسب «${t.tagName}» اطمینان دارید؟`)) return;

    try {
      await tagsApi.delete(t.tagId);
      showToast('برچسب با موفقیت حذف شد.', 'info');
      loadTags();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در حذف برچسب', 'error');
    }
  };

  // پاکسازی ماک
  const handleExecuteWipe = async () => {
    if (confirmText !== 'RESET') {
      showToast('لطفاً عبارت RESET را دقیق وارد فرمایید.', 'error');
      return;
    }

    setIsResetting(true);
    try {
      const res = await systemApi.reset();
      showToast(res.message, 'success');
      setConfirmText('');
      onSystemReset();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در پاکسازی سیستم', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;
  if (!currentUser || currentUser.roleId !== 3) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* هدر بخش تنظیمات */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">تنظیمات سیستم (مدیر ارشد)</h2>
              <p className="text-[11px] text-slate-500">مدیریت کاربران، برچسب‌ها و کنترل پایگاه داده</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* سوییچ تب‌های تنظیمات */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 space-x-reverse space-x-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مدیریت و تعریف کاربران</span>
          </button>

          <button
            onClick={() => setActiveTab('tags')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'tags'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TagIcon className="w-4 h-4" />
            <span>مدیریت و تعریف برچسب‌ها (Tags)</span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'reset'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>پاکسازی کامل و ریست دیتاهای ماک</span>
          </button>
        </div>

        {/* تب ۱: مدیریت کاربران */}
        {activeTab === 'users' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800">لیست کاربران تعریف‌شده در سامانه</h3>
                <p className="text-[11px] text-slate-500">کاربران بر اساس ۳ نقش مصوب PRD (کارشناس، مدیر، مدیر سیستم)</p>
              </div>
              <button
                onClick={handleOpenCreateUser}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>تعریف کاربر جدید</span>
              </button>
            </div>

            {/* فرم کاربر */}
            {showUserForm && (
              <form onSubmit={handleSaveUser} className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-900">
                  {editingUserId ? `ویرایش مشخصات کاربر: ${username}` : 'مشخصات کاربر جدید'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">نام و نام خانوادگی</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: علی رضایی"
                      required
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>

                  {!editingUserId && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">نام کاربری (لاتین)</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="مثال: rezaei"
                        required
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {editingUserId ? 'کلمه عبور جدید (در صورت نیاز به تغییر)' : 'کلمه عبور'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUserId ? 'در صورت عدم تغییر خالی بگذارید' : '••••••••'}
                      required={!editingUserId}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">نقش کاربری</label>
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(Number(e.target.value))}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    >
                      <option value="1">کارشناس (Analyst - مشاهده، قفل، جست‌وجو، تایید نهایی)</option>
                      <option value="2">مدیر (Manager - ویرایش فرمول‌ها، فیلدها و تگ‌ها)</option>
                      <option value="3">مدیر سیستم (System Admin - دسترسی کامل و مدیریت سیستم)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>حساب کاربری فعال باشد</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={userFormSubmitting}
                      className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                    >
                      {editingUserId ? 'ذخیره اصلاحات' : 'ایجاد حساب کاربری'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* جدول کاربران */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                    <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                    <th className="py-2.5 px-3 font-mono">نام کاربری</th>
                    <th className="py-2.5 px-3">نقش سیستمی</th>
                    <th className="py-2.5 px-3 text-center">وضعیت</th>
                    <th className="py-2.5 px-3 text-center w-24">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">در حال بارگذاری کاربران...</td>
                    </tr>
                  ) : users.map((u) => (
                    <tr key={u.userId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {u.fullName.charAt(0)}
                        </div>
                        <span>{u.fullName}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{u.username}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.roleId === 3
                            ? 'bg-purple-100 text-purple-700'
                            : u.roleId === 2
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.roleName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {u.isActive ? (
                          <span className="text-emerald-600 font-bold text-[11px]">فعال</span>
                        ) : (
                          <span className="text-rose-500 font-bold text-[11px]">غیرفعال</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            title="ویرایش کاربر"
                            className="text-slate-400 hover:text-blue-600 p-1 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="حذف کاربر"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* تب ۲: مدیریت برچسب‌ها (Tags) */}
        {activeTab === 'tags' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800">بانک برچسب‌های استاندارد گزارش‌ها</h3>
                <p className="text-[11px] text-slate-500">برچسب‌ها برای دسته‌بندی و فیلتر سریع گزارش‌ها استفاده می‌شوند</p>
              </div>
              <button
                onClick={handleOpenCreateTag}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>تعریف برچسب جدید</span>
              </button>
            </div>

            {/* فرم برچسب */}
            {showTagForm && (
              <form onSubmit={handleSaveTag} className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-900">
                  {editingTagId ? 'ویرایش مشخصات برچسب' : 'تعریف برچسب استاندارد جدید'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">عنوان برچسب</label>
                    <input
                      type="text"
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      placeholder="مثال: پایان_سال_مالی"
                      required
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">انتخاب رنگ نمایش</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0"
                      />
                      <div className="flex items-center gap-1 flex-wrap">
                        {presetColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setTagColor(color)}
                            style={{ backgroundColor: color }}
                            className={`w-5 h-5 rounded-md border ${
                              tagColor === color ? 'ring-2 ring-blue-500 scale-110' : 'border-transparent'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTagForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={tagSubmitting}
                    className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                  >
                    {editingTagId ? 'ذخیره تغییرات' : 'ثبت برچسب'}
                  </button>
                </div>
              </form>
            )}

            {/* لیست تگ‌ها */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {loadingTags ? (
                <div className="col-span-3 text-center py-8 text-slate-400 text-xs">در حال بارگذاری برچسب‌ها...</div>
              ) : tags.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-slate-400 text-xs">هیچ برچسبی تعریف نشده است.</div>
              ) : (
                tags.map((t) => (
                  <div
                    key={t.tagId}
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.colorHex || '#3B82F6' }}
                      />
                      <span className="font-bold text-xs text-slate-800">#{t.tagName}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditTag(t)}
                        title="ویرایش برچسب"
                        className="text-slate-400 hover:text-blue-600 p-1 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(t)}
                        title="حذف برچسب"
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* تب ۳: پاکسازی کامل دیتاهای ماک */}
        {activeTab === 'reset' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto">
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-950 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-rose-900">پاکسازی کامل داده‌های ماک و آزمایشی</h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                با اجرای این عملیات، تمامی داده‌های آزمایشی شامل:
              </p>
              <ul className="text-xs text-rose-700 list-disc list-inside space-y-1 pr-2">
                <li>تمام گزارش‌های آزمایشی و فرمول‌های ثبت‌شده</li>
                <li>تمام ماژول‌ها و ساختار درختی آزمایشی</li>
                <li>بانک فیلدها، پارامترها و برچسب‌های نمونه</li>
                <li>کاربران تستی (به جز کاربر اصلی <code>admin</code>)</li>
              </ul>
              <p className="text-xs font-bold text-rose-900 pt-1">
                به طور کامل حذف خواهند شد و دیتابیس بدون هیچ داده آزمایشی، کاملاً خام و آماده ورود اطلاعات واقعی ۳۰۰ گزارش سازمان خواهد بود.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                جهت تایید قطعی پاکسازی، عبارت <span className="font-mono text-rose-600 font-extrabold">RESET</span> را تایپ نمایید:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                className="w-full text-sm font-mono tracking-wider border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white text-center"
              />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExecuteWipe}
                  disabled={confirmText !== 'RESET' || isResetting}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال پاکسازی پایگاه داده...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>حذف دائمی تمام داده‌های ماک و آماده‌سازی سیستم خام</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
