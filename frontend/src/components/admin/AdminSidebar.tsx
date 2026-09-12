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
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Admin Role Header */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
            {user?.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-slate-900 truncate">{user?.name}</h4>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
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
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Security Status Footnote */}
      <div className="p-4 border-t border-slate-200 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">CV Face Engine</span>
            <span className="text-emerald-600 font-semibold">Active</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Auto Time Server</span>
            <span className="text-blue-600 font-semibold">Synced</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
