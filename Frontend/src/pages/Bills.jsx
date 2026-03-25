import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { medicineApi, salesApi } from '../api/services';

export default function Bills() {
  const formatPKR = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
  const defaultBillFilters = { from: '', to: '', minTotal: '', maxTotal: '' };
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [billFilters, setBillFilters] = useState(defaultBillFilters);
  const [selectedBill, setSelectedBill] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [isMedicinesLoading, setIsMedicinesLoading] = useState(false);
  const [addLine, setAddLine] = useState({ medicineId: '', saleType: 'tablet', packSize: 10, displayQty: 1 });
  const billPrintRef = useRef(null);

  const handlePrintBill = useReactToPrint({
    content: () => billPrintRef.current,
  });

  const fetchBills = async () => {
    try {
      setErrorText('');
      const res = await salesApi.list();
      setBills(res.data || []);
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to load bills');
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchMedicineOptions = async () => {
    try {
      setIsMedicinesLoading(true);
      const res = await medicineApi.list();
      const options = (res.data || []).filter((medicine) => (
        Number(medicine.quantity || 0) > 0 && new Date(medicine.expiry_date) >= new Date()
      ));
      setAvailableMedicines(options);
    } catch (_error) {
      setAvailableMedicines([]);
    } finally {
      setIsMedicinesLoading(false);
    }
  };

  const filteredBills = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const fromDate = billFilters.from ? new Date(`${billFilters.from}T00:00:00`) : null;
    const toDate = billFilters.to ? new Date(`${billFilters.to}T23:59:59.999`) : null;
    const minTotal = billFilters.minTotal !== '' ? Number(billFilters.minTotal) : null;
    const maxTotal = billFilters.maxTotal !== '' ? Number(billFilters.maxTotal) : null;

    return bills.filter((bill) => {
      const billDate = new Date(bill.timestamp || bill.createdAt);
      const total = Number(bill.total_amount || 0);

      const billNo = bill.bill_no?.toLowerCase() || '';
      const customer = bill.customer_name?.toLowerCase() || '';
      const id = String(bill._id || '').toLowerCase();

      const matchesSearch = !needle || billNo.includes(needle) || customer.includes(needle) || id.includes(needle);
      const matchesFrom = !fromDate || billDate >= fromDate;
      const matchesTo = !toDate || billDate <= toDate;
      const matchesMinTotal = minTotal === null || total >= minTotal;
      const matchesMaxTotal = maxTotal === null || total <= maxTotal;

      return matchesSearch && matchesFrom && matchesTo && matchesMinTotal && matchesMaxTotal;
    });
  }, [bills, search, billFilters]);

  const buildEditForm = (bill) => {
    const subtotal = (bill.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    const taxRate = subtotal > 0 ? Number(bill.tax || 0) / subtotal : 0.1;

    return {
      customer_name: bill.customer_name || 'Guest',
      taxRate,
      discountAmt: Number(bill.discount || 0),
      items: (bill.items || []).map((item) => ({
        medicineId: item.medicineId?._id || item.medicineId,
        name: item.name || item.medicineId?.name || 'Medicine',
        saleType: item.saleType || 'tablet',
        packSize: Number(item.packSize || 1),
        displayQty: Number(item.qty || 1),
        unitPrice: item.saleType === 'packet'
          ? Number(item.price || 0) / Math.max(1, Number(item.packSize || 1))
          : Number(item.price || 0),
      })),
    };
  };

  const closeDialog = () => {
    setSelectedBill(null);
    setIsEditing(false);
    setEditForm(null);
  };

  const openBill = (bill) => {
    setSelectedBill(bill);
    setEditForm(buildEditForm(bill));
    setIsEditing(false);
    setErrorText('');
    setStatusText('');
  };

  const startEdit = () => {
    if (!selectedBill) return;
    setEditForm(buildEditForm(selectedBill));
    setIsEditing(true);
    setErrorText('');
    setAddLine({ medicineId: '', saleType: 'tablet', packSize: 10, displayQty: 1 });
    fetchMedicineOptions();
  };

  const cancelEdit = () => {
    if (selectedBill) {
      setEditForm(buildEditForm(selectedBill));
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedBill || !editForm) return;

    try {
      setErrorText('');
      const payload = {
        customer_name: editForm.customer_name,
        taxRate: Number(editForm.taxRate),
        discountAmt: Number(editForm.discountAmt),
        items: editForm.items.map((item) => {
          const displayQty = Math.max(1, Number(item.displayQty) || 1);
          const packSize = Math.max(1, Number(item.packSize) || 1);
          const qty = item.saleType === 'packet' ? displayQty * packSize : displayQty;

          return {
            medicineId: item.medicineId,
            qty,
            saleType: item.saleType,
            displayQty,
            packSize,
          };
        }),
      };

      const res = await salesApi.update(selectedBill._id, payload);
      setStatusText('Bill updated successfully');
      setSelectedBill(res.data.sale);
      setEditForm(buildEditForm(res.data.sale));
      setIsEditing(false);
      await fetchBills();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to update bill');
    }
  };

  const handleDeleteBill = async () => {
    if (!selectedBill) return;
    if (!window.confirm('Delete this bill and restore medicine stock?')) return;

    try {
      setErrorText('');
      await salesApi.remove(selectedBill._id);
      setStatusText('Bill deleted successfully');
      closeDialog();
      await fetchBills();
    } catch (error) {
      setErrorText(error?.response?.data?.message || 'Failed to delete bill');
    }
  };

  const selectedSubtotal = selectedBill
    ? (selectedBill.total_amount || 0) - (selectedBill.tax || 0) + (selectedBill.discount || 0)
    : 0;

  const getLineUnitPrice = (item) => (
    item.saleType === 'packet'
      ? Number(item.unitPrice || 0) * Math.max(1, Number(item.packSize || 1))
      : Number(item.unitPrice || 0)
  );

  const addMedicineToEditForm = () => {
    if (!editForm || !addLine.medicineId) return;

    const medicine = availableMedicines.find((option) => option._id === addLine.medicineId);
    if (!medicine) return;

    const saleType = addLine.saleType === 'packet' ? 'packet' : 'tablet';
    const packSize = saleType === 'packet' ? Math.max(1, Number(addLine.packSize) || 10) : 1;
    const displayQty = Math.max(1, Number(addLine.displayQty) || 1);

    setEditForm((current) => {
      const existingIndex = current.items.findIndex((item) => (
        String(item.medicineId) === String(medicine._id)
        && item.saleType === saleType
        && Number(item.packSize || 1) === packSize
      ));

      if (existingIndex >= 0) {
        return {
          ...current,
          items: current.items.map((item, index) => (
            index === existingIndex
              ? { ...item, displayQty: Number(item.displayQty || 0) + displayQty }
              : item
          )),
        };
      }

      return {
        ...current,
        items: [
          ...current.items,
          {
            medicineId: medicine._id,
            name: medicine.name,
            saleType,
            packSize,
            displayQty,
            unitPrice: Number(medicine.price || 0),
          },
        ],
      };
    });

    setAddLine({ medicineId: '', saleType: 'tablet', packSize: 10, displayQty: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Past Bills</h1>
        <button
          onClick={fetchBills}
          className="px-4 py-2 bg-medical text-white rounded-md hover:bg-medical-dark"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by bill no, customer, or id"
            className="border rounded-md p-2 lg:col-span-2"
          />

          <input
            type="date"
            value={billFilters.from}
            onChange={(e) => setBillFilters((current) => ({ ...current, from: e.target.value }))}
            className="border rounded-md p-2"
          />

          <input
            type="date"
            value={billFilters.to}
            onChange={(e) => setBillFilters((current) => ({ ...current, to: e.target.value }))}
            className="border rounded-md p-2"
          />

          <button
            onClick={() => {
              setSearch('');
              setBillFilters(defaultBillFilters);
            }}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={billFilters.minTotal}
            onChange={(e) => setBillFilters((current) => ({ ...current, minTotal: e.target.value }))}
            placeholder="Minimum total amount"
            className="border rounded-md p-2"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            value={billFilters.maxTotal}
            onChange={(e) => setBillFilters((current) => ({ ...current, maxTotal: e.target.value }))}
            placeholder="Maximum total amount"
            className="border rounded-md p-2"
          />
        </div>
      </div>

      {errorText && <p className="text-red-600 text-sm">{errorText}</p>}
      {statusText && <p className="text-green-700 text-sm">{statusText}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Bill No</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map((bill) => (
              <tr key={bill._id} className="border-t">
                <td className="px-4 py-3">{new Date(bill.timestamp || bill.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{bill.bill_no || '-'}</td>
                <td className="px-4 py-3">{bill.customer_name || 'Guest'}</td>
                <td className="px-4 py-3">{bill.items?.length || 0}</td>
                <td className="px-4 py-3 font-semibold">{formatPKR(bill.total_amount)}</td>
                <td className="px-4 py-3">
                  <button
                    className="px-3 py-1 border rounded-md text-xs hover:bg-gray-50"
                    onClick={() => openBill(bill)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {filteredBills.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No bills found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center" onClick={closeDialog}>
          <div
            className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Bill details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Bill Details</h2>
                <p className="text-xs text-gray-500">Review complete receipt information</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {!isEditing && (
                  <button onClick={handlePrintBill} className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100">
                    Print Bill
                  </button>
                )}
                {!isEditing && (
                  <button onClick={startEdit} className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100">
                    Edit Bill
                  </button>
                )}
                <button onClick={handleDeleteBill} className="px-3 py-1 text-sm border rounded-md text-red-600 hover:bg-red-50">
                  Delete Bill
                </button>
                <button onClick={closeDialog} className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100">
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              {isEditing && editForm ? (
                <form className="space-y-4" onSubmit={handleSaveEdit}>
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <p className="text-sm font-medium text-gray-800">Add item to bill</p>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <select
                        className="border rounded-md p-2 text-sm md:col-span-2"
                        value={addLine.medicineId}
                        onChange={(e) => setAddLine((current) => ({ ...current, medicineId: e.target.value }))}
                      >
                        <option value="">Select medicine...</option>
                        {availableMedicines.map((medicine) => (
                          <option key={medicine._id} value={medicine._id}>
                            {medicine.name} (Stock: {medicine.quantity})
                          </option>
                        ))}
                      </select>

                      <select
                        className="border rounded-md p-2 text-sm"
                        value={addLine.saleType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setAddLine((current) => ({
                            ...current,
                            saleType: nextType,
                            packSize: nextType === 'packet' ? Math.max(1, Number(current.packSize) || 10) : 1,
                          }));
                        }}
                      >
                        <option value="tablet">Tablet</option>
                        <option value="packet">Packet</option>
                      </select>

                      <input
                        type="number"
                        min="1"
                        className="border rounded-md p-2 text-sm"
                        disabled={addLine.saleType !== 'packet'}
                        value={addLine.saleType === 'packet' ? addLine.packSize : 1}
                        onChange={(e) => setAddLine((current) => ({ ...current, packSize: Number(e.target.value) || 1 }))}
                        placeholder="Pack size"
                      />

                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          className="border rounded-md p-2 text-sm w-full"
                          value={addLine.displayQty}
                          onChange={(e) => setAddLine((current) => ({ ...current, displayQty: Number(e.target.value) || 1 }))}
                          placeholder="Qty"
                        />
                        <button
                          type="button"
                          onClick={addMedicineToEditForm}
                          disabled={!addLine.medicineId || isMedicinesLoading}
                          className="px-3 py-2 bg-medical text-white rounded-md text-sm disabled:bg-gray-300"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {isMedicinesLoading && <p className="text-xs text-gray-500">Loading medicines...</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Customer</p>
                      <input
                        className="w-full border rounded-md p-2 text-sm"
                        value={editForm.customer_name}
                        onChange={(e) => setEditForm((current) => ({ ...current, customer_name: e.target.value }))}
                      />
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Tax Rate (%)</p>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border rounded-md p-2 text-sm"
                        value={Number(editForm.taxRate || 0) * 100}
                        onChange={(e) => setEditForm((current) => ({ ...current, taxRate: Number(e.target.value) / 100 }))}
                      />
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Discount</p>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border rounded-md p-2 text-sm"
                        value={editForm.discountAmt}
                        onChange={(e) => setEditForm((current) => ({ ...current, discountAmt: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-4 py-3">Medicine</th>
                          <th className="text-left px-4 py-3">Type</th>
                          <th className="text-left px-4 py-3">Qty</th>
                          <th className="text-left px-4 py-3">Pack Size</th>
                          <th className="text-left px-4 py-3">Line Total</th>
                          <th className="text-left px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editForm.items.map((item, index) => (
                          <tr key={`${item.medicineId}-${index}`} className="border-t">
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 capitalize">{item.saleType}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                className="w-24 border rounded-md p-2 text-sm"
                                value={item.displayQty}
                                onChange={(e) => setEditForm((current) => ({
                                  ...current,
                                  items: current.items.map((row, rowIndex) => (
                                    rowIndex === index ? { ...row, displayQty: Number(e.target.value) } : row
                                  )),
                                }))}
                              />
                            </td>
                            <td className="px-4 py-3">{item.packSize}</td>
                            <td className="px-4 py-3">{formatPKR(Number(item.displayQty || 0) * getLineUnitPrice(item))}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setEditForm((current) => ({
                                  ...current,
                                  items: current.items.filter((_, rowIndex) => rowIndex !== index),
                                }))}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                        {editForm.items.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-5 text-center text-gray-500">At least one line item is required</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={cancelEdit} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={editForm.items.length === 0} className="px-4 py-2 bg-medical text-white rounded-md hover:bg-medical-dark disabled:bg-gray-300">
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div ref={billPrintRef}>
                  <div className="text-center border rounded-lg p-4 bg-white">
                    <h3 className="text-xl font-bold text-gray-900">CareStore Pharmacy</h3>
                    <p className="text-sm text-gray-500">Receipt / Invoice</p>
                    <p className="text-xs text-gray-500 mt-2">Bill No: {selectedBill.bill_no || '-'}</p>
                    <p className="text-xs text-gray-500">Invoice ID: {selectedBill._id}</p>
                    <p className="text-xs text-gray-500">
                      Date: {new Date(selectedBill.timestamp || selectedBill.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="border rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Customer</p>
                      <p className="font-semibold text-gray-800">{selectedBill.customer_name || 'Guest'}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Processed By</p>
                      <p className="font-semibold text-gray-800">{selectedBill.processedBy?.username || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-4 py-3">Medicine</th>
                          <th className="text-left px-4 py-3">Type</th>
                          <th className="text-left px-4 py-3">Qty</th>
                          <th className="text-left px-4 py-3">Price</th>
                          <th className="text-left px-4 py-3">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedBill.items || []).map((item, idx) => (
                          <tr key={`${selectedBill._id}-${idx}`} className="border-t">
                            <td className="px-4 py-3">{item.name || item.medicineId?.name || 'Medicine'}</td>
                            <td className="px-4 py-3 capitalize">{item.saleType || 'tablet'}</td>
                            <td className="px-4 py-3">{item.qty}</td>
                            <td className="px-4 py-3">{formatPKR(item.price)}</td>
                            <td className="px-4 py-3 font-medium">{formatPKR(Number(item.qty || 0) * Number(item.price || 0))}</td>
                          </tr>
                        ))}
                        {(selectedBill.items || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-5 text-center text-gray-500">No item details available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{formatPKR(selectedSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">{formatPKR(selectedBill.tax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium">{formatPKR(selectedBill.discount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-base">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-medical-dark">{formatPKR(selectedBill.total_amount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
