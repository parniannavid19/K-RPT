import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  Shield,
  UploadCloud,
  X,
} from 'lucide-react';
import type { PermissionTreeNode } from '../types';
import { permissionTreeApi, permissionsApi } from '../api/client';
import { useToast } from './Toast';

interface PermissionExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  treeNodes: PermissionTreeNode[];
  onImportComplete: () => void;
}

interface ParsedPermissionRow {
  levelPath: string; // e.g. "مدیریت سیستم / کاربران"
  levelResourceCode: string; // e.g. "SYS-01"
  persianName: string;
  englishName: string;
  resourceNumber: string;
  description: string;
  isValid: boolean;
  errorMessage?: string;
}

export const PermissionExcelModal: React.FC<PermissionExcelModalProps> = ({
  isOpen,
  onClose,
  treeNodes,
  onImportComplete,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [parsedRows, setParsedRows] = useState<ParsedPermissionRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');

  if (!isOpen) return null;

  // ۱. دانلود فایل اکسل نمونه استاندارد
  const handleDownloadSample = () => {
    const sampleData = [
      {
        'مسیر_سطح_یا_ماژول': 'مدیریت سیستم و امنیت / کاربران و پرسنل',
        'کد_منبع_سطح': 'USR-01',
        'نام_فارسی_دسترسی': 'مشاهده فهرست کاربران',
        'نام_انگلیسی_دسترسی': 'ViewUserList',
        'شماره_منبع_دسترسی': '1001',
        'توضیحات': 'امکان مشاهده لیست کلیه کاربران و پرسنل فعال در سیستم',
      },
      {
        'مسیر_سطح_یا_ماژول': 'مدیریت سیستم و امنیت / کاربران و پرسنل',
        'کد_منبع_سطح': 'USR-01',
        'نام_فارسی_دسترسی': 'ویرایش و ثبت کاربر جدید',
        'نام_انگلیسی_دسترسی': 'ManageUser',
        'شماره_منبع_دسترسی': '1002',
        'توضیحات': 'دسترسی به فرم ایجاد و ویرایش مشخصات و رمز عبور کاربران',
      },
      {
        'مسیر_سطح_یا_ماژول': 'عملیات مالی و بازرگانی / فاکتورها',
        'کد_منبع_سطح': 'INV-01',
        'نام_فارسی_دسترسی': 'ثبت فاکتور فروش',
        'نام_انگلیسی_دسترسی': 'CreateSalesInvoice',
        'شماره_منبع_دسترسی': '2001',
        'توضیحات': 'امکان ایجاد و ثبت پیش‌فاکتور و فاکتور فروش کالا و خدمات',
      },
      {
        'مسیر_سطح_یا_ماژول': 'عملیات مالی و بازرگانی / فاکتورها',
        'کد_منبع_سطح': 'INV-01',
        'نام_فارسی_دسترسی': 'تایید و ابطال فاکتور',
        'نام_انگلیسی_دسترسی': 'ApproveInvoice',
        'شماره_منبع_دسترسی': '2002',
        'توضیحات': 'مجوز نهایی‌سازی، تایید حسابداری یا باطل نمودن فاکتورهای فروش',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    // تنظیم عرض ستون‌ها
    worksheet['!cols'] = [
      { wch: 38 },
      { wch: 15 },
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 55 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'دسترسی‌ها');
    XLSX.writeFile(workbook, 'Sample_Permissions_Template.xlsx');
    showToast('فایل نمونه اکسل با موفقیت دانلود شد.', 'success');
  };

  // ۲. دریافت خروجی کامل درختواره موجود به صورت فایل اکسل
  const handleExportCurrent = () => {
    const rows: Record<string, string>[] = [];

    const traverse = (node: PermissionTreeNode, parentPath: string) => {
      const currentPath = parentPath ? `${parentPath} / ${node.title}` : node.title;

      for (const p of node.permissions) {
        rows.push({
          'شناسه_سطح': String(node.nodeId),
          'مسیر_سطح_یا_ماژول': currentPath,
          'کد_منبع_سطح': node.resourceCode || '',
          'نام_فارسی_دسترسی': p.persianName,
          'نام_انگلیسی_دسترسی': p.englishName || '',
          'شماره_منبع_دسترسی': p.resourceNumber,
          'وضعیت': p.status === 3 ? 'تایید شده' : p.status === 2 ? 'قابل بررسی' : 'در انتظار',
          'قفل_شده': p.isLocked ? `توسط ${p.lockedByUserName || 'کاربر'}` : 'خیر',
          'توضیحات': p.description || '',
        });
      }

      for (const child of node.children) {
        traverse(child, currentPath);
      }
    };

    for (const root of treeNodes) {
      traverse(root, '');
    }

    if (rows.length === 0) {
      showToast('هیچ دسترسی برای خروجی اکسل یافت نشد.', 'warning');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 40 },
      { wch: 15 },
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 50 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'خروجی_دسترسی‌ها');
    XLSX.writeFile(workbook, `K-RPT_Permissions_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('خروجی کامل دسترسی‌ها با موفقیت ایجاد و دانلود شد.', 'success');
  };

  // ۳. خواندن و پارس فایل اکسل انتخاب‌شده
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        if (!data || data.length === 0) {
          showToast('فایل انتخابی فاقد سطر داده است.', 'error');
          return;
        }

        const parsed: ParsedPermissionRow[] = data.map((row) => {
          // استخراج فیلدها با پوشش نام‌های فارسی یا انگلیسی
          const levelPath = String(
            row['مسیر_سطح_یا_ماژول'] || row['مسیر_سطح'] || row['LevelPath'] || row['Path'] || ''
          ).trim();

          const levelResourceCode = String(
            row['کد_منبع_سطح'] || row['LevelCode'] || row['ResourceCode'] || ''
          ).trim();

          const persianName = String(
            row['نام_فارسی_دسترسی'] || row['نام_فارسی'] || row['PersianName'] || ''
          ).trim();

          const englishName = String(
            row['نام_انگلیسی_دسترسی'] || row['نام_انگلیسی'] || row['EnglishName'] || ''
          ).trim();

          const resourceNumber = String(
            row['شماره_منبع_دسترسی'] || row['شماره_منبع'] || row['ResourceNumber'] || ''
          ).trim();

          const description = String(row['توضیحات'] || row['Description'] || '').trim();

          let isValid = true;
          let errorMessage = '';

          if (!levelPath) {
            isValid = false;
            errorMessage = 'مسیر سطح الزامی است.';
          } else if (!persianName) {
            isValid = false;
            errorMessage = 'نام فارسی الزامی است.';
          } else if (!resourceNumber) {
            isValid = false;
            errorMessage = 'شماره منبع الزامی است.';
          }

          return {
            levelPath,
            levelResourceCode,
            persianName,
            englishName,
            resourceNumber,
            description,
            isValid,
            errorMessage,
          };
        });

        setParsedRows(parsed);
        showToast(`${parsed.length} سطر از فایل اکسل با موفقیت خوانده شد.`, 'info');
      } catch (err) {
        console.error(err);
        showToast('خطا در خواندن فایل اکسل. لطفاً از قالب استاندارد استفاده فرمایید.', 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  // ۴. درج خودکار ساختار درختی و دسترسی‌ها در سیستم
  const handleCommitImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast('سطر معتبری برای درون‌ریزی وجود ندارد.', 'error');
      return;
    }

    setIsProcessing(true);
    setProgressText('در حال آماده‌سازی ساختار درختی و دسترسی‌ها...');

    try {
      // کش نگه‌داری گره‌های سطح بر اساس مسیر
      // بارگذاری گره‌های موجود جهت اتصال یا ایجاد جدید
      const currentTree = await permissionTreeApi.getTree();
      const nodePathMap = new Map<string, number>();

      const cacheExistingNodes = (nodes: PermissionTreeNode[], parentPath: string) => {
        for (const n of nodes) {
          const currentPath = parentPath ? `${parentPath} / ${n.title}` : n.title;
          nodePathMap.set(currentPath.toLowerCase().trim(), n.nodeId);
          if (n.children && n.children.length > 0) {
            cacheExistingNodes(n.children, currentPath);
          }
        }
      };
      cacheExistingNodes(currentTree, '');

      // تابع کمکی برای یافتن یا ساخت سلسله‌مراتبی گره‌ها
      const getOrCreateNodeId = async (
        fullPath: string,
        levelResourceCode?: string
      ): Promise<number> => {
        const pathSegments = fullPath
          .split(/[\/\\]/)
          .map((s) => s.trim())
          .filter(Boolean);

        let parentId: number | null = null;
        let cumulativePath = '';

        for (let i = 0; i < pathSegments.length; i++) {
          const segment = pathSegments[i];
          cumulativePath = cumulativePath ? `${cumulativePath} / ${segment}` : segment;
          const key = cumulativePath.toLowerCase().trim();

          if (nodePathMap.has(key)) {
            parentId = nodePathMap.get(key)!;
          } else {
            // ساخت گره جدید
            const isLast = i === pathSegments.length - 1;
            const resCode = isLast && levelResourceCode ? levelResourceCode : undefined;

            const newNode = await permissionTreeApi.createNode({
              parentNodeId: parentId,
              title: segment,
              resourceCode: resCode,
              sortOrder: 0,
            });

            nodePathMap.set(key, newNode.nodeId);
            parentId = newNode.nodeId;
          }
        }

        return parentId!;
      };

      // ایجاد دسترسی‌ها
      let createdCount = 0;
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setProgressText(`در حال ثبت دسترسی ${i + 1} از ${validRows.length}: ${row.persianName}...`);

        const nodeId = await getOrCreateNodeId(row.levelPath, row.levelResourceCode);

        await permissionsApi.create({
          nodeId,
          persianName: row.persianName,
          englishName: row.englishName,
          resourceNumber: row.resourceNumber,
          description: row.description || undefined,
        });

        createdCount++;
      }

      showToast(`درون‌ریزی با موفقیت پایان یافت. تعداد ${createdCount} دسترسی ایجاد شد.`, 'success');
      onImportComplete();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'خطای نامشخص در ثبت اطلاعات';
      showToast(`خطا در ثبت اطلاعات: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* هدر مدال */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">درون‌ریزی و برون‌بری اکسل دسترسی‌ها</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ورود دسته‌جمعی ساختار درختی و عناوین دسترسی یا دریافت خروجی با قالب استاندارد اکسل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* تب‌های درون‌ریزی و برون‌بری */}
        <div className="px-6 pt-3 border-b border-slate-200 flex gap-2 bg-white">
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>درون‌ریزی از فایل اکسل (Import)</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>خروجی گرفتن به اکسل (Export)</span>
          </button>
        </div>

        {/* بدنه مدال */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* بخش راهنما و دانلود فایل نمونه */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">الگوی استاندارد درون‌ریزی ساختار درختی</h4>
                    <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">
                      برای جلوگیری از خطاهای ستونی و ساخت صحیح سطوح درختی، پیشنهاد می‌شود فایل نمونه استاندارد را دانلود
                      و اطلاعات خود را در آن پر کنید. در ستون «مسیر_سطح_یا_ماژول»، سطوح را با علامت اسلش ( / ) تفکیک نمایید.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadSample}
                  className="shrink-0 mr-4 px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود فایل نمونه اکسل</span>
                </button>
              </div>

              {/* باکس آپلود فایل */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50/50 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {fileName ? `فایل انتخاب‌شده: ${fileName}` : 'فایل اکسل (.xlsx, .xls, .csv) را اینجا بکشید یا کلیک کنید'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  پشتیبانی کامل از انکودینگ فارسی UTF-8 و ساختار درختی چندسطحی
                </p>
              </div>

              {/* پیش‌نمایش سطرهای خوانده‌شده */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">پیش‌نمایش داده‌های خوانده‌شده:</span>
                      <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {parsedRows.length} سطر ({parsedRows.filter((r) => r.isValid).length} معتبر)
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">ردیف</th>
                          <th className="p-2.5">مسیر سطح / ماژول</th>
                          <th className="p-2.5">کد سطح</th>
                          <th className="p-2.5">نام فارسی</th>
                          <th className="p-2.5">نام انگلیسی</th>
                          <th className="p-2.5">شماره منبع</th>
                          <th className="p-2.5">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((r, idx) => (
                          <tr key={idx} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/70 text-rose-800'}>
                            <td className="p-2.5 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-medium">{r.levelPath}</td>
                            <td className="p-2.5 font-mono text-slate-500">{r.levelResourceCode || '-'}</td>
                            <td className="p-2.5 font-bold">{r.persianName}</td>
                            <td className="p-2.5 font-mono">{r.englishName}</td>
                            <td className="p-2.5 font-mono font-bold text-blue-600">{r.resourceNumber}</td>
                            <td className="p-2.5">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>معتبر</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-rose-600 font-bold"
                                  title={r.errorMessage}
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>{r.errorMessage}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">خروجی کامل ساختار درختی و دسترسی‌های سامانه</h4>
                <p className="text-xs text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
                  با کلیک روی دکمه زیر، کلیه سطوح درختواره دسترسی‌ها، کد‌های منبع، عناوین فارسی و انگلیسی، وضعیت تایید
                  و وضعیت قفل‌ها در قالب فایل اکسل چندستونه دانلود خواهد شد.
                </p>
                <button
                  onClick={handleExportCurrent}
                  className="mt-6 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 mx-auto shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>دریافت خروجی کامل اکسل (.xlsx)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* فوتر مدال */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isProcessing && (
              <span className="flex items-center gap-2 text-emerald-700 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progressText}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              انصراف
            </button>
            {activeTab === 'import' && (
              <button
                onClick={handleCommitImport}
                disabled={isProcessing || parsedRows.filter((r) => r.isValid).length === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 transition-all"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                <span>ثبت و اعمال در ساختار دسترسی‌ها ({parsedRows.filter((r) => r.isValid).length} مورد)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
