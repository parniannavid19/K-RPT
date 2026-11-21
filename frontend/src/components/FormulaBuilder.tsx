import React, { useRef } from 'react';
import { Calculator, RotateCcw, Sparkles } from 'lucide-react';

interface FormulaBuilderProps {
  formula: string;
  onChange: (newFormula: string) => void;
  availableFields: { fieldId: number; displayName: string; technicalName?: string }[];
  placeholder?: string;
  label?: string;
}

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  formula,
  onChange,
  availableFields,
  placeholder = 'فرمول محاسباتی را با استفاده از عملگرها و فیلدها تعریف کنید...',
  label = 'فرمول محاسباتی',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (textToInsert: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(formula ? `${formula} ${textToInsert}` : textToInsert);
      return;
    }

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = formula.substring(0, start);
    const after = formula.substring(end);

    const spaceBefore = before.length > 0 && !before.endsWith(' ') && !textToInsert.startsWith(' ') && textToInsert !== ')' ? ' ' : '';
    const spaceAfter = after.length > 0 && !after.startsWith(' ') && !textToInsert.endsWith(' ') && textToInsert !== '(' ? ' ' : '';

    const newText = before + spaceBefore + textToInsert + spaceAfter + after;
    onChange(newText);

    // فوکوس مجدد روی textarea
    setTimeout(() => {
      el.focus();
      const newPos = start + spaceBefore.length + textToInsert.length;
      el.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const operators = [
    { label: '+', title: 'جمع (+)', val: '+' },
    { label: '−', title: 'تفریق (−)', val: '-' },
    { label: '×', title: 'ضرب (×)', val: '*' },
    { label: '÷', title: 'تقسیم (÷)', val: '/' },
    { label: '(', title: 'پرانتز باز', val: '(' },
    { label: ')', title: 'پرانتز بسته', val: ')' },
    { label: '%', title: 'درصد', val: '%' },
    { label: '^', title: 'توان', val: '^' },
    { label: '=', title: 'مساوی', val: '=' },
    { label: '≠', title: 'نامساوی', val: '<>' },
    { label: '>', title: 'بزرگتر از', val: '>' },
    { label: '<', title: 'کوچکتر از', val: '<' },
  ];

  const functions = [
    { label: 'SUM', title: 'مجموع مقادیر', val: 'SUM()' },
    { label: 'ROUND', title: 'گرد کردن با ۲ رقم اعشار', val: 'ROUND(, 2)' },
    { label: 'AVG', title: 'میانگین', val: 'AVG()' },
    { label: 'MAX', title: 'بیشترین مقدار', val: 'MAX()' },
    { label: 'MIN', title: 'کمترین مقدار', val: 'MIN()' },
    { label: 'IF', title: 'شرط منطقی', val: 'IF(شرط, حالت_درست, حالت_نادرست)' },
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-indigo-600" />
          <span>{label}</span>
        </label>
        {formula && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>پاک کردن</span>
          </button>
        )}
      </div>

      {/* عملگرهای ریاضی و توابع محاسباتی */}
      <div className="space-y-2 pt-1 border-t border-slate-200/60">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500 ml-1.5">عملگرها:</span>
          {operators.map((op) => (
            <button
              key={op.label}
              type="button"
              onClick={() => insertText(op.val)}
              title={op.title}
              className="w-7 h-7 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-2xs transition-all active:scale-95"
            >
              {op.label}
            </button>
          ))}

          <span className="text-[10px] font-bold text-slate-500 mr-2 ml-1.5">توابع:</span>
          {functions.map((fn) => (
            <button
              key={fn.label}
              type="button"
              onClick={() => insertText(fn.val)}
              title={fn.title}
              className="px-2 h-7 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-indigo-700 shadow-2xs transition-all active:scale-95"
            >
              {fn.label}
            </button>
          ))}
        </div>

        {/* فیلدهای در دسترس جهت کلیک و درج در فرمول */}
        {availableFields.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-500 ml-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              فیلدها:
            </span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {availableFields.map((f) => (
                <button
                  key={f.fieldId}
                  type="button"
                  onClick={() => insertText(`@${f.displayName.replace(/\s+/g, '_')}`)}
                  title={`افزودن ${f.displayName} به فرمول`}
                  className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all active:scale-95"
                >
                  @{f.displayName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ناحیه تایپ فرمول */}
      <textarea
        ref={textareaRef}
        value={formula}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full text-xs font-mono text-slate-900 border border-slate-300 rounded-xl p-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-inner"
        dir="ltr"
      />
    </div>
  );
};
