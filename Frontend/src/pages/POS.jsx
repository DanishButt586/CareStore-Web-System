import React, { useState, useRef } from 'react';
import { useMedicines } from '../context/MedicineContext';
import { useReactToPrint } from 'react-to-print';
import { ShoppingCart, Plus, Minus, Trash2, Printer } from 'lucide-react';
import { salesApi } from '../api/services';

export default function POS() {
  const PACK_SIZE_DEFAULT = 10;
  const MAX_VISIBLE_CART_ITEMS = 6;
  const CART_ITEM_ROW_HEIGHT = 72;
  const formatPKR = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

  const { medicines, deductStockLOCALLY } = useMedicines();
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [taxRate, setTaxRate] = useState(0.10); // 10%
  const [discountAmt, setDiscountAmt] = useState(0);
  const [search, setSearch] = useState('');
  const [invoiceResponse, setInvoiceResponse] = useState(null);
  const [modalState, setModalState] = useState({
    open: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
    hideCancel: false,
  });

  const receiptRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  const showModal = ({
    type = 'info',
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm = null,
    hideCancel = false,
  }) => {
    setModalState({
      open: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      hideCancel,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const availableMedicines = medicines.filter(
    (m) =>
      m.quantity > 0 &&
      new Date(m.expiry_date) >= new Date() &&
      m.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (med) => {
    const existing = cart.find((item) => item.medicineId === med._id);
    if (existing) {
      updateQty(med._id, 1);
      return;
    }

    setCart([
      ...cart,
      {
        medicineId: med._id,
        name: med.name,
        unitPrice: med.price,
        qty: 1,
        maxQtyUnits: med.quantity,
        saleType: 'tablet',
        packSize: PACK_SIZE_DEFAULT,
      },
    ]);
  };

  const getUnitPrice = (item) => item.saleType === 'packet' ? item.unitPrice * item.packSize : item.unitPrice;
  const getStockUnitsRequired = (item, qty = item.qty) => item.saleType === 'packet' ? qty * item.packSize : qty;
  const getLineTotal = (item) => getUnitPrice(item) * item.qty;

  const updateQty = (id, delta) => {
    setCart(
      cart
        .map((item) => {
          if (item.medicineId === id) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return { ...item, qty: 0 };
            const requiredUnits = getStockUnitsRequired(item, newQty);
            if (requiredUnits <= item.maxQtyUnits) return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((i) => i.qty > 0)
    );
  };

  const changeSaleType = (id, saleType) => {
    setCart(
      cart.map((item) => {
        if (item.medicineId !== id) return item;

        const next = { ...item, saleType };
        const requiredUnits = getStockUnitsRequired(next, next.qty);
        if (requiredUnits <= next.maxQtyUnits) return next;

        // Keep stock valid when switching from tablet to packet.
        const maxQtyForMode = saleType === 'packet'
          ? Math.max(1, Math.floor(next.maxQtyUnits / next.packSize))
          : next.maxQtyUnits;
        return { ...next, qty: Math.max(1, maxQtyForMode) };
      })
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.medicineId !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + getLineTotal(item), 0);
  const tax = subtotal * taxRate;
  const netAmount = subtotal + tax - discountAmt;
  const shouldEnableCartScroll = cart.length > MAX_VISIBLE_CART_ITEMS;
  const cartMaxHeight = `${MAX_VISIBLE_CART_ITEMS * CART_ITEM_ROW_HEIGHT}px`;

  const processCheckout = async () => {
    try {
      const payload = {
        customer_name: customerName || 'Guest',
        items: cart.map((i) => ({
          medicineId: i.medicineId,
          qty: getStockUnitsRequired(i),
          saleType: i.saleType,
          displayQty: i.qty,
          packSize: i.packSize,
        })),
        taxRate,
        discountAmt: Number(discountAmt)
      };

      const res = await salesApi.create(payload);
      setInvoiceResponse(res.data.invoice);
      deductStockLOCALLY(payload.items);
      setCart([]);
      setCustomerName('');
      setSearch('');
      showModal({
        type: 'success',
        title: 'Sale Completed',
        message: 'Sale completed successfully and invoice is ready for print.',
        confirmText: 'OK',
        hideCancel: true,
      });
    } catch (err) {
      showModal({
        type: 'error',
        title: 'Checkout Failed',
        message: err.response?.data?.message || 'Error processing sale',
        confirmText: 'Close',
        hideCancel: true,
      });
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      showModal({
        type: 'warning',
        title: 'Cart Is Empty',
        message: 'Please add at least one medicine before checkout.',
        confirmText: 'OK',
        hideCancel: true,
      });
      return;
    }

    showModal({
      type: 'confirm',
      title: 'Confirm Checkout',
      message: `Proceed with checkout for ${formatPKR(Math.max(0, netAmount))}?`,
      confirmText: 'Confirm & Continue',
      cancelText: 'Cancel',
      onConfirm: processCheckout,
    });
  };

  const handlePrintClick = () => {
    showModal({
      type: 'confirm',
      title: 'Print Invoice',
      message: 'Open print dialog for this invoice now?',
      confirmText: 'Print Now',
      cancelText: 'Not Now',
      onConfirm: () => handlePrint(),
    });
  };

  const onModalConfirm = async () => {
    const confirmAction = modalState.onConfirm;
    closeModal();
    if (typeof confirmAction === 'function') {
      await confirmAction();
    }
  };

  const renderModal = () => {
    if (!modalState.open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
        <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-xl">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">{modalState.title}</h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600">{modalState.message}</p>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
            {!modalState.hideCancel && (
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {modalState.cancelText}
              </button>
            )}
            <button
              onClick={onModalConfirm}
              className={`px-4 py-2 rounded-md text-white ${modalState.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-medical hover:bg-medical-dark'}`}
            >
              {modalState.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (invoiceResponse) {
    return (
      <div className="flex flex-col items-center space-y-6">
        <div 
          ref={receiptRef} 
          className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200"
        >
          <div className="text-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">CareStore Pharmacy</h2>
            <p className="text-sm text-gray-500">Receipt / Invoice</p>
            <p className="text-xs text-gray-400 mt-2">Bill No: {invoiceResponse.billNo}</p>
            <p className="text-xs text-gray-400 mt-2">Inv ID: {invoiceResponse.invoiceId}</p>
            <p className="text-xs text-gray-400">Date: {new Date(invoiceResponse.timestamp).toLocaleString()}</p>
          </div>
          
          <div className="mb-4 text-sm">
            <p><span className="font-semibold">Customer:</span> {invoiceResponse.customer}</p>
            <p><span className="font-semibold">Cashier:</span> {invoiceResponse.processedBy}</p>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceResponse.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-2">{item.name}</td>
                  <td className="text-center py-2">{item.qty} {item.saleType === 'packet' ? 'pkt' : 'tab'}</td>
                  <td className="text-right py-2">{formatPKR(item.price)}</td>
                  <td className="text-right py-2">{formatPKR(item.price * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-sm border-t pt-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatPKR(invoiceResponse.financials.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span>{formatPKR(invoiceResponse.financials.tax)}</span>
            </div>
            {invoiceResponse.financials.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatPKR(invoiceResponse.financials.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
              <span>Total:</span>
              <span>{formatPKR(invoiceResponse.financials.final_total)}</span>
            </div>
          </div>
          
          <div className="text-center mt-8 text-xs text-gray-400">
            Thank you for your business!
          </div>
        </div>
        
        <div className="flex gap-4">
          <button onClick={handlePrintClick} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" /> Print Receipt
          </button>
          <button onClick={() => setInvoiceResponse(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded shadow hover:bg-gray-300">
            New Sale
          </button>
        </div>

        {renderModal()}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Product Selection */}
      <div className="lg:col-span-2 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search medicine by name..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-medical focus:border-medical"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-max">
          {availableMedicines.map(med => (
            <div 
              key={med._id} 
              onClick={() => addToCart(med)}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-medical hover:bg-medical-light transition-colors flex flex-col justify-between"
            >
              <div>
                <h3 className="font-semibold text-gray-800 break-words">{med.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{med.category}</p>
              </div>
              <div className="mt-4 flex justify-between items-end">
                <span className="text-medical-dark font-bold">{formatPKR(med.price)} / tablet</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Stock: {med.quantity}</span>
              </div>
            </div>
          ))}
          {availableMedicines.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500">No available medicines found.</div>
          )}
        </div>
      </div>

      {/* Cart & Billing */}
      <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-8rem)] md:h-auto">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold flex items-center text-gray-800">
            <ShoppingCart className="w-5 h-5 mr-2 text-medical" /> Current Cart
          </h2>
          <span className="bg-medical text-white text-xs px-2 py-1 rounded-full">{cart.length} Items</span>
        </div>
        
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Customer Name (Optional)"
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-medical"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div
          className={`p-4 space-y-3 ${shouldEnableCartScroll ? 'overflow-y-auto' : 'overflow-y-visible'}`}
          style={{ maxHeight: shouldEnableCartScroll ? cartMaxHeight : 'none' }}
        >
          {cart.map(item => (
            <div key={item.medicineId} className="flex justify-between items-center p-3 border border-gray-100 rounded bg-gray-50">
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800 line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-500">{formatPKR(getUnitPrice(item))} x {item.qty} {item.saleType === 'packet' ? 'packet(s)' : 'tablet(s)'}</p>
                <div className="mt-2">
                  <select
                    value={item.saleType}
                    onChange={(e) => changeSaleType(item.medicineId, e.target.value)}
                    className="text-xs border rounded px-2 py-1 bg-white"
                  >
                    <option value="tablet">Tablet</option>
                    <option value="packet">Packet</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.medicineId, -1)} className="p-1 bg-white border rounded text-gray-600 hover:bg-gray-100"><Minus className="w-3 h-3"/></button>
                <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.medicineId, 1)} className="p-1 bg-white border rounded text-gray-600 hover:bg-gray-100"><Plus className="w-3 h-3"/></button>
                <button onClick={() => removeFromCart(item.medicineId)} className="p-1 ml-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Cart is empty
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatPKR(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Tax (%)</span>
            <input type="number" step="0.01" className="w-16 p-1 border rounded text-right" value={taxRate * 100} onChange={e => setTaxRate(Number(e.target.value)/100)} />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Discount (PKR)</span>
            <input type="number" step="0.01" className="w-16 p-1 border rounded text-right" value={discountAmt} onChange={e => setDiscountAmt(Number(e.target.value))} />
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Net Amount</span>
            <span className="text-medical-dark">{formatPKR(Math.max(0, netAmount))}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3 rounded-md font-bold text-white shadow-sm transition-colors mt-2 
              ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-medical hover:bg-medical-dark'}`}
          >
            Checkout & Print
          </button>
        </div>
      </div>

      {renderModal()}
    </div>
  );
}