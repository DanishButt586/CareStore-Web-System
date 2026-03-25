import React, { useEffect, useState } from 'react';
import { logsApi } from '../api/services';

const defaultFilters = {
  search: '',
  category: '',
  role: '',
  from: '',
  to: '',
};

const toTitle = (value = '') =>
  String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

const formatLegacyAction = (action = '') => {
  const match = String(action).match(/^(POST|PUT|PATCH|DELETE)\s+\/api\/([^\s]+)$/i);
  if (!match) return action;

  const method = match[1].toUpperCase();
  const resource = match[2].split('/')[0] || 'record';
  const verb = method === 'POST' ? 'Created' : method === 'DELETE' ? 'Deleted' : 'Updated';
  const singularResource = resource.endsWith('s') ? resource.slice(0, -1) : resource;
  return `${verb} ${toTitle(singularResource)}`;
};

const humanizeField = (field = '') => toTitle(String(field).replace(/_id$/i, '').replace(/_number$/i, ''));

const joinWords = (items = []) => {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const formatDetails = (log = {}) => {
  const details = log.details || {};
  const payload = details.payloadPreview || details.payload || {};

  const itemName = payload.name || payload.username || payload.customer_name || payload.supplier_name || '';

  const changedFields = Array.isArray(details.changedFields) ? details.changedFields : [];

  const visibleFields = changedFields
    .filter((field) => !['password', 'token', 'accessToken', 'refreshToken'].includes(field))
    .map((field) => humanizeField(field));

  const readableAction = formatLegacyAction(log.action || 'Updated Record');
  const subject = itemName ? ` ${itemName}` : '';

  const fieldChanges = details.fieldChanges && typeof details.fieldChanges === 'object'
    ? details.fieldChanges
    : null;

  if (fieldChanges && Object.keys(fieldChanges).length > 0) {
    const entries = Object.entries(fieldChanges)
      .filter(([field]) => !['password', 'token', 'accessToken', 'refreshToken'].includes(field))
      .map(([field, values]) => {
        const previous = formatValue(values?.previous);
        const next = formatValue(values?.next);
        return `${humanizeField(field)}: ${previous} -> ${next}`;
      });

    if (entries.length > 0) {
      return `${readableAction}${subject}. ${entries.join(' | ')}`;
    }
  }

  if (visibleFields.length === 0) {
    return `${readableAction}${subject}.`;
  }

  return `${readableAction}${subject}. Changed ${joinWords(visibleFields)}.`;
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setErrorText('');
      const params = { limit: 100 };

      Object.entries(activeFilters).forEach(([key, value]) => {
        if (String(value || '').trim()) {
          params[key] = value;
        }
      });

      const res = await logsApi.list(params);
      setLogs(res.data?.items || []);
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
        <button
          onClick={() => fetchLogs()}
          className="px-4 py-2 bg-medical text-white rounded-md hover:bg-medical-dark"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input
            value={filters.search}
            onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
            placeholder="Search"
            className="border rounded-md p-2"
          />

          <select
            value={filters.category}
            onChange={(e) => setFilters((current) => ({ ...current, category: e.target.value }))}
            className="border rounded-md p-2"
          >
            <option value="">All Categories</option>
            <option value="auth">Auth</option>
            <option value="change">Change</option>
          </select>

          <select
            value={filters.role}
            onChange={(e) => setFilters((current) => ({ ...current, role: e.target.value }))}
            className="border rounded-md p-2"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="guest">Guest</option>
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((current) => ({ ...current, from: e.target.value }))}
            className="border rounded-md p-2"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((current) => ({ ...current, to: e.target.value }))}
            className="border rounded-md p-2"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilters(defaultFilters);
            }}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {errorText && <p className="text-red-600 text-sm">{errorText}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Time</th>
              <th className="text-left px-4 py-3">Actor</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Action</th>
              <th className="text-left px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id} className="border-t">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{log.actor?.username || 'guest'}</td>
                <td className="px-4 py-3 capitalize">{log.actor?.role || 'guest'}</td>
                <td className="px-4 py-3 capitalize">{log.category || '-'}</td>
                <td className="px-4 py-3">{formatLegacyAction(log.action)}</td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-[360px] whitespace-pre-wrap break-words">{formatDetails(log)}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No logs found</td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading logs...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Logs are auto-generated and immutable. No delete action is available.</p>
    </div>
  );
}