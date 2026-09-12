import React, { useState, useEffect } from 'react';
import { questionService } from '../../services/questions';
import { QuestionAdmin } from '../../types';
import { QuestionFormModal } from '../../components/admin/QuestionFormModal';
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Filter,
} from 'lucide-react';

export const QuestionBankPage: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionAdmin[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionAdmin | null>(null);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const [qData, subData] = await Promise.all([
        questionService.listQuestions({
          subject: selectedSubject || undefined,
          difficulty: selectedDifficulty || undefined,
          search: search || undefined,
        }),
        questionService.getSubjects(),
      ]);
      setQuestions(qData);
      setSubjects(subData);
    } catch (err) {
      console.error('Failed to load question bank:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedSubject, selectedDifficulty]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuestions();
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm('Delete this question from the Question Bank?')) return;
    try {
      await questionService.deleteQuestion(id);
      loadQuestions();
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Question Bank</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Central repository of technical assessment items, correct options, and grading points.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingQuestion(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by keyword..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </form>

        <div className="flex items-center space-x-2">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-white border border-slate-200 rounded-2xl shadow-sm animate-pulse" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900">No Questions Found</p>
          <p className="text-xs text-slate-500 mt-1">Add items to build your question repository.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-slate-400">#{q.id}</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 text-xs">
                    {q.subject}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      q.difficulty === 'easy'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : q.difficulty === 'hard'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-emerald-700 font-semibold font-mono">+{q.marks} Marks</span>
                  {q.negative_marks > 0 && (
                    <span className="text-rose-600 font-mono">-{q.negative_marks} Neg</span>
                  )}

                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                    <button
                      onClick={() => {
                        setEditingQuestion(q);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Question"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap leading-relaxed">
                {q.text}
              </p>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      opt.is_correct
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{opt.option_text}</span>
                    {opt.is_correct && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </div>
                ))}
              </div>

              {/* Explanation Note */}
              {q.explanation && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-900">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Question Form Modal */}
      {isModalOpen && (
        <QuestionFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          question={editingQuestion}
          onSaved={loadQuestions}
        />
      )}
    </div>
  );
};
