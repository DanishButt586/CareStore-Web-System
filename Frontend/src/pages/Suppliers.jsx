import React, { useEffect, useState } from 'react';
import { supplierApi } from '../api/services';

const emptySupplier = { name: '', contact: '', address: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [formData, setFormData] = useState(emptySupplier);
  const [editingId, setEditingId] = useState(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const res = await supplierApi.list();
      setSuppliers(res.data);
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await supplierApi.update(editingId, formData);
      } else {
        await supplierApi.create(formData);
      }
      setFormData(emptySupplier);
      setEditingId(null);
      fetchSuppliers();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to save supplier');
    }
  };

  const onEdit = (s) => {
    setEditingId(s._id);
    setFormData({ name: s.name, contact: s.contact, address: s.address });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await supplierApi.remove(id);
      fetchSuppliers();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="border rounded-md p-2" placeholder="Supplier name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        <input className="border rounded-md p-2" placeholder="Contact" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />
        <input className="border rounded-md p-2" placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-md bg-medical text-white hover:bg-medical-dark">{editingId ? 'Update' : 'Add'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData(emptySupplier); }} className="px-4 py-2 rounded-md border">Cancel</button>}
        </div>
      </form>

      {errorText && <p className="text-red-600 text-sm">{errorText}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-left px-4 py-3">Address</th>
              <th className="text-left px-4 py-3">Transactions</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
            )}
            {!loading && suppliers.map((s) => (
              <tr key={s._id} className="border-t">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.contact}</td>
                <td className="px-4 py-3">{s.address}</td>
                <td className="px-4 py-3">{s.transaction_history?.length || 0}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-blue-600" onClick={() => onEdit(s)}>Edit</button>
                  <button className="text-red-600" onClick={() => onDelete(s._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && suppliers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No suppliers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
