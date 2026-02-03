import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Scale, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import * as db from '../lib/database';
import { getLocalToday } from '../lib/constants';

const MEASUREMENT_FIELDS = [
  { key: 'weight_kgs', label: 'Weight', unit: 'kgs', color: '#c95f5f' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%', color: '#d4ba6a' },
  { key: 'chest_in', label: 'Chest', unit: 'in', color: '#5fa877' },
  { key: 'waist_in', label: 'Waist', unit: 'in', color: '#5a8ac9' },
  { key: 'hips_in', label: 'Hips', unit: 'in', color: '#9a73b5' },
  { key: 'left_arm_in', label: 'L Arm', unit: 'in', color: '#cf8a52' },
  { key: 'right_arm_in', label: 'R Arm', unit: 'in', color: '#b87845' },
  { key: 'left_thigh_in', label: 'L Thigh', unit: 'in', color: '#72b88a' },
  { key: 'right_thigh_in', label: 'R Thigh', unit: 'in', color: '#4c78b5' },
];

const emptyForm = {
  measured_at: getLocalToday(),
  weight_kgs: '',
  body_fat_pct: '',
  chest_in: '',
  waist_in: '',
  hips_in: '',
  left_arm_in: '',
  right_arm_in: '',
  left_thigh_in: '',
  right_thigh_in: '',
  notes: '',
};

export default function BodyComposition({ currentUser }) {
  const [measurements, setMeasurements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeChartField, setActiveChartField] = useState('weight_kgs');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadMeasurements();
  }, [currentUser?.id]);

  const loadMeasurements = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await db.getBodyMeasurements(currentUser.id);
      setMeasurements(data);
    } catch (err) {
      console.error('Error loading measurements:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      // Convert empty strings to null
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      if (editingId) {
        await db.updateBodyMeasurement(editingId, payload);
      } else {
        await db.createBodyMeasurement(currentUser.id, payload);
      }
      await loadMeasurements();
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (err) {
      alert('Error saving measurement: ' + err.message);
    }
    setSaving(false);
  };

  const handleEdit = (m) => {
    setForm({
      measured_at: m.measured_at,
      weight_kgs: m.weight_kgs ?? '',
      body_fat_pct: m.body_fat_pct ?? '',
      chest_in: m.chest_in ?? '',
      waist_in: m.waist_in ?? '',
      hips_in: m.hips_in ?? '',
      left_arm_in: m.left_arm_in ?? '',
      right_arm_in: m.right_arm_in ?? '',
      left_thigh_in: m.left_thigh_in ?? '',
      right_thigh_in: m.right_thigh_in ?? '',
      notes: m.notes ?? '',
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await db.deleteBodyMeasurement(id);
      await loadMeasurements();
      setDeleteConfirm(null);
    } catch (err) {
      alert('Error deleting measurement: ' + err.message);
    }
  };

  // Chart data
  const chartData = [...measurements]
    .reverse()
    .filter(m => m[activeChartField] != null)
    .map(m => ({
      date: format(parseISO(m.measured_at), 'MMM d'),
      value: parseFloat(m[activeChartField]),
      fullDate: format(parseISO(m.measured_at), 'MMM d, yyyy'),
    }));

  const activeFieldConfig = MEASUREMENT_FIELDS.find(f => f.key === activeChartField);

  // Latest vs previous change
  const getChange = (fieldKey) => {
    const withValue = measurements.filter(m => m[fieldKey] != null);
    if (withValue.length < 2) return null;
    const latest = parseFloat(withValue[0][fieldKey]);
    const prev = parseFloat(withValue[1][fieldKey]);
    if (isNaN(latest) || isNaN(prev) || prev === 0) return null;
    return {
      diff: latest - prev,
      pct: ((latest - prev) / prev) * 100,
    };
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-white text-sm font-semibold">{data.fullDate}</p>
        <p className="text-red-400 text-sm">
          {data.value} {activeFieldConfig?.unit}
        </p>
      </div>
    );
  };

  const latestMeasurement = measurements[0];

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Body Composition</h3>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              setEditingId(null);
              setForm({ ...emptyForm });
            }
          }}
          className="text-slate-400 hover:text-white p-1"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
          <h4 className="text-white text-sm font-semibold mb-3">
            {editingId ? 'Edit Measurement' : 'Log Measurement'}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Date</label>
              <input
                type="date"
                value={form.measured_at}
                onChange={(e) => setForm({ ...form, measured_at: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm border border-slate-500 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MEASUREMENT_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="block text-slate-400 text-xs mb-1">
                    {field.label} ({field.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="—"
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm border border-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Notes</label>
              <input
                type="text"
                placeholder="Optional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm border border-slate-500 focus:border-red-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save Measurement'}
            </button>
          </div>
        </div>
      )}

      {/* Latest Stats */}
      {latestMeasurement && !showForm && (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {MEASUREMENT_FIELDS.slice(0, 3).map(field => {
              const val = latestMeasurement[field.key];
              const change = getChange(field.key);
              if (val == null) return (
                <div key={field.key} className="bg-slate-700/50 rounded-xl p-3">
                  <div className="text-slate-500 text-xs">{field.label}</div>
                  <div className="text-slate-600 text-lg font-bold">—</div>
                </div>
              );
              return (
                <div key={field.key} className="bg-slate-700/50 rounded-xl p-3">
                  <div className="text-slate-400 text-xs">{field.label}</div>
                  <div className="text-white text-lg font-bold">
                    {parseFloat(val).toFixed(1)}
                    <span className="text-slate-500 text-xs ml-0.5">{field.unit}</span>
                  </div>
                  {change && (
                    <div className={`text-xs font-medium ${
                      // For weight/waist/hips, decrease = green. For arms/thighs, increase = green.
                      (field.key === 'waist_in' || field.key === 'body_fat_pct')
                        ? (change.diff < 0 ? 'text-green-400' : change.diff > 0 ? 'text-red-400' : 'text-slate-500')
                        : (change.diff > 0 ? 'text-green-400' : change.diff < 0 ? 'text-red-400' : 'text-slate-500')
                    }`}>
                      {change.diff > 0 ? '↑' : change.diff < 0 ? '↓' : '→'} {Math.abs(change.diff).toFixed(1)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-slate-500 text-xs">
            Last measured: {format(parseISO(latestMeasurement.measured_at), 'MMM d, yyyy')}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && !showForm && (
        <div className="mb-4">
          {/* Field selector */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {MEASUREMENT_FIELDS.filter(f => 
              measurements.some(m => m[f.key] != null)
            ).map(field => (
              <button
                key={field.key}
                onClick={() => setActiveChartField(field.key)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  activeChartField === field.key
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {field.label}
              </button>
            ))}
          </div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={activeFieldConfig?.color || '#c95f5f'}
                  strokeWidth={2}
                  dot={{ fill: activeFieldConfig?.color || '#c95f5f', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Measurement History */}
      {measurements.length > 0 && !showForm && (
        <>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-center gap-1 text-slate-400 hover:text-white text-sm py-2"
          >
            {showHistory ? (
              <>Hide History <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>View History ({measurements.length}) <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
          {showHistory && (
            <div className="space-y-2 mt-2">
              {measurements.map((m) => (
                <div key={m.id} className="bg-slate-700/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">
                      {format(parseISO(m.measured_at), 'MMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        Edit
                      </button>
                      {deleteConfirm === m.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-semibold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-slate-400 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(m.id)}
                          className="text-slate-500 hover:text-red-400 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {MEASUREMENT_FIELDS.filter(f => m[f.key] != null).map(field => (
                      <span key={field.key} className="text-slate-400">
                        {field.label}: <span className="text-white">{parseFloat(m[field.key]).toFixed(1)} {field.unit}</span>
                      </span>
                    ))}
                  </div>
                  {m.notes && (
                    <div className="text-slate-500 text-xs mt-1">{m.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {measurements.length === 0 && !loading && !showForm && (
        <div className="text-center py-6">
          <Scale className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No measurements logged yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-red-400 hover:text-red-300 text-sm mt-2"
          >
            Log your first measurement
          </button>
        </div>
      )}
    </div>
  );
}
