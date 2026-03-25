import React, { createContext, useContext, useState, useEffect } from 'react';
import { medicineApi } from '../api/services';
import { useAuth } from './AuthContext';

const MedicineContext = createContext();

export const useMedicines = () => useContext(MedicineContext);

export const MedicineProvider = ({ children }) => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const fetchMedicines = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await medicineApi.list();
      setMedicines(res.data);
    } catch (error) {
      console.error("Failed to fetch medicines", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [token]);

  const addMedicine = async (medicineData) => {
    const res = await medicineApi.create(medicineData);
    setMedicines((prev) => [...prev, res.data]);
    return res.data;
  };

  const updateMedicine = async (id, updatedData) => {
    const res = await medicineApi.update(id, updatedData);
    setMedicines((prev) => prev.map((m) => (m._id === id ? res.data : m)));
    return res.data;
  };

  const deleteMedicine = async (id) => {
    await medicineApi.remove(id);
    setMedicines((prev) => prev.filter((m) => m._id !== id));
  };
  
  // Also expose a function to deduct locally for quick UI update post-sale
  const deductStockLOCALLY = (cartItems) => {
    setMedicines(prev => prev.map(med => {
      const cartItem = cartItems.find(item => item.medicineId === med._id);
      if (cartItem) {
        return { ...med, quantity: med.quantity - cartItem.qty };
      }
      return med;
    }));
  };

  return (
    <MedicineContext.Provider value={{
      medicines,
      loading,
      fetchMedicines,
      addMedicine,
      updateMedicine,
      deleteMedicine,
      deductStockLOCALLY
    }}>
      {children}
    </MedicineContext.Provider>
  );
};