'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Technology } from '@dev-assessment/shared';

export default function NewTestConfigPage() {
  const router = useRouter();
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [values, setValues] = useState({
    name: '',
    technology_id: '',
    difficulty: 'mid',
    num_questions: 20,
    pass_threshold_pct: 80,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    api.get('/technologies').then((r) => setTechnologies(r.data)).catch(() => {});
  }, []);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setValues((v) => ({ ...v, [field]: val }));
      setErrors((er) => ({ ...er, [field]: '' }));
    };
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!values.name) errs.name = 'Required';
    if (!values.technology_id) errs.technology_id = 'Required';
    if (!values.difficulty) errs.difficulty = 'Required';
    if (!values.num_questions || values.num_questions < 1) errs.num_questions = 'Must be at least 1';
    if (!values.pass_threshold_pct) errs.pass_threshold_pct = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSubmitError('');
    setWarning('');
    try {
      const res = await api.post('/test-configs', values);
      if (res.data.warning) setWarning(res.data.warning);
      router.push('/test-configs');
    } catch (e: unknown) {
      setSubmitError('Failed to create test config');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">New Test Configuration</h2>
      {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}
      {warning && <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded mb-4">{warning}</p>}
      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" value={values.name} onChange={set('name')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. Power BI Mid Test" />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technology</label>
            <select value={values.technology_id} onChange={set('technology_id')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Select...</option>
              {technologies.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.technology_id && <p className="text-xs text-red-600 mt-1">{errors.technology_id}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select value={values.difficulty} onChange={set('difficulty')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
            <input type="number" min={1} max={100} value={values.num_questions} onChange={set('num_questions')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            {errors.num_questions && <p className="text-xs text-red-600 mt-1">{errors.num_questions}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pass Threshold %</label>
            <input type="number" min={1} max={100} value={values.pass_threshold_pct} onChange={set('pass_threshold_pct')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            {errors.pass_threshold_pct && <p className="text-xs text-red-600 mt-1">{errors.pass_threshold_pct}</p>}
          </div>
        </div>
        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating…' : 'Create Test Config'}
        </button>
      </form>
    </div>
  );
}
