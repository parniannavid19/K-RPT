import React, { useEffect, useMemo, useState } from 'react';
import type { TreeNode, User } from '../types';
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Edit3,
  FilePlus,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { treeApi } from '../api/client';
import { useToast } from './Toast';

// تابع هوشمند محاسبه کد یکتای بعدی (یک واحد بیشتر از آخرین کد ثبت‌شده در سیستم)
export const computeNextReportCode = (nodesList: TreeNode[]): string => {
  const codes: string[] = [];

  const traverse = (items: TreeNode[]) => {
    for (const item of items) {
      if (item.reportCode && item.reportCode.trim()) {
        codes.push(item.reportCode.trim());
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };

  traverse(nodesList);

  if (codes.length === 0) return '1';

  // ۱. اولویت اول: کدهای کاملاً عددی (مانند ۱، ۲، ۱۲، ...)
  const pureNumbers = codes
    .filter((c) => /^\d+$/.test(c))
    .map((c) => parseInt(c, 10))
    .filter((n) => !isNaN(n));

  if (pureNumbers.length > 0) {
    const maxVal = Math.max(...pureNumbers);
    return String(maxVal + 1);
  }

  // ۲. اولویت دوم: کدهای ترکیبی با پیشوند متنی (مانند FIN-RPT-205)
  let maxPrefix = '';
  let maxSuffixNum = -1;
  let padLength = 0;

  for (const c of codes) {
    const match = c.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxSuffixNum) {
        maxSuffixNum = num;
        maxPrefix = prefix;
        padLength = numStr.length;
      }
    }
  }

  if (maxSuffixNum >= 0) {
    const nextNum = maxSuffixNum + 1;
    const formattedNum = String(nextNum).padStart(padLength, '0');
    return `${maxPrefix}${formattedNum}`;
  }

  return '1';
};

