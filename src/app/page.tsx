'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GanttChart } from '@/features/project-timeline/components/GanttChart';
import { ProjectDashboard } from '@/features/project-timeline/components/ProjectDashboard';
import { useProjectStore } from '@/features/project-timeline/store/useProjectStore';
import {
  ArrowLeft,
  Layout,
  Calendar,
  Clock,
  Share2,
  Eye,
  Download,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { HolidayEngine } from '@/core/calendar/HolidayEngine';
import { formatThaiDate } from '@/lib/formatDate';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { activeProjectId, selectProject, getActiveProject, loadProjects, loading: storeLoading } = useProjectStore();
  const activeProject = getActiveProject();
  const [toast, setToast] = useState<string | null>(null);
  const [isReadonly, setIsReadonly] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      loadProjects();
    }
  }, [authLoading, user?.uid, loadProjects]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) {
      selectProject(shareId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReadonly(true);
    }
  }, [selectProject]);

  if (authLoading || storeLoading) return null;
  if (!user) return null;

  if (!activeProjectId || !activeProject) {
    return <ProjectDashboard />;
  }

  const endDates = activeProject.tasks.map((t) => t.calculatedEndDate).filter(Boolean) as string[];
  const projectEnd = endDates.length ? endDates.sort().reverse()[0] : activeProject.startDate;
  const engine = new HolidayEngine(activeProject.config);
  const totalDays = engine.countWorkingDays(
    new Date(activeProject.startDate),
    new Date(projectEnd)
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?share=${activeProject.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('คัดลอกลิงค์แล้ว');
    } catch {
      showToast('ไม่สามารถคัดลอกได้');
    }
  };

  const handleExport = async () => {
    const el = document.getElementById('gantt-export-area') as HTMLElement;
    if (!el) return;

    // Target specific overflow-constrained children
    const leftBody = el.querySelector('[data-gantt-left-body]') as HTMLElement;
    const rightBody = el.querySelector('[data-gantt-right-body]') as HTMLElement;
    const overflowChildren = [leftBody, rightBody].filter(Boolean) as HTMLElement[];

    // Collect all ancestors up to body
    const ancestors: HTMLElement[] = [];
    let p = el.parentElement;
    while (p && p !== document.body) {
      ancestors.push(p);
      p = p.parentElement;
    }

    // Save child overflow states
    const savedChildOverflows = overflowChildren.map(c => ({ overflow: c.style.overflow }));

    // Save ancestor styles
    const savedAncestors: Record<string, string>[] = [];
    for (const a of ancestors) {
      savedAncestors.push({
        overflow: a.style.overflow,
        height: a.style.height,
        maxHeight: a.style.maxHeight,
        minHeight: a.style.minHeight,
        flex: a.style.flex,
      });
    }

    // Release constraints on children FIRST (so their content contributes to scrollHeight)
    for (const c of overflowChildren) {
      c.style.overflow = 'visible';
    }

    // Release constraints on ancestors
    for (const a of ancestors) {
      a.style.overflow = 'visible';
      a.style.height = 'auto';
      a.style.maxHeight = 'none';
      a.style.minHeight = '0';
      a.style.flex = '0 0 auto';
    }

    // Remove flex & height constraints from the export area itself
    el.style.flex = '0 0 auto';
    el.style.height = 'auto';
    el.style.minHeight = '0';

    // Now measure full content after all constraints are released
    const fullH = el.scrollHeight;
    const fullW = el.scrollWidth;

    // Set explicit pixel heights for capture stability
    for (const a of ancestors) {
      a.style.height = fullH + 'px';
    }
    el.style.height = fullH + 'px';

    try {
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        width: fullW,
        height: fullH,
      });

      const link = document.createElement('a');
      link.download = `${activeProject.name}.png`;
      link.href = dataUrl;
      link.click();

      showToast('ส่งออกสำเร็จ');
    } catch {
      showToast('ส่งออกไม่สำเร็จ');
    } finally {
      // Restore child overflows
      for (let i = 0; i < overflowChildren.length; i++) {
        overflowChildren[i].style.overflow = savedChildOverflows[i].overflow;
      }
      // Restore ancestors
      for (let i = 0; i < ancestors.length; i++) {
        const s = savedAncestors[i];
        const a = ancestors[i];
        a.style.overflow = s.overflow;
        a.style.height = s.height;
        a.style.maxHeight = s.maxHeight;
        a.style.minHeight = s.minHeight;
        a.style.flex = s.flex;
      }
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-[var(--background)]">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

      <header className="flex items-center justify-between px-5 h-14 bg-white border-b border-slate-100">
        <div className="flex items-center gap-4">
          {!isReadonly && (
            <button
              onClick={() => selectProject(null)}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all active:scale-90"
              title="กลับแดชบอร์ด"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Layout size={15} className="text-white" />
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[15px] font-bold text-slate-900 leading-tight">{activeProject.name}</h1>
              {isReadonly && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full">
                  <Eye size={11} />
                  อ่านอย่างเดียว
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isReadonly && (
            <button onClick={handleExport} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
              <Download size={15} />
              <span className="hidden sm:inline">ส่งออก</span>
            </button>
          )}
          <button onClick={handleShare} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
            <Share2 size={15} />
            <span className="hidden sm:inline">แชร์</span>
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4 px-5 py-2 bg-white border-b border-slate-50 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} />
          <span>{formatThaiDate(activeProject.startDate)} – {formatThaiDate(projectEnd)}</span>
        </div>
        <span className="text-slate-200">|</span>
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{totalDays} วัน</span>
        </div>
        <span className="text-slate-200">|</span>
        <div className="flex items-center gap-1.5">
          <Layout size={12} />
          <span>{activeProject.tasks.length} งาน</span>
        </div>
        <span className="text-slate-200">|</span>
        <div className="flex items-center gap-1.5 text-slate-500">
          {user?.name || user?.email}
        </div>
      </div>

      <div className="flex-1 p-4 pt-3 overflow-auto">
        <GanttChart readonly={isReadonly} />
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl shadow-lg animate-fadeIn">
          {toast}
        </div>
      )}
    </main>
  );
}
