import React, { useMemo, useState } from 'react';
import type { PermissionItem, PermissionTreeNode, User } from '../types';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Edit3,
  FileSpreadsheet,
  Folder,
  FolderInput,
  FolderMinus,
  FolderOpen,
  FolderPlus,
  KeyRound,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { permissionTreeApi, permissionsApi } from '../api/client';
import { useToast } from './Toast';
import { PermissionExcelModal } from './PermissionExcelModal';

interface PermissionTreeViewProps {
  nodes: PermissionTreeNode[];
  selectedPermissionId: number | null;
  onSelectPermission: (id: number) => void;
  isLoading: boolean;
  currentUser: User | null;
  onTreeChange: () => void;
}

export const PermissionTreeView: React.FC<PermissionTreeViewProps> = ({
  nodes,
  selectedPermissionId,
  onSelectPermission,
  isLoading,
  currentUser,
  onTreeChange,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | 'locked' | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // عرض سایدبار درختی و قابلیت تغییر اندازه پویا برای مشاهده کامل عناوین و نمای عریض
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('k_rpt_permission_tree_width');
    return saved ? Math.max(320, Math.min(850, parseInt(saved, 10))) : 420;
  });
  const [isResizing, setIsResizing] = useState(false);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 850) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('k_rpt_permission_tree_width', sidebarWidth.toString());
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
      const next = prev < 480 ? 620 : 380;
      localStorage.setItem('k_rpt_permission_tree_width', next.toString());
      return next;
    });
  };

  // بستن تمامی شاخه‌ها
  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
    showToast('تمامی شاخه‌ها بسته شدند.', 'info');
  };

  // باز کردن تمامی شاخه‌ها
  const handleExpandAll = () => {
    const allIds = new Set<number>();
    const collect = (items: PermissionTreeNode[]) => {
      for (const item of items) {
        allIds.add(item.nodeId);
        if (item.children && item.children.length > 0) {
          collect(item.children);
        }
      }
    };
    collect(nodes);
    setExpandedNodes(allIds);
    showToast('تمامی شاخه‌ها باز شدند.', 'info');
  };

  // مودال‌های ایجاد و ویرایش سطح و دسترسی
  const [showNewLevelModal, setShowNewLevelModal] = useState(false);
  const [showEditLevelModal, setShowEditLevelModal] = useState(false);
  const [showNewPermissionModal, setShowNewPermissionModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  // مودال‌های انتقال
  const [showMoveNodeModal, setShowMoveNodeModal] = useState(false);
  const [showMovePermissionModal, setShowMovePermissionModal] = useState(false);
  const [movingNodeId, setMovingNodeId] = useState<number | null>(null);
  const [movingNodeTitle, setMovingNodeTitle] = useState('');
  const [targetNewParentId, setTargetNewParentId] = useState<number | null>(null);
  const [movingPermissionId, setMovingPermissionId] = useState<number | null>(null);
  const [movingPermissionTitle, setMovingPermissionTitle] = useState('');
  const [targetPermissionLevelId, setTargetPermissionLevelId] = useState<number>(0);

  // فرم سطح جدید / ویرایش سطح
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [targetParentNodeId, setTargetParentNodeId] = useState<number | null>(null);
  const [levelTitle, setLevelTitle] = useState('');
  const [levelResourceCode, setLevelResourceCode] = useState('');
  const [levelDescription, setLevelDescription] = useState('');

  // فرم دسترسی جدید
  const [targetPermissionNodeId, setTargetPermissionNodeId] = useState<number>(0);
  const [permPersianName, setPermPersianName] = useState('');
  const [permEnglishName, setPermEnglishName] = useState('');
  const [permResourceNumber, setPermResourceNumber] = useState('');
  const [permDescription, setPermDescription] = useState('');

  // باز کردن خودکار گره‌های ریشه در اولین بار
  React.useEffect(() => {
    if (nodes.length > 0 && expandedNodes.size === 0) {
      const initial = new Set<number>();
      for (const n of nodes) {
        initial.add(n.nodeId);
      }
      setExpandedNodes(initial);
    }
  }, [nodes]);

  const toggleExpand = (nodeId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // لیست تخت تمام گره‌ها جهت استفاده در سلکتورها
  const flatNodesList = useMemo(() => {
    const list: { nodeId: number; title: string; depth: number; resourceCode?: string }[] = [];
    const traverse = (items: PermissionTreeNode[], depth = 0) => {
      for (const item of items) {
        list.push({ nodeId: item.nodeId, title: item.title, depth, resourceCode: item.resourceCode });
        if (item.children && item.children.length > 0) {
          traverse(item.children, depth + 1);
        }
      }
    };
    traverse(nodes);
    return list;
  }, [nodes]);

  // فیلتر هوشمند بر اساس جستجو و وضعیت
  const filterNode = (node: PermissionTreeNode): boolean => {
    const term = searchTerm.trim().toLowerCase();

    // بررسی انطباق دسترسی‌ها
    const matchesPermission = (p: PermissionItem) => {
      let statusMatches = true;
      if (statusFilter === 'locked') {
        statusMatches = p.isLocked;
      } else if (statusFilter !== null) {
        statusMatches = p.status === statusFilter;
      }

      if (!statusMatches) return false;

      if (!term) return true;
      return (
        p.persianName.toLowerCase().includes(term) ||
        (p.englishName && p.englishName.toLowerCase().includes(term)) ||
        p.resourceNumber.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    };

    const hasMatchingPerm = node.permissions.some(matchesPermission);
    const titleMatches =
      !term ||
      node.title.toLowerCase().includes(term) ||
      (node.resourceCode ? node.resourceCode.toLowerCase().includes(term) : false);

    const hasMatchingChild = node.children.some((child) => filterNode(child));

    return Boolean(hasMatchingPerm || hasMatchingChild || (statusFilter === null && titleMatches));
  };

  // فیلتر کردن دسترسی‌های یک گره
  const getFilteredPermissions = (perms: PermissionItem[]): PermissionItem[] => {
    const term = searchTerm.trim().toLowerCase();
    return perms.filter((p) => {
      let statusMatches = true;
      if (statusFilter === 'locked') {
        statusMatches = p.isLocked;
      } else if (statusFilter !== null) {
        statusMatches = p.status === statusFilter;
      }

      if (!statusMatches) return false;

      if (!term) return true;
      return (
        p.persianName.toLowerCase().includes(term) ||
        (p.englishName && p.englishName.toLowerCase().includes(term)) ||
        p.resourceNumber.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    });
  };

  // آماده‌سازی برای ایجاد سطح جدید
  const openNewLevelModal = async (parentId: number | null = null) => {
    setTargetParentNodeId(parentId);
    setLevelTitle('');
    setLevelDescription('');
    try {
      const nextCode = await permissionTreeApi.getNextResourceCode(parentId);
      setLevelResourceCode(nextCode);
    } catch {
      setLevelResourceCode('MOD-01');
    }
    setShowNewLevelModal(true);
  };

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelTitle.trim()) {
      showToast('عنوان سطح الزامی است.', 'warning');
      return;
    }

    try {
      await permissionTreeApi.createNode({
        parentNodeId: targetParentNodeId,
        title: levelTitle.trim(),
        resourceCode: levelResourceCode.trim() || undefined,
        description: levelDescription.trim() || undefined,
      });

      showToast('سطح جدید با موفقیت ایجاد شد.', 'success');
      setShowNewLevelModal(false);
      onTreeChange();
    } catch (err) {
      console.error(err);
      showToast('خطا در ایجاد سطح جدید.', 'error');
    }
  };

  // آماده‌سازی برای ویرایش سطح
  const openEditLevelModal = (node: PermissionTreeNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingNodeId(node.nodeId);
    setTargetParentNodeId(node.parentNodeId);
    setLevelTitle(node.title);
    setLevelResourceCode(node.resourceCode || '');
    setLevelDescription(node.description || '');
    setShowEditLevelModal(true);
  };

  const handleUpdateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNodeId || !levelTitle.trim()) {
      showToast('عنوان سطح الزامی است.', 'warning');
      return;
    }

    try {
      await permissionTreeApi.updateNode(editingNodeId, {
        parentNodeId: targetParentNodeId,
        title: levelTitle.trim(),
        resourceCode: levelResourceCode.trim() || undefined,
        sortOrder: 0,
        description: levelDescription.trim() || undefined,
      });

      showToast('مشخصات سطح با موفقیت ویرایش شد.', 'success');
      setShowEditLevelModal(false);
      setEditingNodeId(null);
      onTreeChange();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'خطا در ویرایش مشخصات سطح.';
      showToast(msg, 'error');
    }
  };

  // باز کردن مدال انتقال سطح به والد دیگر
  const openMoveNodeModal = (node: PermissionTreeNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMovingNodeId(node.nodeId);
    setMovingNodeTitle(node.title);
    setTargetNewParentId(node.parentNodeId);
    setShowMoveNodeModal(true);
  };

  const handleCommitMoveNode = async () => {
    if (!movingNodeId) return;
    try {
      await permissionTreeApi.moveNode(movingNodeId, targetNewParentId);
      showToast('سطح با موفقیت به والد جدید منتقل شد.', 'success');
      setShowMoveNodeModal(false);
      setMovingNodeId(null);
      onTreeChange();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'خطا در انتقال سطح.';
      showToast(msg, 'error');
    }
  };

  // باز کردن مدال انتقال دسترسی به سطح دیگر
  const openMovePermissionModal = (permId: number, permTitle: string, currentNodeId: number) => {
    setMovingPermissionId(permId);
    setMovingPermissionTitle(permTitle);
    setTargetPermissionLevelId(currentNodeId);
    setShowMovePermissionModal(true);
  };

  const handleCommitMovePermission = async () => {
    if (!movingPermissionId || !targetPermissionLevelId) return;
    try {
      await permissionsApi.move(movingPermissionId, targetPermissionLevelId);
      showToast('دسترسی با موفقیت به سطح انتخابی منتقل شد.', 'success');
      setShowMovePermissionModal(false);
      setMovingPermissionId(null);
      onTreeChange();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'خطا در انتقال دسترسی.';
      showToast(msg, 'error');
    }
  };

  // آماده‌سازی برای ایجاد دسترسی جدید (نام انگلیسی اختیاری است)
  const openNewPermissionModal = async (nodeId?: number) => {
    const defaultNodeId = nodeId || (flatNodesList.length > 0 ? flatNodesList[0].nodeId : 0);
    setTargetPermissionNodeId(defaultNodeId);
    setPermPersianName('');
    setPermEnglishName('');
    setPermDescription('');
    try {
      const nextNum = await permissionsApi.getNextCode();
      setPermResourceNumber(nextNum);
    } catch {
      setPermResourceNumber('1001');
    }
    setShowNewPermissionModal(true);
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permPersianName.trim() || !permResourceNumber.trim()) {
      showToast('نام فارسی و شماره منبع الزامی هستند.', 'warning');
      return;
    }

    try {
      const created = await permissionsApi.create({
        nodeId: targetPermissionNodeId,
        persianName: permPersianName.trim(),
        englishName: permEnglishName.trim() || undefined,
        resourceNumber: permResourceNumber.trim(),
        description: permDescription.trim() || undefined,
      });

      showToast('دسترسی جدید با موفقیت ایجاد شد.', 'success');
      setShowNewPermissionModal(false);
      onTreeChange();
      onSelectPermission(created.permissionId);
    } catch (err) {
      console.error(err);
      showToast('خطا در ثبت دسترسی جدید.', 'error');
    }
  };

  // حذف مستقیم دسترسی از سایدبار
  const handleDeletePermissionDirect = async (permId: number, permTitle: string) => {
    if (!confirm(`آیا از حذف دسترسی «${permTitle}» اطمینان دارید؟`)) return;

    try {
      await permissionsApi.delete(permId);
      showToast('دسترسی با موفقیت حذف گردید.', 'success');
      onTreeChange();
    } catch (err) {
      console.error(err);
      showToast('خطا در حذف دسترسی.', 'error');
    }
  };

  // حذف یک سطح
  const handleDeleteLevel = async (nodeId: number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`آیا از حذف سطح «${title}» و کلیه زیرشاخه‌ها و دسترسی‌های آن اطمینان دارید؟`)) return;

    try {
      await permissionTreeApi.deleteNode(nodeId);
      showToast('سطح مورد نظر حذف گردید.', 'success');
      onTreeChange();
    } catch (err) {
      console.error(err);
      showToast('خطا در حذف سطح.', 'error');
    }
  };

  // رندر بازگشتی درختواره (Recursive Tree Node)
  const renderNode = (node: PermissionTreeNode, depth = 0) => {
    if (!filterNode(node)) return null;

    const isExpanded = expandedNodes.has(node.nodeId) || searchTerm.length > 0 || statusFilter !== null;
    const filteredPerms = getFilteredPermissions(node.permissions);

    return (
      <div key={node.nodeId} className="select-none text-xs">
        {/* ردیف سطح / ماژول */}
        <div
          onClick={() => toggleExpand(node.nodeId)}
          className={`flex items-center justify-between py-1.5 px-2 rounded-xl cursor-pointer transition-all hover:bg-slate-100/90 group ${
            isExpanded ? 'bg-slate-50/70 font-semibold' : ''
          }`}
          style={{ paddingRight: `${Math.max(8, depth * 16 + 8)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              onClick={(e) => toggleExpand(node.nodeId, e)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </span>
            <span className="text-amber-500">
              {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
            </span>
            <span className="truncate text-slate-800 font-bold" title={node.title}>
              {node.title}
            </span>
            {node.resourceCode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(node.resourceCode!);
                  showToast(`کد منبع سطح «${node.resourceCode}» در کلیپ‌بورد کپی شد.`, 'info');
                }}
                title={`کپی کد منبع: ${node.resourceCode}`}
                className="bg-slate-100 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 text-slate-500 font-mono text-[10px] px-1.5 py-0.2 rounded-md transition-colors cursor-pointer"
              >
                {node.resourceCode}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* دکمه کپی نام سطح */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(node.title);
                showToast(`نام سطح «${node.title}» در کلیپ‌بورد کپی شد.`, 'info');
              }}
              title="کپی نام فارسی سطح"
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Copy className="w-3 h-3" />
            </button>

            {/* تعداد دسترسی‌های زیرمجموعه */}
            <span
              className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full"
              title="تعداد دسترسی‌های این شاخه"
            >
              {node.totalPermissionsCount}
            </span>

            {/* دکمه‌های سریع در هاور برای ادمین */}
            {currentUser?.roleId === 3 && (
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openNewPermissionModal(node.nodeId);
                  }}
                  title="افزودن دسترسی به این سطح"
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openNewLevelModal(node.nodeId);
                  }}
                  title="افزودن زیرسطح جدید"
                  className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => openMoveNodeModal(node, e)}
                  title="انتقال این سطح به والد دیگر"
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => openEditLevelModal(node, e)}
                  title="ویرایش مشخصات این سطح"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDeleteLevel(node.nodeId, node.title, e)}
                  title="حذف این سطح"
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* فرزندان بازگشتی و دسترسی‌ها در صورت باز بودن */}
        {isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {/* ۱. دسترسی‌های مستقیم این سطح */}
            {filteredPerms.map((perm) => {
              const isSelected = selectedPermissionId === perm.permissionId;
              return (
                <div
                  key={perm.permissionId}
                  onClick={() => onSelectPermission(perm.permissionId)}
                  className={`group/perm flex items-center justify-between py-1 px-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200/80 shadow-2xs'
                      : 'hover:bg-slate-100/80 text-slate-700'
                  }`}
                  style={{ paddingRight: `${(depth + 1) * 16 + 12}px` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate leading-tight" title={perm.persianName}>
                        {perm.persianName}
                      </span>
                      {perm.englishName && (
                        <span className="text-[10px] text-slate-400 font-mono truncate" dir="ltr">
                          {perm.englishName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 mr-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(perm.resourceNumber);
                        showToast(`شماره منبع «${perm.resourceNumber}» در کلیپ‌بورد کپی شد.`, 'info');
                      }}
                      title={`کپی شماره منبع: ${perm.resourceNumber}`}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      #{perm.resourceNumber}
                    </button>

                    {/* دکمه‌های هاور برای کپی، انتقال و حذف سریع دسترسی */}
                    <div className="hidden group-hover/perm:flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(perm.persianName);
                          showToast(`نام فارسی دسترسی «${perm.persianName}» در کلیپ‌بورد کپی شد.`, 'info');
                        }}
                        title="کپی نام فارسی دسترسی"
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMovePermissionModal(perm.permissionId, perm.persianName, perm.nodeId);
                        }}
                        title="انتقال دسترسی به سطح دیگر"
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePermissionDirect(perm.permissionId, perm.persianName);
                        }}
                        title="حذف این دسترسی"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* آیکون وضعیت */}
                    {perm.isLocked ? (
                      <span title={`این دسترسی توسط «${perm.lockedByUserName || 'کاربر'}» در حال ویرایش است`}>
                        <Lock className="w-3.5 h-3.5 text-rose-500 fill-rose-50 shrink-0" />
                      </span>
                    ) : perm.status === 3 ? (
                      <span title="تایید شده">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </span>
                    ) : perm.status === 2 ? (
                      <span title="قابل بررسی">
                        <Edit3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      </span>
                    ) : (
                      <span title="در انتظار">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* ۲. سطوح و شاخه‌های فرزند (بازگشتی) */}
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
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

      {/* سربرگ سایدبار دسترسی‌ها */}
      <div className="p-3 border-b border-slate-200/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-slate-900 leading-tight">درختواره دسترسی‌ها</h2>
                <button
                  type="button"
                  onClick={togglePresetWidth}
                  title={sidebarWidth < 480 ? 'تغییر به نمای عریض' : 'تغییر به نمای استاندارد'}
                  className="text-[10px] text-slate-500 hover:text-blue-600 hover:bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  {sidebarWidth < 480 ? 'نمای عریض' : 'استاندارد'}
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  title="بستن تمامی شاخه‌ها"
                  className="text-[10px] text-slate-500 hover:text-amber-700 hover:bg-amber-50 px-1.5 py-0.2 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  بستن همه
                </button>
              </div>
              <span className="text-[10px] text-slate-400">ساختار نامحدود و کد منبع</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCollapseAll}
              title="بستن همه شاخه‌ها"
              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 transition-colors cursor-pointer"
            >
              <FolderMinus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleExpandAll}
              title="باز کردن همه شاخه‌ها"
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowExcelModal(true)}
              title="ورود و خروج اکسل دسترسی‌ها"
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onTreeChange}
              title="تازه‌سازی ساختار درختی"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* دکمه‌های ایجاد سطح و دسترسی */}
        {currentUser?.roleId === 3 && (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => openNewLevelModal(null)}
              className="px-2 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-700" />
              <span>سطح جدید</span>
            </button>
            <button
              onClick={() => openNewPermissionModal()}
              className="px-2 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100/80 text-blue-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-blue-700" />
              <span>دسترسی جدید</span>
            </button>
          </div>
        )}

        {/* باکس جستجوی دسترسی‌ها */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی فارسی، انگلیسی، کد منبع..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-7 py-1.5 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ناحیه اسکرول شونده ساختار درختی */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>در حال بارگذاری ساختار درختی دسترسی‌ها...</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <Layers className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">هنوز سطحی تعریف نشده است.</p>
            <p className="text-[11px]">با دکمه «سطح جدید» یا «اکسل» ساختار دسترسی‌ها را آغاز نمایید.</p>
          </div>
        ) : (
          nodes.map((node) => renderNode(node, 0))
        )}
      </div>

      {/* بخش وضعیت‌ها و فیلتر تعاملی پایین سایدبار (دقیقاً در انتهای صفحه) */}
      <div className="mt-auto border-t border-slate-200 bg-slate-50/90 px-3 py-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
          <button
            onClick={() => setStatusFilter(statusFilter === 3 ? null : 3)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              statusFilter === 3
                ? 'bg-emerald-100 text-emerald-800 font-bold ring-1 ring-emerald-400 shadow-2xs'
                : 'hover:bg-slate-200/70'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>تایید شده</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 2 ? null : 2)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              statusFilter === 2
                ? 'bg-blue-100 text-blue-800 font-bold ring-1 ring-blue-400 shadow-2xs'
                : 'hover:bg-slate-200/70'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>قابل بررسی</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 1 ? null : 1)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              statusFilter === 1
                ? 'bg-amber-100 text-amber-800 font-bold ring-1 ring-amber-400 shadow-2xs'
                : 'hover:bg-slate-200/70'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>در انتظار</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'locked' ? null : 'locked')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              statusFilter === 'locked'
                ? 'bg-rose-100 text-rose-800 font-bold ring-1 ring-rose-400 shadow-2xs'
                : 'hover:bg-slate-200/70'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            <span>قفل</span>
          </button>
        </div>

        {/* دکمه پاک‌کردن فیلتر */}
        {statusFilter !== null && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">
              فیلتر فعال:{' '}
              <strong className="text-blue-600">
                {statusFilter === 3
                  ? 'تایید شده'
                  : statusFilter === 2
                  ? 'قابل بررسی'
                  : statusFilter === 1
                  ? 'در انتظار'
                  : 'موارد قفل‌شده'}
              </strong>
            </span>
            <button
              onClick={() => setStatusFilter(null)}
              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 hover:underline"
            >
              <X className="w-3 h-3" />
              <span>نمایش همه</span>
            </button>
          </div>
        )}
      </div>

      {/* مدال ایجاد سطح جدید */}
      {showNewLevelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-600" />
                <span>تعریف سطح جدید در ساختار درختی</span>
              </h3>
              <button
                onClick={() => setShowNewLevelModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLevel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سطح والد (مکان قرارگیری)</label>
                <select
                  value={targetParentNodeId || ''}
                  onChange={(e) => setTargetParentNodeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">سطح ریشه اصلی (شاخه اول)</option>
                  {flatNodesList.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {'— '.repeat(n.depth)} {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان سطح / ماژول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={levelTitle}
                  onChange={(e) => setLevelTitle(e.target.value)}
                  placeholder="مثال: مدیریت کاربران و احراز هویت"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شماره یا کد منبع این سطح</label>
                <input
                  type="text"
                  value={levelResourceCode}
                  onChange={(e) => setLevelResourceCode(e.target.value)}
                  placeholder="مثال: SYS-01 یا 100"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-hidden focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات سطح (اختیاری)</label>
                <textarea
                  rows={3}
                  value={levelDescription}
                  onChange={(e) => setLevelDescription(e.target.value)}
                  placeholder="توضیحاتی درباره ماژول و دسترسی‌های این رده..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewLevelModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  ایجاد سطح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال ویرایش سطح */}
      {showEditLevelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>ویرایش مشخصات سطح</span>
              </h3>
              <button
                onClick={() => setShowEditLevelModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateLevel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سطح والد</label>
                <select
                  value={targetParentNodeId || ''}
                  onChange={(e) => setTargetParentNodeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">سطح ریشه اصلی (شاخه اول)</option>
                  {flatNodesList
                    .filter((n) => n.nodeId !== editingNodeId)
                    .map((n) => (
                      <option key={n.nodeId} value={n.nodeId}>
                        {'— '.repeat(n.depth)} {n.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان سطح / ماژول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={levelTitle}
                  onChange={(e) => setLevelTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شماره یا کد منبع این سطح</label>
                <input
                  type="text"
                  value={levelResourceCode}
                  onChange={(e) => setLevelResourceCode(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-hidden focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات سطح</label>
                <textarea
                  rows={3}
                  value={levelDescription}
                  onChange={(e) => setLevelDescription(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditLevelModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال انتقال سطح به والد دیگر */}
      {showMoveNodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-indigo-600" />
                <span>انتقال سطح به شاخه یا والد دیگر</span>
              </h3>
              <button
                onClick={() => setShowMoveNodeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-500 block mb-1">سطح در حال انتقال:</span>
                <span className="font-bold text-slate-900">{movingNodeTitle}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  انتخاب مکان والد جدید
                </label>
                <select
                  value={targetNewParentId || ''}
                  onChange={(e) => setTargetNewParentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">سطح ریشه اصلی (شاخه اصلی)</option>
                  {flatNodesList
                    .filter((n) => n.nodeId !== movingNodeId)
                    .map((n) => (
                      <option key={n.nodeId} value={n.nodeId}>
                        {'— '.repeat(n.depth)} {n.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMoveNodeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleCommitMoveNode}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  <FolderInput className="w-4 h-4" />
                  <span>تایید انتقال سطح</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مدال انتقال دسترسی به سطح دیگر */}
      {showMovePermissionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-blue-600" />
                <span>انتقال دسترسی به سطح دیگر</span>
              </h3>
              <button
                onClick={() => setShowMovePermissionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-500 block mb-1">دسترسی در حال انتقال:</span>
                <span className="font-bold text-slate-900">{movingPermissionTitle}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  انتخاب سطح مقصد
                </label>
                <select
                  value={targetPermissionLevelId}
                  onChange={(e) => setTargetPermissionLevelId(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                >
                  {flatNodesList.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {'— '.repeat(n.depth)} {n.title} {n.resourceCode ? `(${n.resourceCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMovePermissionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleCommitMovePermission}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  <FolderInput className="w-4 h-4" />
                  <span>تایید انتقال دسترسی</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مدال ایجاد دسترسی جدید (نام انگلیسی اختیاری است) */}
      {showNewPermissionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>تعریف دسترسی جدید</span>
              </h3>
              <button
                onClick={() => setShowNewPermissionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePermission} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سطح ساختار درختی <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={targetPermissionNodeId}
                  onChange={(e) => setTargetPermissionNodeId(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                >
                  {flatNodesList.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {'— '.repeat(n.depth)} {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نام فارسی دسترسی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={permPersianName}
                    onChange={(e) => setPermPersianName(e.target.value)}
                    placeholder="مثال: ویرایش کاربران"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نام انگلیسی (سیستمی - اختیاری)
                  </label>
                  <input
                    type="text"
                    value={permEnglishName}
                    onChange={(e) => setPermEnglishName(e.target.value)}
                    placeholder="مثال: EditUser (اختیاری)"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-hidden focus:border-blue-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شماره منبع دسترسی (Resource Number) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={permResourceNumber}
                  onChange={(e) => setPermResourceNumber(e.target.value)}
                  placeholder="مثال: 1002 یا PERM-1002"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-blue-600 focus:outline-hidden focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  باکس درج توضیحات دسترسی
                </label>
                <textarea
                  rows={4}
                  value={permDescription}
                  onChange={(e) => setPermDescription(e.target.value)}
                  placeholder="شرح جزئیات عملکرد، شروط اعطا، صفحات و فرم‌های تحت پوشش این دسترسی..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPermissionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  ثبت دسترسی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال درون‌ریزی و برون‌بری اکسل */}
      <PermissionExcelModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        treeNodes={nodes}
        onImportComplete={() => {
          onTreeChange();
        }}
      />
    </aside>
  );
};
