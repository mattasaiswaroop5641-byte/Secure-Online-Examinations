import React, { useState, useEffect } from 'react';
import { examService } from '../../services/exams';
import { Exam } from '../../types';
import { ExamFormModal } from '../../components/admin/ExamFormModal';
import {
  Plus,
  Search,
  Layers,
  Clock,
  Award,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const ExamManagementPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const loadExams = async () => {
    setIsLoading(true);
    try {
      const data = await examService.listExams();
      setExams(data);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleDeleteExam = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this examination? All associated attempts will also be removed.')) {
      return;
    }
    try {
      await examService.deleteExam(id);
      loadExams();
    } catch (err) {
      console.error('Delete exam failed:', err);
    }
  };

  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Examination Management</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Configure examination schedules, durations, grading parameters, and question links.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingExam(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Examination</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by exam title or subject..."
          className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
        />
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 bg-white border border-slate-200 rounded-2xl shadow-sm animate-pulse" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900">No Examinations Found</p>
          <p className="text-xs text-slate-500 mt-1">Create an examination to begin enrolling candidates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="p-5 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between hover:border-slate-300 transition-all shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                    {exam.subject}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      exam.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {exam.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 tracking-tight">{exam.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{exam.description}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.duration_minutes} Mins</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.total_marks} Marks</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.question_count ?? 0} Questions</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400 font-bold">#</span>
                    <span>{exam.attempt_count ?? 0} Attempts</span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={() => {
                    setEditingExam(exam);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                  title="Edit Exam"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteExam(exam.id)}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete Exam"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exam Form Modal */}
      {isModalOpen && (
        <ExamFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          exam={editingExam}
          onSaved={loadExams}
        />
      )}
    </div>
  );
};
