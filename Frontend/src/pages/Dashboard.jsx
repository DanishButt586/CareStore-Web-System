import React, { useEffect, useState } from 'react';
import { Truck, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { useMedicines } from '../context/MedicineContext';
import { medicineApi, reportApi } from '../api/services';

export default function Dashboard() {
  const [dailyData, setDailyData] = useState(null);
  const { medicines } = useMedicines();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    reportApi.daily()
      .then(res => setDailyData(res.data.metrics))
      .catch(err => console.error(err));

    medicineApi.alerts()
      .then(res => setAlerts(res.data))
      .catch(err => console.error(err));
  }, []);

  const totalRevenue = dailyData?.totalRevenue || 0;
  const salesCount = dailyData?.totalSalesCount || 0;
  const formatPKR = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 rounded-full bg-medical-light text-medical mr-4">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Today's Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatPKR(totalRevenue)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Daily Sales</p>
            <p className="text-2xl font-bold text-gray-900">{salesCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Medicine Lines</p>
            <p className="text-2xl font-bold text-gray-900">{medicines.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Alerts</p>
            <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-red-500" /> Action Required (Low Stock / Expiring)
        </h2>
        {alerts.length === 0 ? (
          <p className="text-gray-500 text-sm">All inventory checks out!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium">Medicine</th>
                  <th className="px-4 py-2 font-medium">Batch</th>
                  <th className="px-4 py-2 font-medium">Expiry Date</th>
                  <th className="px-4 py-2 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a._id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                    <td className="px-4 py-3">{a.batch_number}</td>
                    <td className={`px-4 py-3 ${new Date(a.expiry_date) < new Date() ? 'text-red-600 font-bold' : ''}`}>
                      {new Date(a.expiry_date).toLocaleDateString()}
                    </td>
                    <td className={`px-4 py-3 ${a.quantity <= a.low_stock_threshold ? 'text-yellow-600 font-bold' : ''}`}>
                      {a.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}