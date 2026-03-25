import React, { useEffect, useState } from 'react';
import { customerApi } from '../api/services';

const emptyCustomer = { name: '', phone: '', email: '', address: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyCustomer);
  const [editingId, setEditingId] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const res = await customerApi.list();
      setCustomers(res.data);
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await customerApi.update(editingId, formData);
      } else {
        await customerApi.create(formData);
      }
      setFormData(emptyCustomer);
      setEditingId(null);
      fetchCustomers();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to save customer');
    }
  };

  const onEdit = (c) => {
    setEditingId(c._id);
    setFormData({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await customerApi.remove(id);
      fetchCustomers();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to delete customer');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="border rounded-md p-2" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        <input className="border rounded-md p-2" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
        <input className="border rounded-md p-2" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        <input className="border rounded-md p-2" placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-md bg-medical text-white hover:bg-medical-dark">{editingId ? 'Update' : 'Add'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData(emptyCustomer); }} className="px-4 py-2 rounded-md border">Cancel</button>}
        </div>
      </form>

      {errorText && <p className="text-red-600 text-sm">{errorText}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Address</th>
              <th className="text-left px-4 py-3">Purchases</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>}
            {!loading && customers.map((c) => (
              <tr key={c._id} className="border-t">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.email || '-'}</td>
                <td className="px-4 py-3">{c.address || '-'}</td>
                <td className="px-4 py-3">{c.purchase_history?.length || 0}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-blue-600" onClick={() => onEdit(c)}>Edit</button>
                  <button className="text-red-600" onClick={() => onDelete(c._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No customers found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
