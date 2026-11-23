import React, { useEffect, useMemo, useState } from 'react';
import type { MultiReportDiffResponse, TreeNode } from '../types';
import { UI_CONTROL_TYPE_OPTIONS } from '../types';
import { diffApi, treeApi } from '../api/client';
import {
  Check,
  CheckCircle2,
  Filter,
  GitCompare,
  Layers,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';

interface DiffViewProps {
  initialReportAId?: number | null;
  initialReportBId?: number | null;
  fieldBankVersion?: number;
}

// رنگ‌های شاخص جهت تفکیک بصری گزارش‌های مقایسه‌شده
const REPORT_PALETTE = [
  { border: 'border-blue-300', bg: 'bg-blue-50/70', text: 'text-blue-700', badge: 'bg-blue-600 text-white', light: 'bg-blue-100 text-blue-800' },
  { border: 'border-purple-300', bg: 'bg-purple-50/70', text: 'text-purple-700', badge: 'bg-purple-600 text-white', light: 'bg-purple-100 text-purple-800' },
  { border: 'border-amber-300', bg: 'bg-amber-50/70', text: 'text-amber-700', badge: 'bg-amber-600 text-white', light: 'bg-amber-100 text-amber-800' },
  { border: 'border-emerald-300', bg: 'bg-emerald-50/70', text: 'text-emerald-700', badge: 'bg-emerald-600 text-white', light: 'bg-emerald-100 text-emerald-800' },
  { border: 'border-rose-300', bg: 'bg-rose-50/70', text: 'text-rose-700', badge: 'bg-rose-600 text-white', light: 'bg-rose-100 text-rose-800' },
  { border: 'border-cyan-300', bg: 'bg-cyan-50/70', text: 'text-cyan-700', badge: 'bg-cyan-600 text-white', light: 'bg-cyan-100 text-cyan-800' },
  { border: 'border-indigo-300', bg: 'bg-indigo-50/70', text: 'text-indigo-700', badge: 'bg-indigo-600 text-white', light: 'bg-indigo-100 text-indigo-800' },
  { border: 'border-orange-300', bg: 'bg-orange-50/70', text: 'text-orange-700', badge: 'bg-orange-600 text-white', light: 'bg-orange-100 text-orange-800' },
];

export const DiffView: React.FC<DiffViewProps> = ({
  initialReportAId,
  initialReportBId,
  fieldBankVersion,
}) => {
  const [reportList, setReportList] = useState<{ id: number; title: string; code: string }[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fieldFilterTab, setFieldFilterTab] = useState<'all' | 'common' | 'formulaDiff' | 'specific'>('all');

  const [diffData, setDiffData] = useState<MultiReportDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // واکشی لیست کلیه گزارش‌های موجود در درختواره
  useEffect(() => {
    treeApi.getTree().then((nodes) => {
      const extracted: { id: number; title: string; code: string }[] = [];
      const extract = (list: TreeNode[]) => {
        for (const n of list) {
          if (n.reportId && n.reportCode) {
            extracted.push({ id: n.reportId, title: n.title, code: n.reportCode });
          }
          if (n.children) extract(n.children);
        }
      };
      extract(nodes);
      setReportList(extracted);

      // مقداردهی اولیه با ۲ گزارش پیش‌فرض
      const initial: number[] = [];
      if (initialReportAId) initial.push(initialReportAId);
      if (initialReportBId && initialReportBId !== initialReportAId) initial.push(initialReportBId);

      if (initial.length < 2 && extracted.length >= 2) {
        if (!initial.includes(extracted[0].id)) initial.push(extracted[0].id);
        if (initial.length < 2 && !initial.includes(extracted[1].id)) initial.push(extracted[1].id);
      }
      setSelectedReportIds(initial);
    });
  }, [initialReportAId, initialReportBId]);

  // اجرای مقایسه چندگانه
  const doMultiCompare = async (ids: number[]) => {
    if (ids.length < 2) {
      setDiffData(null);
      return;
    }
    setLoading(true);
    try {
      const data = await diffApi.compareMultiple(ids);
      setDiffData(data);
    } catch (err) {
      console.error('خطا در مقایسه گزارش‌ها:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReportIds.length >= 2) {
      doMultiCompare(selectedReportIds);
    }
  }, [selectedReportIds]);

  useEffect(() => {
    if (fieldBankVersion && fieldBankVersion > 0 && selectedReportIds.length >= 2) {
      doMultiCompare(selectedReportIds);
    }
  }, [fieldBankVersion]);

  // افزودن گزارش به لیست مقایسه
  const handleAddReport = (id: number) => {
    if (!selectedReportIds.includes(id)) {
      if (selectedReportIds.length >= 8) {
        alert('امکان مقایسه همزمان حداکثر تا ۸ گزارش فراهم است.');
        return;
      }
      setSelectedReportIds([...selectedReportIds, id]);
    }
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // حذف گزارش از لیست مقایسه
  const handleRemoveReport = (id: number) => {
    setSelectedReportIds(selectedReportIds.filter((item) => item !== id));
  };

  // گزینه‌های جستجو شده منطبق
  const filteredSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reportList
      .filter((r) => !selectedReportIds.includes(r.id))
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
      .slice(0, 15);
  }, [reportList, selectedReportIds, searchQuery]);

  // فیلتر فیلدهای خروجی در جدول ماتریسی
  const displayedFieldDiffs = useMemo(() => {
    if (!diffData) return [];
    if (fieldFilterTab === 'common') {
      return diffData.fieldDiffs.filter((f) => f.isCommonToAll);
    }
    if (fieldFilterTab === 'formulaDiff') {
      return diffData.fieldDiffs.filter((f) => f.hasFormulaDifference);
    }
    if (fieldFilterTab === 'specific') {
      return diffData.fieldDiffs.filter((f) => !f.isCommonToAll);
    }
    return diffData.fieldDiffs;
  }, [diffData, fieldFilterTab]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* هدر بخش مقایسه هوشمند چندگانه */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              موتور مقایسه گزارش‌ها (Multi-Report Diff Analyzer)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              امکان انتخاب، جست‌وجو و مقایسه هم‌زمان ۲ تا ۸ گزارش مختلف و کشف تفاوت‌های فرمولی و ساختار ستون‌ها.
            </p>
          </div>
        </div>
      </div>

      {/* بخش انتخاب و جست‌وجوی چندگانه گزارش‌ها */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>گزارش‌های انتخاب‌شده جهت مقایسه ({selectedReportIds.length} مورد):</span>
          </label>

          <div className="flex items-center gap-2">
            {selectedReportIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedReportIds([])}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>پاک‌سازی انتخاب‌ها</span>
              </button>
            )}
          </div>
        </div>

        {/* لیست نشان‌های گزارش‌های انتخاب‌شده */}
        <div className="flex flex-wrap items-center gap-2 min-h-11 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          {selectedReportIds.length === 0 ? (
            <span className="text-xs text-slate-400">
              هنوز گزارشی انتخاب نشده است. از نوار جستجوی زیر گزارش‌های مدنظر را اضافه کنید (حداقل ۲ گزارش).
            </span>
          ) : (
            selectedReportIds.map((id, idx) => {
              const rep = reportList.find((r) => r.id === id);
              if (!rep) return null;
              const palette = REPORT_PALETTE[idx % REPORT_PALETTE.length];

              return (
                <div
                  key={id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${palette.border} ${palette.bg} shadow-2xs transition-all`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${palette.badge}`}>
                    کد {rep.code}
                  </span>
                  <span className={`text-xs font-bold ${palette.text}`}>{rep.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveReport(id)}
                    title="حذف از مقایسه"
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full hover:bg-white/80 transition-colors mr-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* فیلد جستجو و دراپ‌داون افزودن گزارش */}
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              placeholder="جست‌وجوی نام یا کد گزارش جهت افزودن به مقایسه..."
              className="w-full text-xs pr-9 pl-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs"
            />
          </div>

          {/* منوی بازشونده نتایج منطبق */}
          {isDropdownOpen && (
            <div className="absolute top-full mt-1.5 right-0 left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
              <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-500 flex justify-between items-center">
                <span>انتخاب از گزارش‌ها ({filteredSuggestions.length} مورد منطبق)</span>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  بستن ✕
                </button>
              </div>

              {filteredSuggestions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">گزارش منطبقی یافت نشد.</div>
              ) : (
                filteredSuggestions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleAddReport(r.id)}
                    className="w-full text-right p-2.5 hover:bg-purple-50 flex items-center justify-between text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-bold group-hover:bg-purple-100 group-hover:text-purple-800">
                        {r.code}
                      </span>
                      <span className="font-medium text-slate-800 group-hover:text-purple-900">{r.title}</span>
                    </div>
                    <span className="text-[11px] text-purple-600 font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3.5 h-3.5" /> افزودن به مقایسه
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* وضعیت لودینگ یا ناکافی بودن گزارش‌ها */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          در حال واکشی و تحلیل هوشمند شباهت‌ها و تفاوت‌ها...
        </div>
      ) : selectedReportIds.length < 2 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 space-y-2">
          <GitCompare className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-600">گزارش‌های کافی انتخاب نشده است</h4>
          <p className="text-xs text-slate-400">لطفاً حداقل ۲ گزارش را از نوار جستجوی بالا انتخاب فرمایید تا جدول ماتریسی مقایسه نمایش یابد.</p>
        </div>
      ) : !diffData ? (
        <div className="text-center py-12 text-slate-400 text-xs">خطا در بارگذاری نتایج مقایسه.</div>
      ) : (
        <div className="space-y-6">
          {/* ۱. جدول ماتریس مقایسه فیلدهای خروجی */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>ماتریس جامع مقایسه فیلدهای خروجی</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({diffData.fieldDiffs.length} فیلد یکتا در کل گزارش‌های انتخابی)
                  </span>
                </h3>
              </div>

              {/* تب‌های فیلتر ماتریس فیلدها */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setFieldFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    fieldFilterTab === 'all' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  همه ({diffData.fieldDiffs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFieldFilterTab('common')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    fieldFilterTab === 'common' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  مشترک در همه ({diffData.fieldDiffs.filter((f) => f.isCommonToAll).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFieldFilterTab('formulaDiff')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    fieldFilterTab === 'formulaDiff' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  دارای تفاوت فرمول ({diffData.fieldDiffs.filter((f) => f.hasFormulaDifference).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFieldFilterTab('specific')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    fieldFilterTab === 'specific' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  اختصاصی ({diffData.fieldDiffs.filter((f) => !f.isCommonToAll).length})
                </button>
              </div>
            </div>

            {/* جدول ماتریسی فیلدها */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                    <th className="py-3 px-3 w-40">عنوان استاندارد</th>
                    <th className="py-3 px-3 w-28 font-mono">نام فنی</th>
                    <th className="py-3 px-2 w-28 text-center">وضعیت اشتراک</th>

                    {/* ستون‌های داینامیک به ازای هر گزارش انتخاب‌شده */}
                    {diffData.reports.map((rep, rIdx) => {
                      const palette = REPORT_PALETTE[rIdx % REPORT_PALETTE.length];
                      return (
                        <th
                          key={rep.reportId}
                          className={`py-3 px-3 text-center border-r border-slate-200/80 ${palette.bg}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${palette.badge}`}>
                              کد {rep.reportCode}
                            </span>
                            <span className="text-slate-800 text-[11px] truncate max-w-32" title={rep.title}>
                              {rep.title}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {displayedFieldDiffs.length === 0 ? (
                    <tr>
                      <td colSpan={3 + diffData.reports.length} className="py-8 text-center text-slate-400 text-xs">
                        فیلدی در این دسته‌بندی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    displayedFieldDiffs.map((fd) => (
                      <tr
                        key={fd.fieldId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          fd.hasFormulaDifference ? 'bg-amber-50/30' : fd.isCommonToAll ? '' : 'bg-slate-50/20'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-800">{fd.displayName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{fd.technicalName || '-'}</td>
                        <td className="py-2.5 px-2 text-center">
                          {fd.isCommonToAll ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Check className="w-3 h-3" /> در تمام گزارش‌ها
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              در {fd.presence.filter((p) => p.exists).length} گزارش
                            </span>
                          )}
                        </td>

                        {/* وضعیت فیلد در هر گزارش */}
                        {fd.presence.map((p) => {
                          return (
                            <td
                              key={p.reportId}
                              className={`py-2.5 px-3 text-center border-r border-slate-100 ${
                                p.exists ? '' : 'bg-slate-50/40 text-slate-300'
                              }`}
                            >
                              {p.exists ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-[10px] font-mono text-slate-500">#{p.displayOrder}</span>
                                  </div>
                                  {p.customFormula && (
                                    <span className="inline-block text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-bold max-w-32 truncate" title={p.customFormula}>
                                      fx {p.customFormula}
                                    </span>
                                  )}
                                  {p.customNote && (
                                    <p className="text-[10px] text-slate-500 max-w-32 truncate mx-auto" title={p.customNote}>
                                      {p.customNote}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 font-bold">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ۳. جدول ماتریس مقایسه پارامترها و شروط ورودی */}
          {diffData.parameterDiffs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>ماتریس مقایسه پارامترها و فیلترهای ورودی</span>
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                      <th className="py-3 px-3">نام پارامتر</th>
                      <th className="py-3 px-3 text-center">وضعیت</th>
                      {diffData.reports.map((rep, rIdx) => {
                        const palette = REPORT_PALETTE[rIdx % REPORT_PALETTE.length];
                        return (
                          <th key={rep.reportId} className={`py-3 px-3 text-center border-r border-slate-200/80 ${palette.bg}`}>
                            کد {rep.reportCode}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {diffData.parameterDiffs.map((pd) => (
                      <tr key={pd.parameterName} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{pd.parameterName}</td>
                        <td className="py-2.5 px-3 text-center">
                          {pd.isCommonToAll ? (
                            <span className="text-emerald-700 bg-emerald-50 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              مشترک در همه
                            </span>
                          ) : (
                            <span className="text-slate-500 bg-slate-100 text-[10px] px-2 py-0.5 rounded-full">
                              اختصاصی
                            </span>
                          )}
                        </td>
                        {pd.presence.map((p) => {
                          const ctrlOpt = UI_CONTROL_TYPE_OPTIONS.find((o) => o.value === p.uiControlType);
                          return (
                            <td key={p.reportId} className="py-2.5 px-3 text-center border-r border-slate-100">
                              {p.exists ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                                    <Check className="w-3.5 h-3.5" />
                                    {p.isRequired ? 'اجباری' : 'اختیاری'}
                                  </span>
                                  {ctrlOpt && (
                                    <div>
                                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.2">
                                        <span>{ctrlOpt.icon}</span>
                                        <span>{ctrlOpt.label}</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
