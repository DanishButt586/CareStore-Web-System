import React, { useState } from 'react';
import { useMedicines } from '../context/MedicineContext';
import { Search, Plus, AlertCircle, Edit, Trash2 } from 'lucide-react';

const emptyMedicineForm = {
  name: '',
  category: '',
  batch_number: '',
  expiry_date: '',
  price: 0,
  quantity: 0,
  low_stock_threshold: 10,
};

export default function Medicines() {
  const { medicines, loading, addMedicine, updateMedicine, deleteMedicine } = useMedicines();
  const formatPKR = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyMedicineForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    med.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (expiryDate) => new Date(expiryDate) < new Date();
  const isLowStock = (qty, threshold) => qty <= threshold;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      category: formData.category,
      batch_number: formData.batch_number,
      expiry_date: formData.expiry_date,
      price: Number(formData.price) || 0,
      quantity: Number(formData.quantity) || 0,
      low_stock_threshold: Number(formData.low_stock_threshold) || 0,
    };

    try {
      if (isEditing) {
        await updateMedicine(editId, payload);
      } else {
        await addMedicine(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert("Error saving medicine");
    }
  };

  const openEdit = (med) => {
    setFormData({
      name: med.name || '',
      category: med.category || '',
      batch_number: med.batch_number || '',
      expiry_date: new Date(med.expiry_date).toISOString().split('T')[0],
      price: Number(med.price || 0),
      quantity: Number(med.quantity || 0),
      low_stock_threshold: Number(med.low_stock_threshold || 0),
    });
    setEditId(med._id);
    setIsEditing(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyMedicineForm);
    setIsEditing(false);
    setEditId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Medicine Inventory</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-medical hover:bg-medical-dark"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Medicine
        </button>
      </div>

      <div className="flex items-center bg-white p-3 rounded-md shadow-sm border border-gray-200">
        <Search className="h-5 w-5 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search by name or batch..."
          className="flex-1 outline-none text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Batch', 'Expiry', 'Price', 'Qty', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMedicines.map((med) => {
                const expired = isExpired(med.expiry_date);
                const lowStock = isLowStock(med.quantity, med.low_stock_threshold);
                
                let rowColor = '';
                if (expired) rowColor = 'bg-red-50 hover:bg-red-100';
                else if (lowStock) rowColor = 'bg-yellow-50 hover:bg-yellow-100';
                else rowColor = 'hover:bg-gray-50';

                return (
                  <tr key={med._id} className={`${rowColor} transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        {med.name}
                        {(expired || lowStock) && (
                          <AlertCircle className={`ml-2 h-4 w-4 ${expired ? 'text-red-500' : 'text-yellow-600'}`} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.batch_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(med.expiry_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPKR(med.price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">{med.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                      <button onClick={() => openEdit(med)} className="text-medical hover:text-medical-dark"><Edit className="w-4 h-4"/></button>
                      <button onClick={() => deleteMedicine(med._id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMedicines.length === 0 && <div className="p-6 text-center text-gray-500">No medicines found.</div>}
        </div>
      )}

      {/* Modal - Extremely simple version */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">{isEditing ? 'Edit' : 'Add'} Medicine</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input type="text" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <input type="text" required value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <input type="date" required value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input type="number" min="0" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input type="number" min="0" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Threshold</label>
                  <input type="number" min="0" required value={formData.low_stock_threshold} onChange={e => setFormData({...formData, low_stock_threshold: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-medical text-white rounded-md text-sm font-medium hover:bg-medical-dark">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}