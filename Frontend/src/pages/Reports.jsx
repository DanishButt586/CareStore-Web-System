import React, { useEffect, useState } from 'react';
import { reportApi } from '../api/services';

export default function Reports() {
  const formatPKR = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [stock, setStock] = useState(null);
  const [expiry, setExpiry] = useState(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const load = async () => {
      setErrorText('');
      try {
        const [d, m, s, e] = await Promise.all([
          reportApi.daily(),
          reportApi.monthly(),
          reportApi.stock(),
          reportApi.expiry(),
        ]);
        setDaily(d.data);
        setMonthly(m.data);
        setStock(s.data);
        setExpiry(e.data);
      } catch (error) {
        setErrorText(error?.response?.data?.message || 'Failed to load reports');
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      {errorText && <p className="text-red-600 text-sm">{errorText}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border"><p className="text-xs text-gray-500">Daily Revenue</p><p className="text-2xl font-bold">{formatPKR(daily?.metrics?.totalRevenue)}</p></div>
        <div className="bg-white p-4 rounded-lg border"><p className="text-xs text-gray-500">Daily Sales</p><p className="text-2xl font-bold">{daily?.metrics?.totalSalesCount || 0}</p></div>
        <div className="bg-white p-4 rounded-lg border"><p className="text-xs text-gray-500">Monthly Revenue</p><p className="text-2xl font-bold">{formatPKR(monthly?.summary?.totalRevenue)}</p></div>
        <div className="bg-white p-4 rounded-lg border"><p className="text-xs text-gray-500">Total Stock Value</p><p className="text-2xl font-bold">{formatPKR(stock?.summary?.totalValueAll)}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Stock by Category</div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left px-4 py-2">Category</th><th className="text-left px-4 py-2">Qty</th><th className="text-left px-4 py-2">Value</th></tr></thead>
            <tbody>
              {(stock?.categories || []).map((c) => (
                <tr key={c._id} className="border-t"><td className="px-4 py-2">{c._id}</td><td className="px-4 py-2">{c.totalQuantity}</td><td className="px-4 py-2">{formatPKR(c.totalValue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Expiry Report</div>
          <div className="px-4 py-3 text-sm text-gray-700">Expired: <span className="font-bold text-red-600">{expiry?.summary?.expiredCount || 0}</span> | Near Expiry (30d): <span className="font-bold text-yellow-600">{expiry?.summary?.nearExpiryCount || 0}</span></div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left px-4 py-2">Medicine</th><th className="text-left px-4 py-2">Batch</th><th className="text-left px-4 py-2">Expiry</th></tr></thead>
            <tbody>
              {(expiry?.nearExpiry || []).map((m) => (
                <tr key={m._id} className="border-t"><td className="px-4 py-2">{m.name}</td><td className="px-4 py-2">{m.batch_number}</td><td className="px-4 py-2">{new Date(m.expiry_date).toLocaleDateString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
