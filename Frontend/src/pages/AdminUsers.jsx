import React, { useEffect, useState } from 'react';
import { userApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { APP_SECTIONS, getDefaultPermissions, normalizePermissions } from '../constants/appSections';

const emptyUser = { username: '', password: '', role: 'staff', permissions: [] };

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [formData, setFormData] = useState(emptyUser);
  const [editingId, setEditingId] = useState(null);
  const [statusText, setStatusText] = useState('');

  const isAdmin = user?.role === 'admin';
  const isLockedUser = (u) => {
    const username = String(u?.username || '').toLowerCase();
    return Boolean(u?.isLocked) || (u?.role === 'admin' && (username === 'admin' || username === 'Admin'.toLowerCase()));
  };

  const fetchUsers = async () => {
    try {
      const res = await userApi.list();
      setUsers(res.data);
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to load users');
    }
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const permissions = formData.role === 'admin'
        ? getDefaultPermissions('admin')
        : normalizePermissions(formData.permissions);

      if (editingId) {
        const payload = {
          username: formData.username,
          role: formData.role,
          permissions,
        };
        if (formData.password) payload.password = formData.password;
        await userApi.update(editingId, payload);
      } else {
        await userApi.create({ ...formData, permissions });
      }
      setFormData(emptyUser);
      setEditingId(null);
      setStatusText('User permissions saved successfully');
      fetchUsers();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to save user');
    }
  };

  const onEdit = (u) => {
    setEditingId(u._id);
    setFormData({
      username: u.username,
      password: '',
      role: u.role,
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await userApi.remove(id);
      fetchUsers();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to delete user');
    }
  };

  if (!isAdmin) {
    return <p className="text-sm text-red-600">Only admin can manage users.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin - User Management</h1>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="border rounded-md p-2" placeholder="Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
          <input className="border rounded-md p-2" placeholder={editingId ? 'New password (optional)' : 'Password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingId} />
          <select className="border rounded-md p-2" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-md bg-medical text-white hover:bg-medical-dark">{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" className="px-4 py-2 rounded-md border" onClick={() => { setEditingId(null); setFormData(emptyUser); }}>Cancel</button>}
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="font-medium text-gray-900">Section permissions</p>
              <p className="text-xs text-gray-500">Choose which sections this staff member can see.</p>
            </div>
            {formData.role === 'admin' && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Admin has full access</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {APP_SECTIONS.map((section) => {
              const checked = formData.role === 'admin' || formData.permissions.includes(section.key);
              return (
                <label key={section.key} className="flex items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={formData.role === 'admin'}
                    onChange={(e) => {
                      setFormData((current) => {
                        const nextPermissions = e.target.checked
                          ? [...current.permissions, section.key]
                          : current.permissions.filter((permission) => permission !== section.key);
                        return { ...current, permissions: nextPermissions };
                      });
                    }}
                  />
                  <span>{section.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </form>

      {errorText && <p className="text-red-600 text-sm">{errorText}</p>}
      {statusText && <p className="text-green-700 text-sm">{statusText}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">Username</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Permissions</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{u.username}</span>
                    {isLockedUser(u) && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Locked</span>}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(u.role === 'admin' ? APP_SECTIONS : APP_SECTIONS.filter((section) => (u.permissions || []).includes(section.key))).map((section) => (
                      <span key={section.key} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {section.label}
                      </span>
                    ))}
                    {u.role !== 'admin' && (!u.permissions || u.permissions.length === 0) && (
                      <span className="text-xs text-gray-500">No sections assigned</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed" onClick={() => onEdit(u)} disabled={isLockedUser(u)}>Edit</button>
                  <button className="text-red-600 disabled:text-gray-400 disabled:cursor-not-allowed" onClick={() => onDelete(u._id)} disabled={isLockedUser(u)}>Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
