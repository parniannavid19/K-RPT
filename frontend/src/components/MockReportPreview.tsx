import React, { useMemo, useState } from 'react';
import type { ReportFieldItem, ReportParameterItem } from '../types';
import {
  Calculator,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Info,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

interface MockReportPreviewProps {
  reportTitle: string;
  reportCode: string;
  fields: ReportFieldItem[];
  parameters?: ReportParameterItem[];
  reportCalculationFormula?: string;
  onOpenFieldManager?: () => void;
}

export const MockReportPreview: React.FC<MockReportPreviewProps> = ({
  reportTitle,
  reportCode,
  fields,
  parameters = [],
  reportCalculationFormula,
  onOpenFieldManager,
}) => {
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [seed, setSeed] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedFormula, setCopiedFormula] = useState(false);

  // بستن کارت بازرسی فرمول با دکمه Esc
  React.useEffect(() => {
    if (!selectedFieldId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedFieldId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId]);

  // بررسی فیلدهای دارای فرمول محاسباتی
  const formulaFields = useMemo(() => {
    return fields.filter((f) => Boolean(f.customFormula?.trim()));
  }, [fields]);

  // فیلد فعال انتخاب‌شده جهت بازرسی فرمول
  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null;
    return fields.find((f) => f.fieldId === selectedFieldId) || null;
  }, [fields, selectedFieldId]);

  // فرمول فیلد انتخاب‌شده
  const activeFormula = selectedField
    ? selectedField.customFormula?.trim() || null
    : null;

  // تولید ۵ ردیف داده شبیه‌سازی‌شده و واقعی‌نما بر اساس عناوین ستون‌ها
  const mockRows = useMemo(() => {
    if (!fields || fields.length === 0) return [];

    const rowCount = 5;
    const rows: Record<string, string>[] = [];

    const sampleProducts = [
      'روغن سرخ‌کردنی ۱.۵ لیتری بهار',
      'برنج طارم درجه یک ۵ کیلویی شمال',
      'شیر کم‌چرب ۱ لیتری پگاه',
      'ماکارونی اسپاگتی ۷۰۰ گرمی زرماکارون',
      'چای شکسته خارجی ۵۰۰ گرمی گلستان',
      'پنیر یو اف ۴۰۰ گرمی کاله',
      'رب گوجه فرنگی ۸۰۰ گرمی روژین',
      'مایع ظرفشویی ۴ لیتری پریل',
    ];

    const sampleCashiers = ['سارا احمدی', 'رضا محمدی', 'علی کریمی', 'فاطمه نوری', 'حسین رضایی'];
    const sampleStores = ['شعبه مرکزی ونک', 'شعبه سعادت‌آباد', 'شعبه تجریش', 'شعبه هفت‌تیر', 'شعبه نارمک'];
    const sampleSuppliers = ['صنایع غذایی بهروز', 'شرکت کاله', 'پگاه تهران', 'شرکت زرماکارون', 'پخش البرز'];
    const sampleCategories = ['روغن‌ها و چربی‌ها', 'غلات و برنج', 'لبنیات', 'ماکارونی و پاستا', 'نوشیدنی‌های گرم'];
    const sampleDates = ['۱۴۰۳/۰۸/۲۲', '۱۴۰۳/۰۸/۲۳', '۱۴۰۳/۰۸/۲۴', '۱۴۰۳/۰۸/۲۵', '۱۴۰۳/۰۸/۲۶'];
    const sampleTimes = ['۰۹:۱۵:۲۰', '۱۱:۴۰:۱۲', '۱۴:۰۵:۴۵', '۱۶:۵۰:۱۸', '۱۹:۲۲:۰۹'];
    const samplePayMethods = ['کارت‌خوان بانکی (POS)', 'کارت هدیه/بن', 'کارت‌خوان بانکی (POS)', 'نقدی', 'درگاه پرداخت آنلاین'];

    for (let r = 0; r < rowCount; r++) {
      const row: Record<string, string> = { _id: (r + 1).toString() };
      const rowIdx = (r + seed) % 8;

      fields.forEach((field) => {
        const name = (field.displayName || '').trim();
        const tech = (field.technicalName || '').toLowerCase();
        const formula = field.customFormula?.trim();

        // ۱. ستون‌های بارکد
        if (name.includes('بارکد') || tech.includes('barcode')) {
          row[field.fieldId] = `۶۲۶۰${(123456789 + r * 11111 + seed * 99).toString().slice(0, 9)}`;
        }
        // ۲. شماره یا کد کالا
        else if (name.includes('کد کالا') || name.includes('شماره کالا') || tech.includes('item_id') || tech.includes('productcode')) {
          row[field.fieldId] = (10420 + r * 3 + seed).toString();
        }
        // ۳. شماره جایگزین
        else if (name.includes('جایگزین')) {
          row[field.fieldId] = (20500 + r * 2 + seed).toString();
        }
        // ۴. نام یا شرح کالا
        else if (name.includes('نام کالا') || name.includes('شرح کالا') || name.includes('کالا')) {
          row[field.fieldId] = sampleProducts[rowIdx % sampleProducts.length];
        }
        // ۵. گروه یا دسته‌بندی کالا
        else if (name.includes('گروه') || name.includes('دسته')) {
          row[field.fieldId] = sampleCategories[rowIdx % sampleCategories.length];
        }
        // ۶. فیلد محاسباتی موجودی دردسترس (فرمول: موجودی - رزرو)
        else if (name.includes('دردسترس') || formula?.includes('موجودی')) {
          const avail = 85 + r * 20 - (seed % 10);
          row[field.fieldId] = `${avail.toLocaleString('fa-IR')} عدد`;
        }
        // ۷. موجودی انبار / فیزیکی
        else if (name.includes('موجودی') || tech.includes('stock') || tech.includes('inventory')) {
          const stock = 110 + r * 25;
          row[field.fieldId] = `${stock.toLocaleString('fa-IR')} عدد`;
        }
        // ۸. رزرو / امانی
        else if (name.includes('رزرو') || tech.includes('reserved')) {
          const res = 25 + r * 5;
          row[field.fieldId] = `${res.toLocaleString('fa-IR')} عدد`;
        }
        // ۹. قیمت واحد و بهای خرید
        else if (name.includes('قیمت') || name.includes('بها') || tech.includes('price')) {
          const prices = [450000, 1350000, 280000, 195000, 820000];
          const val = prices[r % prices.length] + seed * 5000;
          row[field.fieldId] = `${val.toLocaleString('fa-IR')} ریال`;
        }
        // ۱۰. مبالغ کل و ناخالص
        else if (name.includes('ناخالص') || name.includes('مبلغ کل') || name.includes('فروش کل')) {
          const totals = [13500000, 40500000, 8400000, 5850000, 24600000];
          const val = totals[r % totals.length];
          row[field.fieldId] = `${val.toLocaleString('fa-IR')} ریال`;
        }
        // ۱۱. تخفیفات
        else if (name.includes('تخفیف') || tech.includes('discount')) {
          const discounts = [675000, 2025000, 0, 292500, 1230000];
          const val = discounts[r % discounts.length];
          row[field.fieldId] = val === 0 ? '۰ ریال' : `${val.toLocaleString('fa-IR')} ریال`;
        }
        // ۱۲. خالص دریافتی و سود (فیلدهای فرمول‌دار مالی)
        else if (name.includes('خالص') || name.includes('سود') || formula?.includes('-') || formula?.includes('+')) {
          const nets = [12825000, 38475000, 8400000, 5557500, 23370000];
          const val = nets[r % nets.length];
          row[field.fieldId] = `${val.toLocaleString('fa-IR')} ریال`;
        }
        // ۱۳. تاریخ و ساعت
        else if (name.includes('تاریخ') || tech.includes('date')) {
          row[field.fieldId] = sampleDates[r % sampleDates.length];
        } else if (name.includes('ساعت') || name.includes('زمان') || tech.includes('time')) {
          row[field.fieldId] = sampleTimes[r % sampleTimes.length];
        }
        // ۱۴. صندوقدار، پرسنل، کاربر
        else if (name.includes('صندوق') || name.includes('کاربر') || name.includes('پرسنل')) {
          row[field.fieldId] = sampleCashiers[r % sampleCashiers.length];
        }
        // ۱۵. فروشگاه و شعبه
        else if (name.includes('فروشگاه') || name.includes('شعبه') || name.includes('انبار')) {
          row[field.fieldId] = sampleStores[r % sampleStores.length];
        }
        // ۱۶. تامین‌کننده
        else if (name.includes('تامین') || tech.includes('supplier')) {
          row[field.fieldId] = sampleSuppliers[r % sampleSuppliers.length];
        }
        // ۱۷. روش پرداخت
        else if (name.includes('روش پرداخت') || name.includes('نوع پرداخت')) {
          row[field.fieldId] = samplePayMethods[r % samplePayMethods.length];
        }
        // ۱۸. تعداد یا مقدار
        else if (name.includes('تعداد') || name.includes('مقدار') || tech.includes('qty')) {
          row[field.fieldId] = `${(12 + r * 6).toLocaleString('fa-IR')}`;
        }
        // ۱۹. درصد
        else if (name.includes('درصد') || name.includes('نرخ') || tech.includes('percent')) {
          row[field.fieldId] = `${(9 + (r % 3) * 3)}٪`;
        }
        // ۲۰. وضعیت
        else if (name.includes('وضعیت') || tech.includes('status')) {
          row[field.fieldId] = r % 2 === 0 ? 'تایید شده' : 'تسویه قطعی';
        }
        // مقدار عمومی پیش‌فرض
        else {
          row[field.fieldId] = `${name} #${r + 1}`;
        }
      });

      rows.push(row);
    }

    return rows;
  }, [fields, seed]);

  // پالایش ردیف‌های شبیه‌سازی‌شده با کادر جستجو
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return mockRows;
    const term = searchTerm.toLowerCase().trim();
    return mockRows.filter((row) =>
      Object.values(row).some((val) => val.toLowerCase().includes(term))
    );
  }, [mockRows, searchTerm]);

  // کپی کردن فرمول فیلد
  const handleCopyFormula = (formulaText: string) => {
    navigator.clipboard.writeText(formulaText);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  // دانلود خروجی شبیه‌سازی‌شده با فرمت CSV و استاندارد UTF-8 BOM برای اکسل
  const handleExportCsv = () => {
    if (fields.length === 0 || mockRows.length === 0) return;

    const headers = ['ردیف', ...fields.map((f) => f.displayName)];
    const csvLines = [headers.join(',')];

    mockRows.forEach((row, idx) => {
      const rowValues = [
        (idx + 1).toString(),
        ...fields.map((f) => `"${(row[f.fieldId] || '').replace(/"/g, '""')}"`),
      ];
      csvLines.push(rowValues.join(','));
    });

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `شبیه_سازی_${reportCode || 'گزارش'}_${reportTitle.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
      {/* هدر بخش شبیه‌سازی گزارش */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>پیش‌نمایش و خروجی شبیه‌سازی‌شده گزارش</span>
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full font-bold">
                  کد {reportCode}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                خروجی تعاملی نمونه با تمامی فیلدهای ثبت‌شده؛ با انتخاب هر فیلد فرمول‌دار، فرمول محاسباتی آن نمایش داده می‌شود.
              </p>
              {parameters.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 pt-1">
                  <span className="font-bold text-slate-600">فیلترهای گزارش:</span>
                  {parameters.map((p) => (
                    <span key={p.parameterId} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                      {p.parameterName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* دکمه‌های کنترلی شبیه‌سازی */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setSeed((prev) => prev + 1)}
            title="تولید مقادیر تصادفی جدید برای تست شبیه‌سازی"
            className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>تولید مجدد داده‌ها</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={fields.length === 0}
            title="دانلود خروجی نمونه اکسل با انکودینگ فارسی UTF-8"
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دریافت فایل نمونه اکسل</span>
          </button>
        </div>
      </div>

      {/* اگر گزارشی هیچ فیلدی ندارد */}
      {fields.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100 shadow-2xs">
            <Info className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-xs font-bold text-slate-800">هیچ فیلدی برای این گزارش تعریف نشده است</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              برای نمایش جدول شبیه‌سازی‌شده و فرمول‌های محاسباتی، ابتدا ستون‌ها و فیلدهای این گزارش را از بخش «فیلدهای خروجی گزارش» به گزارش اضافه کنید.
            </p>
          </div>
          {onOpenFieldManager && (
            <button
              type="button"
              onClick={onOpenFieldManager}
              className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs inline-flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>انتخاب فیلدها از مخزن مرکزی</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* نوار فیلترهای شبیه‌سازی و دسترسی سریع به ستون‌های فرمول‌دار */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80">
            {/* لیست دسترسی سریع به فیلدهای فرمول‌دار */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                <span>فیلدهای فرمول‌دار:</span>
              </span>
              {formulaFields.length === 0 ? (
                <span className="text-[11px] text-slate-400">فیلد دارای فرمول در این گزارش ثبت نشده است.</span>
              ) : (
                formulaFields.map((f) => {
                  const isSelected = selectedFieldId === f.fieldId;
                  return (
                    <button
                      key={f.fieldId}
                      type="button"
                      onClick={() => setSelectedFieldId(isSelected ? null : f.fieldId)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs scale-102 ring-2 ring-indigo-300'
                          : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                      }`}
                    >
                      <span className="text-[10px] font-mono opacity-80">fx</span>
                      <span>{f.displayName}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* کادر فیلتر و جستجو درون ردیف‌های شبیه‌سازی‌شده */}
            <div className="relative w-full md:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در داده‌های نمونه..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* پنل بازرس فرمول (Formula Inspector) - با انتخاب ستون فرمول‌دار نمایش داده می‌شود */}
          {selectedField && activeFormula && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border-2 border-indigo-300 rounded-2xl shadow-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs font-mono">
                    fx
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-950">
                      فرمول محاسباتی فیلد «{selectedField.displayName}»
                    </span>
                    {selectedField.technicalName && (
                      <span className="text-[10px] text-indigo-700 mr-2 font-mono">
                        ({selectedField.technicalName})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyFormula(activeFormula)}
                    className="px-2.5 py-1 text-[11px] bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold flex items-center gap-1 transition-colors"
                  >
                    {copiedFormula ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">کپی شد!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی فرمول</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFieldId(null)}
                    title="بستن پنل فرمول"
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* فرمول فیلد با فونت وزیرمتن و طراحی برجسته */}
              <div className="p-3 bg-white/95 border border-indigo-200 rounded-xl font-bold text-sm text-indigo-900 shadow-inner flex items-center justify-between select-all leading-relaxed">
                <span dir="auto" className="tracking-wide">{activeFormula}</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-normal shrink-0 mr-2">
                  فرمول محاسباتی فعال
                </span>
              </div>

              {/* توضیحات تکمیلی یا یادداشت ستون در صورت وجود */}
              {selectedField.customNote && (
                <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                  <span>{selectedField.customNote}</span>
                </div>
              )}
            </div>
          )}

          {/* اگر فرمول کلی در سطح گزارش وجود دارد */}
          {!selectedField && reportCalculationFormula && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600 font-medium">فرمول کلی گزارش:</span>
                <span className="font-bold text-slate-800">{reportCalculationFormula}</span>
              </div>
              <span className="text-[10px] text-slate-400">فرمول تجمیعی</span>
            </div>
          )}

          {/* جدول شبیه‌سازی‌شده خروجی گزارش با کلیه فیلدها */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold sticky top-0 z-10 backdrop-blur-xs">
                    {/* ردیف */}
                    <th className="py-3 px-3 w-12 text-center text-slate-500 border-l border-slate-200/70">
                      ردیف
                    </th>

                    {/* کلیه ستون‌های گزارش بر اساس فیلدهای ثبت‌شده */}
                    {fields.map((field) => {
                      const formula = field.customFormula?.trim();
                      const hasFormula = Boolean(formula);
                      const isSelected = selectedFieldId === field.fieldId;

                      return (
                        <th
                          key={field.fieldId}
                          onClick={() => {
                            if (hasFormula) {
                              setSelectedFieldId(isSelected ? null : field.fieldId);
                            }
                          }}
                          className={`py-3 px-3.5 transition-colors border-l border-slate-200/70 whitespace-nowrap select-none ${
                            hasFormula ? 'cursor-pointer hover:bg-indigo-50/80' : ''
                          } ${
                            isSelected
                              ? 'bg-indigo-100 text-indigo-900 ring-2 ring-indigo-400 ring-inset'
                              : ''
                          }`}
                          title={
                            hasFormula
                              ? `فیلد فرمول‌دار: کلیک کنید تا فرمول (${formula}) نمایش داده شود`
                              : field.displayName
                          }
                        >
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="font-bold">{field.displayName}</span>
                            {hasFormula && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5 transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                <span className="font-mono">fx</span>
                                <span>فرمول</span>
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={fields.length + 1} className="py-8 text-center text-slate-400 text-xs">
                        موردی منطبق با جستجوی شما یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, rIdx) => (
                      <tr
                        key={row._id || rIdx}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* شماره ردیف */}
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] border-l border-slate-100 bg-slate-50/50">
                          {rIdx + 1}
                        </td>

                        {/* سلول‌های هر ستون */}
                        {fields.map((field) => {
                          const formula = field.customFormula?.trim();
                          const hasFormula = Boolean(formula);
                          const isSelected = selectedFieldId === field.fieldId;
                          const cellVal = row[field.fieldId] || '-';

                          return (
                            <td
                              key={field.fieldId}
                              onClick={() => {
                                if (hasFormula) {
                                  setSelectedFieldId(isSelected ? null : field.fieldId);
                                }
                              }}
                              className={`py-2.5 px-3.5 border-l border-slate-100 whitespace-nowrap transition-colors ${
                                hasFormula ? 'cursor-pointer' : ''
                              } ${
                                isSelected
                                  ? 'bg-indigo-50/80 text-indigo-950 font-bold border-l-indigo-200'
                                  : 'text-slate-700'
                              }`}
                              title={hasFormula ? `فرمول: ${formula}` : undefined}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{cellVal}</span>
                                {hasFormula && isSelected && (
                                  <span className="text-[9px] text-indigo-600 bg-white px-1 rounded border border-indigo-200">
                                    fx
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* فوتر اطلاعاتی جدول شبیه‌سازی */}
            <div className="p-3 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex items-center gap-3">
                <span>نمایش {filteredRows.length} ردیف داده‌ی نمونه شبیه‌سازی‌شده</span>
                <span>•</span>
                <span>تعداد ستون‌ها: {fields.length} فیلد</span>
                <span>•</span>
                <span className="text-indigo-600 font-bold">
                  {formulaFields.length} ستون فرمول‌دار
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">راهنما:</span>
                <span>روی ستون‌های دارای نشانگر <span className="font-mono text-indigo-600 font-bold">fx</span> کلیک کنید تا فرمول نمایش داده شود.</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
