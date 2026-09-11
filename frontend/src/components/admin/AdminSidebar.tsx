import React from 'react';
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  Users,
  ShieldAlert,
  Award,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Overview & KPIs', icon: LayoutDashboard },
    { id: 'exams', label: 'Examinations', icon: Layers },
    { id: 'questions', label: 'Question Bank', icon: BookOpen },
    { id: 'attempts', label: 'Student Attempts', icon: Users },
    { id: 'proctoring', label: 'Proctoring Incidents', icon: ShieldAlert },
    { id: 'settings', label: 'Proctoring Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Admin Role Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
            {user?.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-white truncate">{user?.name}</h4>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {user?.role} Portal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Security Status Footnote */}
      <div className="p-4 border-t border-slate-800/80 text-xs">
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">CV Face Engine</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Auto Time Server</span>
            <span className="text-cyan-400 font-semibold">Synced</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
