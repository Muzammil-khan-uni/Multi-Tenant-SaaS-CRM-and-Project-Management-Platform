import { useState } from 'react';
import axios from '../api/axios';

export const useInvoiceStats = () => {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    paidInvoices: 0,
    sentInvoices: 0,
    draftInvoices: 0,
    overdueInvoices: 0,
    cancelledInvoices: 0,
    totalRevenueUSD: 0,
    totalOutstandingUSD: 0,
    totalPaidUSD: 0,
    paymentRate: 0,
    currencyTotals: {},
  });
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/invoices/stats');
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch invoice stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    setInitialized(true);
    fetchStats();
  }

  return { stats, loading, refetch: fetchStats };
};
