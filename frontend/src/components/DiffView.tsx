import React, { useEffect, useState } from 'react';
import type { DiffResponse, TreeNode } from '../types';
import { diffApi, treeApi } from '../api/client';
import { AlertTriangle, Check, GitCompare, Plus } from 'lucide-react';

interface DiffViewProps {
  initialReportAId?: number | null;
  initialReportBId?: number | null;
}

export const DiffView: React.FC<DiffViewProps> = ({
  initialReportAId,
  initialReportBId,
}) => {
  const [reportList, setReportList] = useState<{ id: number; title: string; code: string }[]>([]);
  const [reportAId, setReportAId] = useState<number | null>(initialReportAId || null);
  const [reportBId, setReportBId] = useState<number | null>(initialReportBId || null);
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [loading, setLoading] = useState(false);

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

      if (!reportAId && extracted.length > 0) setReportAId(extracted[0].id);
      if (!reportBId && extracted.length > 1) setReportBId(extracted[1].id);
    });
  }, []);

  const handleCompare = async () => {
    if (!reportAId || !reportBId) return;
    setLoading(true);
    try {
      const data = await diffApi.compare(reportAId, reportBId);
      setDiffData(data);
    } catch (err) {
      console.error(err);
      alert('خطا در دریافت مقایسه دو گزارش');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportAId && reportBId && reportAId !== reportBId) {
      handleCompare();
    }
  }, [reportAId, reportBId]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* هدر بخش مقایسه */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-purple-600" />
          موتور مقایسه هوشمند دو گزارش (Diff Analyzer)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          مشاهده دقیق تفاوت‌ها و شباهت‌های دو گزارش در فرمول‌های محاسباتی، فیلدهای خروجی و پارامترها.
        </p>
      </div>

      {/* انتخابگر دو گزارش */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* گزارش الف */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-blue-700">گزارش اول (الف):</label>
          <select
            value={reportAId ?? ''}
            onChange={(e) => setReportAId(Number(e.target.value))}
            className="w-full text-xs border border-blue-200 bg-blue-50/40 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-blue-500"
          >
            {reportList.map((r) => (
              <option key={r.id} value={r.id}>
                [{r.code}] {r.title}
              </option>
            ))}
          </select>
        </div>

        {/* گزارش ب */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-purple-700">گزارش دوم (ب):</label>
          <select
            value={reportBId ?? ''}
            onChange={(e) => setReportBId(Number(e.target.value))}
            className="w-full text-xs border border-purple-200 bg-purple-50/40 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-purple-500"
          >
            {reportList.map((r) => (
              <option key={r.id} value={r.id}>
                [{r.code}] {r.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">در حال مقایسه و تحلیل...</div>
      ) : !diffData ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          جهت مشاهده نتایج مقایسه، دو گزارش متفاوت انتخاب کنید.
        </div>
      ) : (
        <div className="space-y-6">
          {/* ۱. مقایسه فرمول‌های محاسباتی */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-purple-600" />
              مقایسه فرمول محاسباتی کلی
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-[11px] font-bold text-blue-800 block mb-1">
                  فرمول [{diffData.reportA.reportCode}]:
                </span>
                <pre className="text-xs font-mono text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto text-left" dir="ltr">
                  {diffData.reportA.calculationFormula || '// بدون فرمول ثبت‌شده'}
                </pre>
              </div>
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <span className="text-[11px] font-bold text-purple-800 block mb-1">
                  فرمول [{diffData.reportB.reportCode}]:
                </span>
                <pre className="text-xs font-mono text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto text-left" dir="ltr">
                  {diffData.reportB.calculationFormula || '// بدون فرمول ثبت‌شده'}
                </pre>
              </div>
            </div>
          </div>

          {/* ۲. جدول ماتریس مقایسه فیلدها */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 mb-3">
              ماتریس مقایسه فیلدهای خروجی
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                    <th className="py-2.5 px-3">عنوان فیلد</th>
                    <th className="py-2.5 px-3 font-mono">نام فنی</th>
                    <th className="py-2.5 px-3 text-center">وضعیت اشتراک</th>
                    <th className="py-2.5 px-3">تفاوت در فرمول / توضیح اختصاصی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diffData.fieldDiffs.map((fd) => {
                    const isCommon = fd.existsInReportA && fd.existsInReportB;
                    const isOnlyA = fd.existsInReportA && !fd.existsInReportB;

                    return (
                      <tr
                        key={fd.fieldId}
                        className={
                          fd.hasFormulaDifference
                            ? 'bg-amber-50/50'
                            : isCommon
                            ? 'hover:bg-slate-50'
                            : isOnlyA
                            ? 'bg-blue-50/30'
                            : 'bg-purple-50/30'
                        }
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{fd.displayName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{fd.technicalName}</td>
                        <td className="py-2.5 px-3 text-center">
                          {isCommon ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Check className="w-3 h-3" /> مشترک در هر دو
                            </span>
                          ) : isOnlyA ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Plus className="w-3 h-3" /> فقط در گزارش الف
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Plus className="w-3 h-3" /> فقط در گزارش ب
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {fd.hasFormulaDifference ? (
                            <span className="text-amber-700 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              تفاوت فرمول: الف ({fd.formulaA || '-'}) | ب ({fd.formulaB || '-'})
                            </span>
                          ) : (
                            <span className="text-slate-500">{fd.customNoteA || fd.customNoteB || '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
