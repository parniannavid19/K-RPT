import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { TreeView } from './components/TreeView';
import { ReportDetailView } from './components/ReportDetailView';
import { SearchView } from './components/SearchView';
import { DiffView } from './components/DiffView';
import { FieldBankModal } from './components/FieldBankModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { PermissionTreeView } from './components/PermissionTreeView';
import { PermissionDetailView } from './components/PermissionDetailView';
import { StatusDashboard } from './components/StatusDashboard';
import { ToastProvider, useToast } from './components/Toast';
import type {
  PermissionItem,
  PermissionTreeNode,
  ReportDetail,
  SystemDomain,
  TreeNode,
  User,
} from './types';
import {
  authApi,
  permissionTreeApi,
  permissionsApi,
  reportsApi,
  treeApi,
} from './api/client';
import * as signalR from '@microsoft/signalr';

function MainApp() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // بخش فعال سامانه: داشبورد وضعیت (dashboard) | گزارش‌ها (reports) | دسترسی‌ها (permissions) | کانفیگ‌ها (configs)
  const [activeDomain, setActiveDomain] = useState<SystemDomain>('dashboard');

  // استیت‌های دامنه گزارش‌ها
  const [activeTab, setActiveTab] = useState<'detail' | 'search' | 'diff'>('detail');
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [isFieldBankOpen, setIsFieldBankOpen] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [compareReportA, setCompareReportA] = useState<number | null>(null);
  const [compareReportB, setCompareReportB] = useState<number | null>(null);
  const [fieldBankVersion, setFieldBankVersion] = useState(0);

  // استیت‌های دامنه دسترسی‌ها
  const [permissionNodes, setPermissionNodes] = useState<PermissionTreeNode[]>([]);
  const [permissionTreeLoading, setPermissionTreeLoading] = useState(false);
  const [selectedPermissionId, setSelectedPermissionId] = useState<number | null>(null);
  const [permissionDetail, setPermissionDetail] = useState<PermissionItem | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(false);

  // بارگذاری کاربر از حافظه مرورگر و تضمین اعتبار نشست
  useEffect(() => {
    const user = authApi.getCurrentUser();
    const token = localStorage.getItem('krpt_token');
    if (user && token) {
      setCurrentUser(user);
    } else {
      authApi
        .login('admin', 'admin123')
        .then((res) => {
          setCurrentUser(res.user);
        })
        .catch((err) => {
          console.error('ورود خودکار ناموفق:', err);
        });
    }
  }, []);

  // ۱. بارگذاری درخت گزارش‌ها
  const loadTree = async () => {
    setTreeLoading(true);
    try {
      const data = await treeApi.getTree();
      setTreeNodes(data);

      if (!selectedReportId) {
        const findFirstReport = (list: TreeNode[]): number | null => {
          for (const item of list) {
            if (item.reportId) return item.reportId;
            if (item.children) {
              const found = findFirstReport(item.children);
              if (found) return found;
            }
          }
          return null;
        };
        const firstId = findFirstReport(data);
        if (firstId) {
          setSelectedReportId(firstId);
        }
      }
    } catch (err) {
      console.error('خطا در بارگذاری درخت گزارش‌ها:', err);
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  // بارگذاری شناسنامه گزارش انتخاب‌شده
  const loadReport = async (id: number) => {
    setReportLoading(true);
    try {
      const data = await reportsApi.getById(id);
      setReportDetail(data);
    } catch (err) {
      console.error('خطا در دریافت شناسنامه گزارش:', err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReportId) {
      loadReport(selectedReportId);
    }
  }, [selectedReportId]);

  // ۲. بارگذاری درخت دسترسی‌ها
  const loadPermissionTree = async () => {
    setPermissionTreeLoading(true);
    try {
      const data = await permissionTreeApi.getTree();
      setPermissionNodes(data);

      if (!selectedPermissionId) {
        const findFirstPerm = (list: PermissionTreeNode[]): number | null => {
          for (const item of list) {
            if (item.permissions && item.permissions.length > 0) {
              return item.permissions[0].permissionId;
            }
            if (item.children) {
              const found = findFirstPerm(item.children);
              if (found) return found;
            }
          }
          return null;
        };
        const firstId = findFirstPerm(data);
        if (firstId) {
          setSelectedPermissionId(firstId);
        }
      }
    } catch (err) {
      console.error('خطا در بارگذاری درخت دسترسی‌ها:', err);
    } finally {
      setPermissionTreeLoading(false);
    }
  };

  useEffect(() => {
    if (activeDomain === 'permissions') {
      loadPermissionTree();
    }
  }, [activeDomain]);

  // بارگذاری شناسنامه دسترسی انتخاب‌شده
  const loadPermission = async (id: number) => {
    setPermissionLoading(true);
    try {
      const data = await permissionsApi.getById(id);
      setPermissionDetail(data);
    } catch (err) {
      console.error('خطا در دریافت شناسنامه دسترسی:', err);
    } finally {
      setPermissionLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPermissionId) {
      loadPermission(selectedPermissionId);
    }
  }, [selectedPermissionId]);

  // بستن سراسری کلیه پنجره‌های شناور با دکمه Esc
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFieldBankOpen) setIsFieldBankOpen(false);
        if (isAdminSettingsOpen) setIsAdminSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFieldBankOpen, isAdminSettingsOpen]);

  // اتصال به SignalR برای همگام‌سازی لحظه‌ای گزارش‌ها و دسترسی‌ها
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/lock')
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
        // رخدادهای قفل و تایید گزارش‌ها
        connection.on('ReportLockChanged', (data) => {
          loadTree();
          if (selectedReportId === data.reportId) {
            loadReport(data.reportId);
          }
        });

        connection.on('ReportVerified', (data) => {
          loadTree();
          if (selectedReportId === data.reportId) {
            loadReport(data.reportId);
          }
        });

        connection.on('ReportDeleted', (reportId) => {
          loadTree();
          if (selectedReportId === reportId) {
            setSelectedReportId(null);
            setReportDetail(null);
          }
        });

        connection.on('FieldBankChanged', () => {
          setFieldBankVersion((v) => v + 1);
          if (selectedReportId) {
            loadReport(selectedReportId);
          }
        });

        // رخدادهای قفل و تایید دسترسی‌ها
        connection.on('PermissionLockChanged', (data) => {
          loadPermissionTree();
          if (selectedPermissionId === data.permissionId) {
            loadPermission(data.permissionId);
          }
        });

        connection.on('PermissionVerified', (data) => {
          loadPermissionTree();
          if (selectedPermissionId === data.permissionId) {
            loadPermission(data.permissionId);
          }
        });

        connection.on('PermissionDeleted', (permissionId) => {
          loadPermissionTree();
          if (selectedPermissionId === permissionId) {
            setSelectedPermissionId(null);
            setPermissionDetail(null);
          }
        });
      })
      .catch((err) => console.log('SignalR Connection Error:', err));

    return () => {
      connection.stop();
    };
  }, [selectedReportId, selectedPermissionId]);

  const handleSelectReport = (id: number) => {
    setSelectedReportId(id);
    setActiveTab('detail');
  };

  const handleCompareWith = (targetId: number) => {
    if (selectedReportId) {
      setCompareReportA(selectedReportId);
      setCompareReportB(targetId);
      setActiveTab('diff');
    }
  };

  // محاسبه نام ماژول والد برای نمایش در Breadcrumb گزارش
  const getParentModuleTitle = (reportId: number | null): string => {
    if (!reportId) return 'ماژول سیستم';
    for (const root of treeNodes) {
      if (root.children && root.children.some((c) => c.reportId === reportId)) {
        return root.title;
      }
    }
    return 'ماژول سیستم';
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      {/* هدر بالایی با سوئیچر بخش‌های سامانه و دکمه تنظیمات ادمین */}
      <Header
        currentUser={currentUser}
        onUserChange={(u) => {
          setCurrentUser(u);
          if (u) showToast(`خوش آمدید، ${u.fullName}`, 'info');
        }}
        onOpenFieldBank={() => setIsFieldBankOpen(true)}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        activeDomain={activeDomain}
        setActiveDomain={(domain) => {
          setActiveDomain(domain);
          if (domain === 'permissions') {
            loadPermissionTree();
          }
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* بدنه اصلی برنامه بر اساس دامنه انتخاب‌شده */}
      <div className="flex-1 flex overflow-hidden">
        {activeDomain === 'dashboard' ? (
          <StatusDashboard
            onNavigateDomain={(domain) => setActiveDomain(domain)}
            currentUser={currentUser}
            onOpenFieldBank={() => setIsFieldBankOpen(true)}
            onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
          />
        ) : activeDomain === 'reports' ? (
          <>
            {/* درخت ماژول‌ها و گزارش‌ها */}
            <TreeView
              nodes={treeNodes}
              selectedReportId={selectedReportId}
              onSelectReport={handleSelectReport}
              isLoading={treeLoading}
              currentUser={currentUser}
              onTreeChange={loadTree}
            />

            {/* ناحیه محتوای گزارش‌ها بر اساس تب فعال */}
            <main className="flex-1 flex overflow-hidden bg-slate-100/40">
              {activeTab === 'detail' && (
                <ReportDetailView
                  report={reportDetail}
                  currentUser={currentUser}
                  onRefresh={() => selectedReportId && loadReport(selectedReportId)}
                  onCompareWith={handleCompareWith}
                  isLoading={reportLoading}
                  moduleTitle={getParentModuleTitle(selectedReportId)}
                  fieldBankVersion={fieldBankVersion}
                />
              )}

              {activeTab === 'search' && (
                <SearchView onSelectReport={handleSelectReport} fieldBankVersion={fieldBankVersion} />
              )}

              {activeTab === 'diff' && (
                <DiffView
                  initialReportAId={compareReportA || selectedReportId}
                  initialReportBId={compareReportB}
                  fieldBankVersion={fieldBankVersion}
                />
              )}
            </main>
          </>
        ) : (
          <>
            {/* درخت ماژول‌ها و دسترسی‌ها */}
            <PermissionTreeView
              nodes={permissionNodes}
              selectedPermissionId={selectedPermissionId}
              onSelectPermission={(id) => setSelectedPermissionId(id)}
              isLoading={permissionTreeLoading}
              currentUser={currentUser}
              onTreeChange={loadPermissionTree}
            />

            {/* شناسنامه دسترسی */}
            <main className="flex-1 flex overflow-hidden bg-slate-100/40">
              <PermissionDetailView
                permission={permissionDetail}
                treeNodes={permissionNodes}
                currentUser={currentUser}
                onRefresh={() => {
                  if (selectedPermissionId) loadPermission(selectedPermissionId);
                  loadPermissionTree();
                }}
                onDeleted={() => {
                  setSelectedPermissionId(null);
                  setPermissionDetail(null);
                  loadPermissionTree();
                }}
                isLoading={permissionLoading}
              />
            </main>
          </>
        )}
      </div>

      {/* مدال بانک مرکزی فیلدها */}
      <FieldBankModal
        isOpen={isFieldBankOpen}
        onClose={() => setIsFieldBankOpen(false)}
        currentUser={currentUser}
        onFieldUpdated={() => {
          setFieldBankVersion((v) => v + 1);
          if (selectedReportId) {
            loadReport(selectedReportId);
          }
        }}
      />

      {/* مدال تنظیمات سیستم و مدیریت کاربران (فقط ادمین) */}
      <AdminSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        currentUser={currentUser}
        onSystemReset={() => {
          setSelectedReportId(null);
          setReportDetail(null);
          loadTree();
          loadPermissionTree();
          showToast('سیستم و پایگاه داده با موفقیت پاکسازی شدند.', 'success');
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

export default App;