interface TreeViewProps {
  nodes: TreeNode[];
  selectedReportId: number | null;
  onSelectReport: (reportId: number) => void;
  isLoading: boolean;
  currentUser: User | null;
  onTreeChange: () => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  selectedReportId,
  onSelectReport,
  isLoading,
  currentUser,
  onTreeChange,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  type StatusFilterType = 3 | 2 | 1 | 'locked' | null;
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>(null);
  const [openNodes, setOpenNodes] = useState<Record<number, boolean>>({ 3: true });
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemType, setItemType] = useState<1 | 2>(1); // 1: ماژول, 2: گزارش
  const [parentId, setParentId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [reportCode, setReportCode] = useState('');
  const [desc, setDesc] = useState('');
  const [formula, setFormula] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // وضعیت‌های مربوط به ویرایش و جابه‌جایی ماژول یا گزارش
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNode, setEditingNode] = useState<TreeNode | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editReportCode, setEditReportCode] = useState('');
  const [editParentId, setEditParentId] = useState<number | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // وضعیت‌های مربوط به سواپ کردن گزارش
  const [editModalTab, setEditModalTab] = useState<'details' | 'swap'>('details');
  const [swapTargetNodeId, setSwapTargetNodeId] = useState<number | ''>('');
  const [swapCodes, setSwapCodes] = useState(true);
  const [swapPositions, setSwapPositions] = useState(true);
  const [swapSubmitting, setSwapSubmitting] = useState(false);

  // بستن پنجره‌های مودال ایجاد و ویرایش/سواپ با کلید Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (showEditModal) setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, showEditModal]);

  // عرض سایدبار درختی و قابلیت تغییر اندازه پویا برای مشاهده کامل عناوین
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('k_rpt_tree_width');
    return saved ? Math.max(340, Math.min(750, parseInt(saved, 10))) : 430;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // در ساختار RTL، مرز سایدبار در سمت چپ آن واقع شده است
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('k_rpt_tree_width', sidebarWidth.toString());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  const togglePresetWidth = () => {
    setSidebarWidth((prev) => {
      const next = prev < 450 ? 580 : 380;
      localStorage.setItem('k_rpt_tree_width', next.toString());
      return next;
    });
  };

  const canManageTree = currentUser && (currentUser.roleId === 2 || currentUser.roleId === 3);

  const handleOpenAddModal = async (defaultType: 1 | 2 = 1) => {
    setItemType(defaultType);
    setTitle('');
    setDesc('');
    setFormula('');
    if (defaultType === 2) {
      const clientCode = computeNextReportCode(nodes);
      setReportCode(clientCode);
      try {
        const serverCode = await treeApi.getNextReportCode();
        if (serverCode) setReportCode(serverCode);
      } catch {}
    } else {
      setReportCode('');
    }
    setShowAddModal(true);
  };

  const handleSwitchToReportTab = async () => {
    setItemType(2);
    if (!reportCode.trim()) {
      const clientCode = computeNextReportCode(nodes);
      setReportCode(clientCode);
      try {
        const serverCode = await treeApi.getNextReportCode();
        if (serverCode) setReportCode(serverCode);
      } catch {}
    }
  };

  const toggleNode = (nodeId: number) => {
    setOpenNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const filterTree = (list: TreeNode[], term: string, sFilter: StatusFilterType): TreeNode[] => {
    const hasTerm = Boolean(term.trim());
    const hasStatus = sFilter !== null;

    if (!hasTerm && !hasStatus) return list;

    const lowerTerm = term.toLowerCase().trim();

    return list
      .map((node) => {
        const textMatches = !hasTerm ||
          node.title.toLowerCase().includes(lowerTerm) ||
          (Boolean(node.reportCode) && node.reportCode!.toLowerCase().includes(lowerTerm));

        let statusMatches = true;
        if (hasStatus) {
          if (node.nodeType === 2) {
            if (sFilter === 'locked') {
              statusMatches = Boolean(node.isLocked);
            } else {
              statusMatches = node.status === sFilter;
            }
          } else {
            statusMatches = false;
          }
        }

        const isLeafReport = node.nodeType === 2;
        const matchesThis = isLeafReport ? (textMatches && statusMatches) : (textMatches && !hasStatus);

        const children = node.children ? filterTree(node.children, term, sFilter) : [];

        if (matchesThis || children.length > 0) {
          return { ...node, children };
        }
        return null;
      })
      .filter(Boolean) as TreeNode[];
  };

  const filteredNodes = useMemo(() => {
    return filterTree(nodes, searchTerm, statusFilter);
  }, [nodes, searchTerm, statusFilter]);

  // شمارش تعداد گزارش‌های منطبق با جستجو یا فیلتر وضعیت
  const matchingCount = useMemo(() => {
    if (!searchTerm.trim() && statusFilter === null) return null;
    const countReports = (list: TreeNode[]): number => {
      let count = 0;
      for (const item of list) {
        if (item.nodeType === 2 && item.reportId) count++;
        if (item.children && item.children.length > 0) count += countReports(item.children);
      }
      return count;
    };
    return countReports(filteredNodes);
  }, [filteredNodes, searchTerm, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (itemType === 2 && !reportCode.trim()) {
      alert('کد گزارش الزامی است.');
      return;
    }

    setSubmitting(true);
    try {
      await treeApi.createNode({
        parentNodeId: parentId,
        title: title.trim(),
        nodeType: itemType,
        reportCode: itemType === 2 ? reportCode.trim() : undefined,
        functionalDescription: itemType === 2 ? desc.trim() : undefined,
        calculationFormula: itemType === 2 ? formula.trim() : undefined,
      });

      setShowAddModal(false);
      setTitle('');
      setReportCode('');
      setDesc('');
      setFormula('');
      onTreeChange();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در افزودن آیتم به درختواره');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNode = async (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const typeTitle = node.nodeType === 1 ? 'ماژول' : 'گزارش';
    if (!window.confirm(`آیا از حذف ${typeTitle} «${node.title}» اطمینان دارید؟`)) return;

    try {
      await treeApi.deleteNode(node.nodeId);
      onTreeChange();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در حذف آیتم');
    }
  };

  // شروع فرآیند ویرایش و جابه‌جایی نود
  const handleStartEdit = (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNode(node);
    setEditTitle(node.title);
    setEditReportCode(node.reportCode || '');
    setEditParentId(node.parentNodeId ?? null);
    setEditModalTab('details');
    setSwapTargetNodeId('');
    setSwapCodes(true);
    setSwapPositions(true);
    setShowEditModal(true);
  };

  // ذخیره ویرایش و جابه‌جایی ماژول یا گزارش
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode || !editTitle.trim()) return;

    setEditSubmitting(true);
    try {
      await treeApi.updateNode(editingNode.nodeId, {
        title: editTitle.trim(),
        reportCode: editingNode.nodeType === 2 ? editReportCode.trim() : undefined,
        parentNodeId: editParentId,
      });
      setShowEditModal(false);
      setEditingNode(null);
      onTreeChange();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در ذخیره ویرایش و جابه‌جایی');
    } finally {
      setEditSubmitting(false);
    }
  };

  // انجام عملیات سواپ دو گزارش با یکدیگر
  const handleExecuteSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode || !swapTargetNodeId) return;

    setSwapSubmitting(true);
    try {
      await treeApi.swapNodes({
        sourceNodeId: editingNode.nodeId,
        targetNodeId: Number(swapTargetNodeId),
        swapCodes,
        swapPositions,
      });
      setShowEditModal(false);
      setEditingNode(null);
      setSwapTargetNodeId('');
      onTreeChange();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در انجام عملیات سواپ و جابه‌جایی');
    } finally {
      setSwapSubmitting(false);
    }
  };

  // دریافت لیست ماژول‌های پوشه‌ای برای دراپ‌داون والد
  const getAllFolders = (list: TreeNode[]): { id: number; title: string }[] => {
    let result: { id: number; title: string }[] = [];
    for (const n of list) {
      if (n.nodeType === 1) {
        result.push({ id: n.nodeId, title: n.title });
        if (n.children) result = result.concat(getAllFolders(n.children));
      }
    }
    return result;
  };
  const availableFolders = getAllFolders(nodes);

  // دریافت لیست کلیه گزارش‌ها به همراه والد جهت استفاده در قابلیت سواپ
  const getAllReports = (list: TreeNode[]): { nodeId: number; reportCode: string; title: string; parentTitle: string }[] => {
    const result: { nodeId: number; reportCode: string; title: string; parentTitle: string }[] = [];
    const traverse = (items: TreeNode[], pTitle = 'ریشه اصلی') => {
      for (const item of items) {
        if (item.nodeType === 2 && item.reportCode) {
          result.push({
            nodeId: item.nodeId,
            reportCode: item.reportCode,
            title: item.title,
            parentTitle: pTitle,
          });
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children, item.title);
        }
      }
    };
    traverse(list);
    return result.sort((a, b) => {
      const na = parseInt(a.reportCode, 10);
      const nb = parseInt(b.reportCode, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.reportCode.localeCompare(b.reportCode);
    });
  };
  const availableReportsForSwap = getAllReports(nodes).filter((r) => r.nodeId !== editingNode?.nodeId);
  const selectedTargetReport = availableReportsForSwap.find((r) => r.nodeId === swapTargetNodeId);

  // پالایش لیست ماژول‌های مقصد برای جلوگیری از ایجاد دور (عدم امکان انتخاب خود یا زیرمجموعه‌ها به عنوان والد)
  const getValidEditParents = (node: TreeNode): { id: number; title: string }[] => {
    const invalidIds = new Set<number>([node.nodeId]);
    const collectDescendants = (n: TreeNode) => {
      if (n.children) {
        for (const c of n.children) {
          invalidIds.add(c.nodeId);
          collectDescendants(c);
        }
      }
    };
    collectDescendants(node);
    return availableFolders.filter((f) => !invalidIds.has(f.id));
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isFolder = node.nodeType === 1;
    const isOpen = openNodes[node.nodeId] ?? (searchTerm.length > 0 || statusFilter !== null);
    const isSelected = !isFolder && node.reportId === selectedReportId;

    return (
      <div key={node.nodeId} className="select-none text-xs group">
        <div
          onClick={() => {
            if (isFolder) {
              toggleNode(node.nodeId);
            } else if (node.reportId) {
              onSelectReport(node.reportId);
            }
          }}
          style={{ paddingRight: `${depth * 10 + 8}px` }}
          className={`flex items-start justify-between py-2 px-2.5 my-0.5 rounded-xl cursor-pointer transition-all ${
            isSelected
              ? 'bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-600 shadow-2xs'
              : 'hover:bg-slate-100/80 text-slate-700'
          }`}
        >
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            {isFolder ? (
              <span className="text-slate-400 mt-0.5 shrink-0">
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            {isFolder ? (
              isOpen ? (
                <FolderOpen className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )
            ) : (
              <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            )}

            {!isFolder && (
              <div className="flex items-center gap-1 shrink-0 self-start mt-0.5">
                {node.isLocked && (
                  <span title={`در حال بررسی توسط ${node.lockedByUserName}`} className="text-rose-600 shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}
                {node.status === 3 && (
                  <span title="بررسی و تایید شده" className="text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
                {node.status === 2 && (
                  <span title="قابل بررسی" className="text-blue-600 shrink-0">
                    <Edit3 className="w-3.5 h-3.5" />
                  </span>
                )}
                {node.status === 1 && (
                  <span title="در انتظار بررسی" className="text-amber-500 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                )}
                {node.reportCode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(node.reportCode!);
                      showToast(`کد گزارش «${node.reportCode}» در کلیپ‌بورد کپی شد.`, 'info');
                    }}
                    title={`کپی کد گزارش: ${node.reportCode}`}
                    className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 border border-slate-200/90 px-1.5 py-0.2 rounded shrink-0 transition-colors cursor-pointer"
                  >
                    {node.reportCode}
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <span
                className="text-xs leading-relaxed break-words font-medium text-slate-800"
                title={node.title}
              >
                {node.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 mr-1 mt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(node.title);
                showToast(`نام «${node.title}» در کلیپ‌بورد کپی شد.`, 'info');
              }}
              title="کپی نام فارسی"
              className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {canManageTree && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => handleStartEdit(node, e)}
                  title="ویرایش، جابه‌جایی یا سواپ"
                  className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-200/60 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteNode(node, e)}
                  title="حذف این آیتم"
                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {isFolder && isOpen && node.children && node.children.length > 0 && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className={`relative bg-white border-l border-slate-200 flex flex-col h-full shrink-0 transition-[width] duration-75 select-none ${
        isResizing ? 'cursor-col-resize' : ''
      }`}
    >
      {/* دستگیره تعاملی تغییر عرض سایدبار (Drag Resizer) در مرز چپ */}
      <div
        onMouseDown={() => setIsResizing(true)}
        title="برای تغییر عرض سایدبار به چپ یا راست بکشید"
        className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors z-20 ${
          isResizing ? 'bg-blue-600 w-1' : 'bg-transparent hover:bg-blue-400'
        }`}
      />

      {/* هدر پنل درخت + دکمه افزودن و تغییر عرض */}
      <div className="p-3 border-b border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">درخت ماژول‌ها و گزارش‌ها</span>
            <button
              onClick={togglePresetWidth}
              title={sidebarWidth < 450 ? 'تغییر به نمای عریض' : 'تغییر به نمای استاندارد'}
              className="text-[10px] text-slate-500 hover:text-blue-600 hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors"
            >
              {sidebarWidth < 450 ? 'نمای عریض' : 'استاندارد'}
            </button>
          </div>
          {canManageTree && (
            <button
              onClick={() => handleOpenAddModal(1)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>افزودن</span>
            </button>
          )}
        </div>

        {/* جست‌وجوی سریع با نمایش تعداد نتایج */}
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جست‌وجوی کد یا نام گزارش..."
              className="w-full text-xs pr-8 pl-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title="پاک‌کردن جستجو"
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          {matchingCount !== null && (
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-600 bg-blue-50/60 p-1 rounded-md border border-blue-100">
              <span>گزارش‌های منطبق:</span>
              <span className="font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.2 rounded-full shadow-2xs">
                {matchingCount} گزارش
              </span>
            </div>
          )}
        </div>
      </div>

      {/* لیست درخت */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-xs">
            در حال بارگذاری ساختار درختی...
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs space-y-2">
            <p>گزارشی با این مشخصات یافت نشد.</p>
            {(statusFilter !== null || Boolean(searchTerm.trim())) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter(null);
                }}
                className="text-[11px] text-blue-600 hover:underline font-bold"
              >
                پاک‌کردن فیلترها و نمایش همه
              </button>
            )}
          </div>
        ) : (
          filteredNodes.map((node) => renderNode(node))
        )}
      </div>

      {/* راهنمای وضعیت پایین پنل (چسبیده به انتهای صفحه با امکان فیلتر و کلیر) */}
      <div className="mt-auto border-t border-slate-200 bg-slate-50/95 shrink-0 select-none">
        {/* نوار کوچک اطلاع‌رسانی فیلتر فعال به همراه دکمه کلیر کردن برای نمایش همه */}
        {statusFilter !== null && (
          <div className="flex items-center justify-between px-3 py-1 bg-indigo-50 border-b border-indigo-100 text-[10px] text-indigo-900 animate-in fade-in duration-150">
            <span className="flex items-center gap-1 font-medium">
              <span>فیلتر:</span>
              <span className="font-bold">
                {statusFilter === 3 && 'تایید شده'}
                {statusFilter === 2 && 'قابل بررسی'}
                {statusFilter === 1 && 'در انتظار'}
                {statusFilter === 'locked' && 'قفل شده'}
              </span>
              <span className="text-slate-500">({matchingCount ?? 0} مورد)</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className="text-indigo-700 hover:text-rose-600 font-bold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white transition-colors cursor-pointer"
              title="پاک‌کردن فیلتر و نمایش همه گزارش‌ها"
            >
              <X className="w-3 h-3 text-rose-500" />
              <span>نمایش همه</span>
            </button>
          </div>
        )}

        <div className="p-2 text-[10px] flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 3 ? null : 3)}
            title="فیلتر گزارش‌های تایید شده (کلیک مجدد: نمایش همه)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
              statusFilter === 3
                ? 'bg-emerald-100 text-emerald-800 font-bold border-emerald-300 shadow-2xs'
                : 'border-transparent text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>تایید شده</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 2 ? null : 2)}
            title="فیلتر گزارش‌های قابل بررسی (کلیک مجدد: نمایش همه)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
              statusFilter === 2
                ? 'bg-blue-100 text-blue-800 font-bold border-blue-300 shadow-2xs'
                : 'border-transparent text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Edit3 className="w-3 h-3 text-blue-600" />
            <span>قابل بررسی</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 1 ? null : 1)}
            title="فیلتر گزارش‌های در انتظار (کلیک مجدد: نمایش همه)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
              statusFilter === 1
                ? 'bg-amber-100 text-amber-800 font-bold border-amber-300 shadow-2xs'
                : 'border-transparent text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-500" />
            <span>در انتظار</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'locked' ? null : 'locked')}
            title="فیلتر گزارش‌های قفل شده (کلیک مجدد: نمایش همه)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
              statusFilter === 'locked'
                ? 'bg-rose-100 text-rose-800 font-bold border-rose-300 shadow-2xs'
                : 'border-transparent text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Lock className="w-3 h-3 text-rose-500" />
            <span>قفل</span>
          </button>
        </div>
      </div>

      {/* مدال افزودن ماژول / گزارش جدید به درخت */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm mb-4">افزودن آیتم جدید به درختواره سیستم</h3>

            {/* انتخاب نوع آیتم */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setItemType(1)}
                className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  itemType === 1 ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span>ماژول (پوشه)</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToReportTab}
                className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  itemType === 2 ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                <FilePlus className="w-4 h-4 text-blue-500" />
                <span>گزارش جدید</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ماژول والد</label>
                <select
                  value={parentId ?? ''}
                  onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">شاخه ریشه اصلی (بدون والد)</option>
                  {availableFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {itemType === 1 ? 'عنوان ماژول / سیستم' : 'عنوان گزارش'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={itemType === 1 ? 'مثال: سیستم تدارکات و لجستیک' : 'مثال: گزارش صورت مغایرت بانکی'}
                  required
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              {itemType === 2 && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">کد یکتای گزارش</label>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>تولید خودکار بر اساس آخرین کد (+۱)</span>
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={reportCode}
                        onChange={(e) => setReportCode(e.target.value)}
                        placeholder="مثال: FIN-RPT-205"
                        required
                        className="w-full text-xs border border-slate-300 rounded-lg p-2.5 pl-9 font-mono font-bold text-slate-900 bg-emerald-50/20 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const clientCode = computeNextReportCode(nodes);
                          setReportCode(clientCode);
                          try {
                            const serverCode = await treeApi.getNextReportCode();
                            if (serverCode) setReportCode(serverCode);
                          } catch {}
                        }}
                        title="محاسبه مجدد کد بعدی"
                        className="absolute left-2.5 top-2.5 text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">توضیحات کاربردی (اختیاری)</label>
                    <textarea
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="سناریوی استفاده و هدف گزارش..."
                      rows={2}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {submitting ? 'در حال ثبت...' : 'افزودن به درخت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال ویرایش و جابه‌جایی ماژول یا گزارش */}
      {showEditModal && editingNode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-blue-600" />
                <span>{editingNode.nodeType === 1 ? 'ویرایش و جابه‌جایی ماژول' : 'مدیریت، جابه‌جایی و سواپ گزارش'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* تب‌های ویرایش برای گزارش‌ها */}
            {editingNode.nodeType === 2 && (
              <div className="flex border-b border-slate-200 mb-4 text-xs font-semibold gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalTab('details')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    editModalTab === 'details'
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>مشخصات و تغییر والد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalTab('swap')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    editModalTab === 'swap'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>سواپ و جابه‌جایی متقابل با گزارش دیگر</span>
                </button>
              </div>
            )}

            {editModalTab === 'swap' && editingNode.nodeType === 2 ? (
              /* فرم سواپ و جابه‌جایی متقابل با گزارش دیگر */
              <form onSubmit={handleExecuteSwap} className="space-y-4">
                <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
                  با استفاده از قابلیت سواپ، می‌توانید مشخص کنید این گزارش دقیقاً با کدام گزارش دیگر جابه‌جا و تعویض شود.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    گزارش مقصد جهت سواپ و جابه‌جایی:
                  </label>
                  <select
                    value={swapTargetNodeId}
                    onChange={(e) => setSwapTargetNodeId(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- یک گزارش را برای سواپ انتخاب کنید --</option>
                    {availableReportsForSwap.map((r) => (
                      <option key={r.nodeId} value={r.nodeId}>
                        کد {r.reportCode} - {r.title} ({r.parentTitle})
                      </option>
                    ))}
                  </select>
                </div>

                {swapTargetNodeId && selectedTargetReport && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <div className="text-[11px] font-bold text-slate-700 text-center">
                      پیش‌نمایش جابه‌جایی متقابل (Swap):
                    </div>
                    <div className="grid grid-cols-5 items-center gap-2 text-xs">
                      <div className="col-span-2 bg-white border border-blue-200 rounded-xl p-2.5 text-center shadow-2xs">
                        <span className="text-[10px] text-blue-600 font-bold block mb-0.5">گزارش مبدأ (فعلی)</span>
                        <span className="font-mono font-bold text-slate-800 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] border border-blue-100 inline-block">
                          کد {editingNode.reportCode}
                        </span>
                        <p className="text-[11px] font-semibold text-slate-800 mt-1 line-clamp-2" title={editingNode.title}>
                          {editingNode.title}
                        </p>
                      </div>

                      <div className="col-span-1 flex flex-col items-center justify-center text-indigo-600 font-bold">
                        <ArrowLeftRight className="w-5 h-5 animate-pulse" />
                      </div>

                      <div className="col-span-2 bg-white border border-indigo-200 rounded-xl p-2.5 text-center shadow-2xs">
                        <span className="text-[10px] text-indigo-600 font-bold block mb-0.5">گزارش انتخابی (مقصد)</span>
                        <span className="font-mono font-bold text-slate-800 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100 inline-block">
                          کد {selectedTargetReport.reportCode}
                        </span>
                        <p className="text-[11px] font-semibold text-slate-800 mt-1 line-clamp-2" title={selectedTargetReport.title}>
                          {selectedTargetReport.title}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={swapCodes}
                          onChange={(e) => setSwapCodes(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className="font-medium">تعویض شماره کد گزارش‌ها (ReportCode)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={swapPositions}
                          onChange={(e) => setSwapPositions(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className="font-medium">تعویض جایگاه شاخه و ماژول والد (Parent Module)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={swapSubmitting || !swapTargetNodeId || (!swapCodes && !swapPositions)}
                    className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>{swapSubmitting ? 'در حال سواپ...' : 'انجام عملیات سواپ و جابه‌جایی'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* فرم ویرایش مشخصات و ماژول والد */
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingNode.nodeType === 1 ? 'عنوان ماژول / سیستم' : 'عنوان گزارش'}
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {editingNode.nodeType === 2 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">کد یکتای گزارش</label>
                    <input
                      type="text"
                      value={editReportCode}
                      onChange={(e) => setEditReportCode(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* انتخاب والد مقصد برای جابه‌جایی ماژول یا گزارش */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">ماژول والد (موقعیت و شاخه در درخت)</label>
                    <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-full font-bold">
                      انتقال و جابه‌جایی شاخه
                    </span>
                  </div>
                  <select
                    value={editParentId ?? ''}
                    onChange={(e) => setEditParentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">شاخه ریشه اصلی (بدون والد)</option>
                    {getValidEditParents(editingNode).map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    با تغییر ماژول والد، این آیتم به ماژول جدید منتقل شده و بر اساس شماره گزارش در جایگاه دقیق عددی قرار می‌گیرد.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    {editSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات و جابه‌جایی'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
