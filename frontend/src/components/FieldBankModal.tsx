import React, { useEffect, useState } from 'react';
import type { FieldBankItem, ParameterBankItem, User } from '../types';
import { fieldBankApi, parameterBankApi } from '../api/client';
import { useToast } from './Toast';
import { Database, Edit, Filter, Plus, Search, Trash2, X } from 'lucide-react';

interface FieldBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const FieldBankModal: React.FC<FieldBankModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'fields' | 'params'>('fields');

  // متغیرهای فیلدها
  const [fields, setFields] = useState<FieldBankItem[]>([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [fieldDisplayName, setFieldDisplayName] = useState('');
  const [fieldTechName, setFieldTechName] = useState('');
  const [fieldDataType, setFieldDataType] = useState('NVARCHAR(50)');
  const [fieldDesc, setFieldDesc] = useState('');
  const [fieldDefaultFormula, setFieldDefaultFormula] = useState('');

  // متغیرهای پارامترها
  const [params, setParams] = useState<ParameterBankItem[]>([]);
  const [paramSearch, setParamSearch] = useState('');
  const [showParamForm, setShowParamForm] = useState(false);
  const [editingParamId, setEditingParamId] = useState<number | null>(null);
  const [paramName, setParamName] = useState('');
  const [paramDataType, setParamDataType] = useState('NVARCHAR(50)');
  const [paramDefaultRequired, setParamDefaultRequired] = useState(false);
  const [paramDesc, setParamDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const canManage = currentUser && (currentUser.roleId === 2 || currentUser.roleId === 3);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'fields') {
        loadFields();
      } else {
        loadParams();
      }
    }
  }, [isOpen, activeTab]);

  const loadFields = async () => {
    setLoading(true);
    try {
      const data = await fieldBankApi.getAll(fieldSearch);
      setFields(data);
    } finally {
      setLoading(false);
    }
  };

  const loadParams = async () => {
    setLoading(true);
    try {
      const data = await parameterBankApi.getAll(paramSearch);
      setParams(data);
    } finally {
      setLoading(false);
    }
  };

  // هندلرهای فیلدها
  const handleOpenCreateField = () => {
    setEditingFieldId(null);
    setFieldDisplayName('');
    setFieldTechName('');
    setFieldDataType('NVARCHAR(50)');
    setFieldDesc('');
    setFieldDefaultFormula('');
    setShowFieldForm(true);
  };

  const handleOpenEditField = (field: FieldBankItem) => {
    setEditingFieldId(field.fieldId);
    setFieldDisplayName(field.displayName);
    setFieldTechName(field.technicalName || '');
    setFieldDataType(field.dataType || 'NVARCHAR(50)');
    setFieldDesc(field.standardDescription || '');
    setFieldDefaultFormula(field.defaultFormula || '');
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
          dataType: fieldDataType.trim(),
          standardDescription: fieldDesc.trim(),
          defaultFormula: fieldDefaultFormula.trim(),
        });
        showToast('مشخصات فیلد با موفقیت ویرایش شد.', 'success');
      } else {
        await fieldBankApi.create({
          displayName: fieldDisplayName.trim(),
          technicalName: fieldTechName.trim(),
          dataType: fieldDataType.trim(),
          standardDescription: fieldDesc.trim(),
          defaultFormula: fieldDefaultFormula.trim(),
        });
        showToast('فیلد استاندارد جدید با موفقیت ثبت شد.', 'success');
      }

      setShowFieldForm(false);
      loadFields();
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
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      if (msg.includes('گزارش')) {
        if (window.confirm(`${msg}\n\nآیا مایل به حذف اجباری (حذف از تمام گزارش‌ها) هستید؟`)) {
          await fieldBankApi.delete(field.fieldId, true);
          showToast('فیلد با موفقیت حذف شد.', 'info');
          loadFields();
        }
      } else {
        showToast(msg || 'خطا در حذف فیلد', 'error');
      }
    }
  };

  // هندلرهای پارامترها
  const handleOpenCreateParam = () => {
    setEditingParamId(null);
    setParamName('');
    setParamDataType('NVARCHAR(50)');
    setParamDefaultRequired(false);
    setParamDesc('');
    setShowParamForm(true);
  };

  const handleOpenEditParam = (param: ParameterBankItem) => {
    setEditingParamId(param.parameterBankId);
    setParamName(param.parameterName);
    setParamDataType(param.dataType || 'NVARCHAR(50)');
    setParamDefaultRequired(param.defaultIsRequired);
    setParamDesc(param.description || '');
    setShowParamForm(true);
  };

  const handleSaveParam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramName.trim()) return;

    try {
      if (editingParamId) {
        await parameterBankApi.update(editingParamId, {
          parameterName: paramName.trim(),
          dataType: paramDataType.trim(),
          defaultIsRequired: paramDefaultRequired,
          description: paramDesc.trim(),
        });
        showToast('پارامتر با موفقیت ویرایش شد.', 'success');
      } else {
        await parameterBankApi.create({
          parameterName: paramName.trim(),
          dataType: paramDataType.trim(),
          defaultIsRequired: paramDefaultRequired,
          description: paramDesc.trim(),
        });
        showToast('پارامتر استاندارد جدید با موفقیت ثبت شد.', 'success');
      }

      setShowParamForm(false);
      loadParams();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت پارامتر', 'error');
    }
  };

  const handleDeleteParam = async (param: ParameterBankItem) => {
    if (!window.confirm(`آیا از حذف پارامتر «${param.parameterName}» از بانک پارامترها اطمینان دارید؟`)) return;

    try {
      await parameterBankApi.delete(param.parameterBankId);
      showToast('پارامتر با موفقیت حذف شد.', 'info');
      loadParams();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در حذف پارامتر', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* هدر مدال */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">مخزن مرکزی استانداردسازی سازمان</h2>
              <p className="text-[10px] text-slate-500">بانک متمرکز فیلدهای خروجی و پارامترهای ورودی گزارش‌ها</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* سوییچ بین بانک فیلدها و بانک پارامترها */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 space-x-reverse space-x-2">
          <button
            onClick={() => setActiveTab('fields')}
            className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'fields'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>بانک مرکزی فیلدها (Field Bank)</span>
          </button>

          <button
            onClick={() => setActiveTab('params')}
            className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'params'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>بانک مرکزی پارامترها (Parameter Bank)</span>
          </button>
        </div>

        {/* ۱. محتوای بانک فیلدها */}
        {activeTab === 'fields' && (
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
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
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
                  {editingFieldId ? 'ویرایش مشخصات فیلد استاندارد' : 'تعریف فیلد استاندارد جدید'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">عنوان استاندارد فارسی</label>
                    <input
                      type="text"
                      placeholder="مثال: نرخ مالیات"
                      value={fieldDisplayName}
                      onChange={(e) => setFieldDisplayName(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">نام فنی/دیتابیسی</label>
                    <input
                      type="text"
                      placeholder="مثال: TaxRate"
                      value={fieldTechName}
                      onChange={(e) => setFieldTechName(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">نوع داده</label>
                    <select
                      value={fieldDataType}
                      onChange={(e) => setFieldDataType(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    >
                      <option value="NVARCHAR(50)">متنی کوتاه (NVARCHAR(50))</option>
                      <option value="NVARCHAR(250)">متنی بلند (NVARCHAR(250))</option>
                      <option value="INT">عدد صحیح (INT)</option>
                      <option value="DECIMAL(18,2)">مبلغ یا ریالی (DECIMAL(18,2))</option>
                      <option value="DECIMAL(18,3)">تعدادی/وزنی (DECIMAL(18,3))</option>
                      <option value="NVARCHAR(10)">تاریخ شمسی (NVARCHAR(10))</option>
                      <option value="BIT">بولیین/وضعیت (BIT)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">شرح استاندارد کاربرد</label>
                    <input
                      type="text"
                      placeholder="تعریف و کاربرد استاندارد این فیلد در سیستم..."
                      value={fieldDesc}
                      onChange={(e) => setFieldDesc(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">فرمول محاسباتی پیش‌فرض (اختیاری)</label>
                    <input
                      type="text"
                      placeholder="مثال: @مبلغ_کل * 0.10"
                      value={fieldDefaultFormula}
                      onChange={(e) => setFieldDefaultFormula(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white font-mono"
                    />
                  </div>
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
                    className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                  >
                    {editingFieldId ? 'ذخیره اصلاحات' : 'ثبت فیلد در مخزن مرکزی'}
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
                      <th className="py-2.5 px-3">عنوان استاندارد</th>
                      <th className="py-2.5 px-3 font-mono">نام فنی/دیتابیسی</th>
                      <th className="py-2.5 px-2">نوع داده</th>
                      <th className="py-2.5 px-3">شرح استاندارد</th>
                      {canManage && <th className="py-2.5 px-2 text-center w-20">عملیات</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((f) => (
                      <tr key={f.fieldId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{f.displayName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{f.technicalName || '-'}</td>
                        <td className="py-2.5 px-2">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono">
                            {f.dataType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {f.standardDescription || f.defaultFormula || '-'}
                        </td>
                        {canManage && (
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditField(f)}
                                title="ویرایش فیلد"
                                className="text-slate-400 hover:text-blue-600 p-1 rounded"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteField(f)}
                                title="حذف فیلد"
                                className="text-slate-400 hover:text-rose-600 p-1 rounded"
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
        )}

        {/* ۲. محتوای بانک پارامترها */}
        {activeTab === 'params' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={paramSearch}
                  onChange={(e) => {
                    setParamSearch(e.target.value);
                    parameterBankApi.getAll(e.target.value).then(setParams);
                  }}
                  placeholder="جست‌وجوی عنوان پارامتر ورودی..."
                  className="w-full text-xs pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {canManage && (
                <button
                  onClick={handleOpenCreateParam}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف پارامتر جدید</span>
                </button>
              )}
            </div>

            {/* فرم تعریف یا ویرایش پارامتر */}
            {showParamForm && (
              <form onSubmit={handleSaveParam} className="p-4 bg-indigo-50/50 border-b border-indigo-100 space-y-3">
                <h4 className="text-xs font-bold text-indigo-900">
                  {editingParamId ? 'ویرایش مشخصات پارامتر ورودی' : 'تعریف پارامتر ورودی جدید در مخزن مرکزی'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">عنوان پارامتر</label>
                    <input
                      type="text"
                      placeholder="مثال: کد مرکز هزینه"
                      value={paramName}
                      onChange={(e) => setParamName(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">نوع داده پارامتر</label>
                    <select
                      value={paramDataType}
                      onChange={(e) => setParamDataType(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    >
                      <option value="NVARCHAR(50)">متنی کوتاه (NVARCHAR(50))</option>
                      <option value="INT">شناسه/عددی (INT)</option>
                      <option value="NVARCHAR(10)">تاریخ شمسی (NVARCHAR(10))</option>
                      <option value="DECIMAL(18,2)">مبلغ یا عدد اعشاری</option>
                      <option value="BIT">بولیین (BIT)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paramDefaultRequired}
                        onChange={(e) => setParamDefaultRequired(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>به صورت پیش‌فرض اجباری باشد</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">شرح کاربرد و راهنمای فیلتر</label>
                  <input
                    type="text"
                    placeholder="توضیحاتی که برای راهنمایی کاربر گزارش نمایش داده می‌شود..."
                    value={paramDesc}
                    onChange={(e) => setParamDesc(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowParamForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                  >
                    {editingParamId ? 'ذخیره اصلاحات' : 'ثبت در مخزن مرکزی پارامترها'}
                  </button>
                </div>
              </form>
            )}

            {/* جدول پارامترها */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-12 text-slate-400 text-xs">در حال بارگذاری پارامترها...</div>
              ) : params.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">پارامتری یافت نشد.</div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                      <th className="py-2.5 px-3">عنوان پارامتر</th>
                      <th className="py-2.5 px-2">نوع داده</th>
                      <th className="py-2.5 px-2 text-center">وضعیت اجباری بودن</th>
                      <th className="py-2.5 px-3">توضیحات راهنما</th>
                      {canManage && <th className="py-2.5 px-2 text-center w-20">عملیات</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {params.map((p) => (
                      <tr key={p.parameterBankId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{p.parameterName}</td>
                        <td className="py-2.5 px-2">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono">
                            {p.dataType}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.defaultIsRequired ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.defaultIsRequired ? 'اجباری' : 'اختیاری'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">{p.description || '-'}</td>
                        {canManage && (
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditParam(p)}
                                title="ویرایش پارامتر"
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteParam(p)}
                                title="حذف پارامتر"
                                className="text-slate-400 hover:text-rose-600 p-1 rounded"
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
        )}
      </div>
    </div>
  );
};
