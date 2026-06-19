'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  EyeOff,
  Lock,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { HolidayEngine } from '@/core/calendar/HolidayEngine';
import { formatThaiDate } from '@/lib/formatDate';
import type { Project } from '@/types/project';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { activeProjectId, selectProject, getActiveProject, setActiveProject, loadProjects, loading: storeLoading } = useProjectStore();
  const activeProject = getActiveProject();
  const [toast, setToast] = useState<string | null>(null);
  const [isReadonly, setIsReadonly] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Handle ?share= (public read-only) and ?edit= (auth required)
  const hasShareParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).has('share') : false;
  const hasEditParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).has('edit') : false;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    const editId = params.get('edit');

    if (shareId) {
      setIsReadonly(true);
      useProjectStore.setState({ loading: false });
      fetch(`/api/projects/${shareId}/public`)
        .then(r => r.json())
        .then(data => {
          if (data.project) {
            setActiveProject({ ...data.project, id: shareId } as Project);
          }
        })
        .catch(() => {});
    } else if (editId) {
      if (!authLoading && !user) {
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + '?edit=' + editId));
        return;
      }
      selectProject(editId);
    }
  }, [selectProject, setActiveProject, authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && !user && !hasShareParam) {
      router.push('/login');
    }
  }, [authLoading, user, router, hasShareParam]);

  useEffect(() => {
    if (!authLoading && user && !hasShareParam) {
      loadProjects();
    }
  }, [authLoading, user?.uid, loadProjects, hasShareParam]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (authLoading || storeLoading) return null;
  if (!user && !hasShareParam) return null;
  if (!user && hasShareParam && !activeProject) return null;

  if (!activeProjectId || !activeProject) {
    if (hasShareParam) return null;
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

  const handleShare = async (mode: 'readonly' | 'editable') => {
    const param = mode === 'readonly' ? 'share' : 'edit';
    const url = `${window.location.origin}${window.location.pathname}?${param}=${activeProject.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(mode === 'readonly' ? 'คัดลอกลิงค์ (ดูอย่างเดียว) แล้ว' : 'คัดลอกลิงค์ (แก้ไขได้) แล้ว');
    } catch {
      showToast('ไม่สามารถคัดลอกได้');
    }
    setShowShareMenu(false);
  };

  const handleExport = async () => {
    const el = document.getElementById('gantt-export-area') as HTMLElement;
    if (!el) return;

    // Collect all ancestors up to body
    const ancestors: HTMLElement[] = [];
    let p = el.parentElement;
    while (p && p !== document.body) {
      ancestors.push(p);
      p = p.parentElement;
    }

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

    // Release constraints on ancestors so the export area can grow
    for (const a of ancestors) {
      a.style.overflow = 'visible';
      a.style.height = 'auto';
      a.style.maxHeight = 'none';
      a.style.minHeight = '0';
      a.style.flex = '0 0 auto';
    }

    // Also unconstrain the export area itself
    const savedElFlex = el.style.flex;
    const savedElHeight = el.style.height;
    const savedElMinH = el.style.minHeight;
    el.style.flex = '0 0 auto';
    el.style.height = 'auto';
    el.style.minHeight = '0';

    // Release overflow constraints on children that clip content
    const exportChildren: { el: HTMLElement; savedOverflow: string; savedWidth?: string }[] = [];
    for (const sel of ['[data-gantt-left-body]', '[data-gantt-right-body]', '[data-gantt-right-header]']) {
      const child = el.querySelector(sel) as HTMLElement | null;
      if (child) {
        exportChildren.push({
          el: child,
          savedOverflow: child.style.overflow,
          savedWidth: child.style.width,
        });
        child.style.overflow = 'visible';
        // Expand RIGHT HEADER width to show all dates
        if (sel === '[data-gantt-right-header]') {
          const inner = child.firstElementChild as HTMLElement | null;
          if (inner) {
            child.style.width = inner.offsetWidth + 'px';
          }
        }
      }
    }

    // Let layout settle
    await new Promise(r => requestAnimationFrame(r));

    // Now measure the full content
    const fullH = el.scrollHeight;
    const fullW = el.scrollWidth;

    // Lock sizes for stable capture
    for (const a of ancestors) {
      a.style.height = fullH + 'px';
    }
    el.style.height = fullH + 'px';

    // Wait for layout to settle again
    await new Promise(r => requestAnimationFrame(r));

    try {
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        width: fullW,
        height: fullH,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `${activeProject.name}.png`;
      link.href = dataUrl;
      link.click();

      showToast('ส่งออกสำเร็จ');
    } catch {
      showToast('ส่งออกไม่สำเร็จ');
    } finally {
      // Restore child overflow
      for (const c of exportChildren) {
        c.el.style.overflow = c.savedOverflow;
        if (c.savedWidth !== undefined) c.el.style.width = c.savedWidth;
      }
      // Restore export area
      el.style.flex = savedElFlex;
      el.style.height = savedElHeight;
      el.style.minHeight = savedElMinH;
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
          <div className="relative" ref={shareRef}>
            <button onClick={() => setShowShareMenu(v => !v)} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
              <Share2 size={15} />
              <span className="hidden sm:inline">แชร์</span>
            </button>
            {showShareMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                <button onClick={() => handleShare('readonly')} className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors text-left">
                  <EyeOff size={16} className="text-slate-400 shrink-0" />
                  ดูอย่างเดียว
                </button>
                <div className="mx-3 h-px bg-slate-100" />
                <button onClick={() => handleShare('editable')} className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors text-left">
                  <Lock size={16} className="text-slate-400 shrink-0" />
                  แก้ไขได้
                </button>
              </div>
            )}
          </div>
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
        {user && (
          <>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1.5 text-slate-500">
              {user?.name || user?.email}
            </div>
          </>
        )}
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
