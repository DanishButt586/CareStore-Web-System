import React, { useEffect, useMemo, useState } from 'react';
import { medicineApi, purchaseApi, supplierApi } from '../api/services';

const emptyLine = { medicineId: '', qty: 1, costPrice: 0 };

export default function Purchases() {
  const formatPKR = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [formData, setFormData] = useState({
    supplierId: '',
    invoiceNumber: '',
    items: [emptyLine],
  });

  const fetchData = async () => {
    setErrorText('');
    try {
      const [pRes, sRes, mRes] = await Promise.all([
        purchaseApi.list(),
        supplierApi.list(),
        medicineApi.list(),
      ]);
      setPurchases(pRes.data);
      setSuppliers(sRes.data);
      setMedicines(mRes.data);
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to load purchases');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalAmount = useMemo(
    () => formData.items.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.costPrice || 0), 0),
    [formData.items]
  );

  const setItem = (idx, patch) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  };

  const addItemRow = () => setFormData((prev) => ({ ...prev, items: [...prev.items, emptyLine] }));
  const removeItemRow = (idx) => setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await purchaseApi.create({
        supplierId: formData.supplierId,
        invoiceNumber: formData.invoiceNumber,
        items: formData.items.map((i) => ({
          medicineId: i.medicineId,
          qty: Number(i.qty),
          costPrice: Number(i.costPrice),
        })),
      });
      setFormData({ supplierId: '', invoiceNumber: '', items: [emptyLine] });
      fetchData();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to save purchase');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="border rounded-md p-2" value={formData.supplierId} onChange={(e) => setFormData((p) => ({ ...p, supplierId: e.target.value }))} required>
            <option value="">Select supplier</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input className="border rounded-md p-2" placeholder="Invoice number" value={formData.invoiceNumber} onChange={(e) => setFormData((p) => ({ ...p, invoiceNumber: e.target.value }))} required />
          <div className="border rounded-md p-2 bg-gray-50 text-sm">Total: <span className="font-bold">{formatPKR(totalAmount)}</span></div>
        </div>

        <div className="space-y-2">
          {formData.items.map((line, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="border rounded-md p-2" value={line.medicineId} onChange={(e) => setItem(idx, { medicineId: e.target.value })} required>
                <option value="">Select medicine</option>
                {medicines.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
              <input type="number" min={1} className="border rounded-md p-2" placeholder="Qty" value={line.qty} onChange={(e) => setItem(idx, { qty: e.target.value })} required />
              <input type="number" min={0} step="0.01" className="border rounded-md p-2" placeholder="Cost price" value={line.costPrice} onChange={(e) => setItem(idx, { costPrice: e.target.value })} required />
              <div className="flex gap-2">
                <button type="button" onClick={addItemRow} className="px-3 py-2 border rounded-md">Add Line</button>
                {formData.items.length > 1 && <button type="button" onClick={() => removeItemRow(idx)} className="px-3 py-2 border rounded-md text-red-600">Remove</button>}
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="px-4 py-2 bg-medical text-white rounded-md hover:bg-medical-dark">Record Purchase</button>
      </form>

      {errorText && <p className="text-red-600 text-sm">{errorText}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Invoice</th>
              <th className="text-left px-4 py-3">Supplier</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-left px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p._id} className="border-t">
                <td className="px-4 py-3">{new Date(p.purchasedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium">{p.invoiceNumber}</td>
                <td className="px-4 py-3">{p.supplierId?.name || '-'}</td>
                <td className="px-4 py-3">{p.items?.length || 0}</td>
                <td className="px-4 py-3 font-semibold">{formatPKR(p.total_amount)}</td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No purchases found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
