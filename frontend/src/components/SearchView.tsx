import React, { useEffect, useState } from 'react';
import type { FieldBankItem, SearchResultItem, Tag } from '../types';
import { fieldBankApi, searchApi, tagsApi } from '../api/client';
import { CheckCircle2, Clock, Filter, Layers, Search, Sparkles } from 'lucide-react';

interface SearchViewProps {
  onSelectReport: (reportId: number) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onSelectReport }) => {
  const [query, setQuery] = useState('');
  const [fields, setFields] = useState<FieldBankItem[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<number[]>([]);
  const [matchAllFields, setMatchAllFields] = useState(true); // true = AND, false = OR
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fieldBankApi.getAll().then(setFields);
    tagsApi.getAll().then(setTags);
    doSearch([], true, [], undefined, '');
  }, []);

  const doSearch = async (
    fieldIds = selectedFieldIds,
    matchAll = matchAllFields,
    tagIds = selectedTagIds,
    st = status,
    q = query
  ) => {
    setIsSearching(true);
    try {
      const data = await searchApi.search({
        query: q,
        fieldIds: fieldIds.length > 0 ? fieldIds : undefined,
        matchAllFields: matchAll,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
        status: st,
      });
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleField = (id: number) => {
    const updated = selectedFieldIds.includes(id)
      ? selectedFieldIds.filter((x) => x !== id)
      : [...selectedFieldIds, id];
    setSelectedFieldIds(updated);
    doSearch(updated, matchAllFields, selectedTagIds, status, query);
  };

  const toggleTag = (id: number) => {
    const updated = selectedTagIds.includes(id)
      ? selectedTagIds.filter((x) => x !== id)
      : [...selectedTagIds, id];
    setSelectedTagIds(updated);
    doSearch(selectedFieldIds, matchAllFields, updated, status, query);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* هدر بخش فیلتر */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          موتور جست‌وجو و فیلتر پیشرفته چندبعدی
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          گزارش‌ها را بر اساس ترکیب فیلدهای محاسباتی (منطق AND/OR)، برچسب‌ها و وضعیت بررسی کشف کنید.
        </p>
      </div>

      {/* نوار جست‌وجوی متنی */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              doSearch(selectedFieldIds, matchAllFields, selectedTagIds, status, e.target.value);
            }}
            placeholder="جست‌وجو در عنوان، کد گزارش یا شرح سناریوی کاربردی..."
            className="w-full text-xs pr-9 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* بخش فیلتر هوشمند فیلدها با سوئیچ AND / OR */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              فیلتر بر اساس فیلدهای بانک مرکزی (Field Bank):
            </span>

            {/* سوئیچ وضعیت AND / OR (FR-10) */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => {
                  setMatchAllFields(true);
                  doSearch(selectedFieldIds, true, selectedTagIds, status, query);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  matchAllFields ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                حالت AND (شامل تمام فیلدها)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatchAllFields(false);
                  doSearch(selectedFieldIds, false, selectedTagIds, status, query);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  !matchAllFields ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                حالت OR (حداقل یک فیلد)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            {fields.map((f) => {
              const isSelected = selectedFieldIds.includes(f.fieldId);
              return (
                <button
                  key={f.fieldId}
                  onClick={() => toggleField(f.fieldId)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {f.displayName}
                </button>
              );
            })}
          </div>
        </div>

        {/* فیلتر تگ‌ها و وضعیت */}
        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600 ml-2">برچسب‌ها:</span>
            {tags.map((t) => {
              const isSelected = selectedTagIds.includes(t.tagId);
              return (
                <button
                  key={t.tagId}
                  onClick={() => toggleTag(t.tagId)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  #{t.tagName}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">وضعیت:</span>
            <select
              value={status ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setStatus(val);
                doSearch(selectedFieldIds, matchAllFields, selectedTagIds, val, query);
              }}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-hidden"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="1">در انتظار بررسی</option>
              <option value="2">در حال تکمیل</option>
              <option value="3">تایید شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* نتایج جست‌وجو */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            نتایج تطبیق یافته ({results.length} گزارش)
          </h3>
        </div>

        {isSearching ? (
          <div className="text-center py-12 text-slate-400 text-xs">در حال جست‌وجو...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            گزارشی با شروط انتخابی یافت نشد.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((r) => (
              <div
                key={r.reportId}
                onClick={() => onSelectReport(r.reportId)}
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md p-4 rounded-2xl cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                      {r.reportCode}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-1">
                      {r.title}
                    </h4>
                  </div>
                  {r.status === 3 ? (
                    <span className="text-emerald-600"><CheckCircle2 className="w-4 h-4" /></span>
                  ) : (
                    <span className="text-amber-500"><Clock className="w-4 h-4" /></span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>ماژول: {r.moduleTitle || '-'}</span>
                  <span className="text-emerald-700 font-medium">
                    {r.matchedFieldCount} فیلد منطبق (از کل {r.fieldCount})
                  </span>
                </div>

                {r.tagNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {r.tagNames.map((tag, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
