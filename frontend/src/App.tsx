import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { TreeView } from './components/TreeView';
import { ReportDetailView } from './components/ReportDetailView';
import { SearchView } from './components/SearchView';
import { DiffView } from './components/DiffView';
import { FieldBankModal } from './components/FieldBankModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { ToastProvider, useToast } from './components/Toast';
import type { ReportDetail, TreeNode, User } from './types';
import { authApi, reportsApi, treeApi } from './api/client';
import * as signalR from '@microsoft/signalr';

function MainApp() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  // بارگذاری کاربر از حافظه مرورگر و تضمین اعتبار نشست
  useEffect(() => {
    const user = authApi.getCurrentUser();
    const token = localStorage.getItem('krpt_token');
    if (user && token) {
      setCurrentUser(user);
    } else {
      authApi.login('admin', 'admin123').then((res) => {
        setCurrentUser(res.user);
      }).catch((err) => {
        console.error('ورود خودکار ناموفق:', err);
      });
    }
  }, []);

  // بارگذاری درخت ماژول‌ها و گزارش‌ها
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
      console.error('خطا در بارگذاری درخت:', err);
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

  // اتصال به SignalR برای همگام‌سازی لحظه‌ای
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/lock')
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
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
      })
      .catch((err) => console.log('SignalR Connection Error:', err));

    return () => {
      connection.stop();
    };
  }, [selectedReportId]);

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

  // محاسبه نام ماژول والد برای نمایش در Breadcrumb
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
      {/* هدر بالایی با دکمه تنظیمات ادمین */}
      <Header
        currentUser={currentUser}
        onUserChange={(u) => {
          setCurrentUser(u);
          if (u) showToast(`خوش آمدید، ${u.fullName}`, 'info');
        }}
        onOpenFieldBank={() => setIsFieldBankOpen(true)}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* بخش بدنه صفحه: سایدبار درختی سمت راست + محتوای اصلی */}
      <div className="flex-1 flex overflow-hidden">
        {/* درخت ماژول‌ها و گزارش‌ها */}
        <TreeView
          nodes={treeNodes}
          selectedReportId={selectedReportId}
          onSelectReport={handleSelectReport}
          isLoading={treeLoading}
          currentUser={currentUser}
          onTreeChange={loadTree}
        />

        {/* ناحیه محتوا بر اساس تب فعال */}
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
