import React, { useEffect, useState } from 'react';
import type { FieldBankItem, User } from '../types';
import { fieldBankApi } from '../api/client';
import { useToast } from './Toast';
import { Database, Edit, Plus, Search, Trash2, X } from 'lucide-react';

interface FieldBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onFieldUpdated?: () => void;
}

export const FieldBankModal: React.FC<FieldBankModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onFieldUpdated,
}) => {
  const { showToast } = useToast();

  // متغیرهای فیلدها
  const [fields, setFields] = useState<FieldBankItem[]>([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [fieldDisplayName, setFieldDisplayName] = useState('');
  const [fieldTechName, setFieldTechName] = useState('');
  const [fieldDesc, setFieldDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const canManage = currentUser && (currentUser.roleId === 2 || currentUser.roleId === 3);

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

  useEffect(() => {
    if (isOpen) {
      loadFields();
    }
  }, [isOpen]);

  const loadFields = async () => {
    setLoading(true);
    try {
      const data = await fieldBankApi.getAll(fieldSearch);
      setFields(data);
    } finally {
      setLoading(false);
    }
  };

  // هندلرهای فیلدها
  const handleOpenCreateField = () => {
    setEditingFieldId(null);
    setFieldDisplayName('');
    setFieldTechName('');
    setFieldDesc('');
    setShowFieldForm(true);
  };

  const handleOpenEditField = (field: FieldBankItem) => {
    setEditingFieldId(field.fieldId);
    setFieldDisplayName(field.displayName);
    setFieldTechName(field.technicalName || '');
    setFieldDesc(field.standardDescription || '');
    setShowFieldForm(true);
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldDisplayName.trim()) return;

    try {
      if (editingFieldId) {
        await fieldBankApi.update(editingFieldId, {
          displayName: fieldDisplayName.trim(),
          technicalName: fieldTechName.trim(),
          standardDescription: fieldDesc.trim(),
        });
        showToast('مشخصات فیلد با موفقیت ویرایش شد.', 'success');
      } else {
        await fieldBankApi.create({
          displayName: fieldDisplayName.trim(),
          technicalName: fieldTechName.trim(),
          standardDescription: fieldDesc.trim(),
        });
        showToast('فیلد استاندارد جدید با موفقیت ثبت شد.', 'success');
      }

      setShowFieldForm(false);
      loadFields();
      onFieldUpdated?.();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت فیلد', 'error');
    }
  };

  const handleDeleteField = async (field: FieldBankItem) => {
    if (!window.confirm(`آیا از حذف فیلد «${field.displayName}» از مخزن مرکزی اطمینان دارید؟`)) return;

    try {
      await fieldBankApi.delete(field.fieldId, false);
      showToast('فیلد با موفقیت حذف شد.', 'info');
      loadFields();
      onFieldUpdated?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      if (msg.includes('گزارش')) {
        if (window.confirm(`${msg}\n\nآیا مایل به حذف اجباری (حذف از تمام گزارش‌ها) هستید؟`)) {
          await fieldBankApi.delete(field.fieldId, true);
          showToast('فیلد با موفقیت حذف شد.', 'info');
          loadFields();
          onFieldUpdated?.();
        }
      } else {
        showToast(msg || 'خطا در حذف فیلد', 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* هدر مدال */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">بانک مرکزی فیلدهای استاندارد (Field Bank)</h2>
              <p className="text-[11px] text-slate-500">مخزن متمرکز تعریف و نگهداری فیلدهای خروجی گزارش‌ها در سطح سازمان</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوای بانک فیلدها */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={fieldSearch}
                onChange={(e) => {
                  setFieldSearch(e.target.value);
                  fieldBankApi.getAll(e.target.value).then(setFields);
                }}
                placeholder="جست‌وجوی عنوان یا نام دیتابیسی فیلد..."
                className="w-full text-xs pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {canManage && (
              <button
                onClick={handleOpenCreateField}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>تعریف فیلد جدید</span>
              </button>
            )}
          </div>

          {/* فرم تعریف یا ویرایش فیلد */}
          {showFieldForm && (
            <form onSubmit={handleSaveField} className="p-4 bg-blue-50/50 border-b border-blue-100 space-y-3">
              <h4 className="text-xs font-bold text-blue-900">
                {editingFieldId ? 'ویرایش مشخصات فیلد استاندارد' : 'تعریف فیلد استاندارد جدید در مخزن مرکزی'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">عنوان نمایشی فیلد</label>
                  <input
                    type="text"
                    placeholder="مثال: شماره پیگیری سند"
                    value={fieldDisplayName}
                    onChange={(e) => setFieldDisplayName(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">نام فنی / دیتابیسی (اختیاری)</label>
                  <input
                    type="text"
                    placeholder="مثال: TrackingNumber"
                    value={fieldTechName}
                    onChange={(e) => setFieldTechName(e.target.value)}
                    dir="ltr"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">توضیحات و مستندات استاندارد</label>
                <input
                  type="text"
                  placeholder="توضیحاتی در مورد ماهیت این فیلد..."
                  value={fieldDesc}
                  onChange={(e) => setFieldDesc(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFieldForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs active:scale-95"
                >
                  {editingFieldId ? 'ذخیره اصلاحات' : 'ثبت در مخزن مرکزی'}
                </button>
              </div>
            </form>
          )}

          {/* جدول فیلدها */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">در حال بارگذاری فیلدها...</div>
            ) : fields.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">فیلدی یافت نشد.</div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                    <th className="py-2.5 px-3">عنوان فیلد</th>
                    <th className="py-2.5 px-3">نام فنی / دیتابیسی</th>
                    <th className="py-2.5 px-3">توضیحات استاندارد</th>
                    {canManage && <th className="py-2.5 px-2 text-center w-20">عملیات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((f) => (
                    <tr key={f.fieldId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{f.displayName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500" dir="ltr">{f.technicalName || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">{f.standardDescription || '-'}</td>
                      {canManage && (
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditField(f)}
                              title="ویرایش فیلد"
                              className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteField(f)}
                              title="حذف فیلد"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
