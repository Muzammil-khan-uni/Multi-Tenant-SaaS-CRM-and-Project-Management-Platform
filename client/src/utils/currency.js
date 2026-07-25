const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', locale: 'en-GB' },
  PKR: { symbol: '₨', code: 'PKR', name: 'Pakistani Rupee', locale: 'ur-PK' },
};

export const getCurrencyInfo = (code) => {
  return CURRENCIES[code] || CURRENCIES.USD;
};

export const getCurrencySymbol = (code) => {
  return CURRENCIES[code]?.symbol || code || '$';
};

export const formatCurrency = (amount, currency = 'USD', options = {}) => {
  const { showSymbol = true, showCode = false, compact = false } = options;
  const currencyInfo = getCurrencyInfo(currency);

  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? `${currencyInfo.symbol}0` : '0';
  }

  let formatted;

  if (compact) {
    // Compact format for large numbers: 1.2K, 3.5M
    if (Math.abs(amount) >= 1000000) {
      formatted = `${(amount / 1000000).toFixed(1)}M`;
    } else if (Math.abs(amount) >= 1000) {
      formatted = `${(amount / 1000).toFixed(1)}K`;
    } else {
      formatted = amount.toLocaleString(currencyInfo.locale);
    }
  } else {
    formatted = amount.toLocaleString(currencyInfo.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  if (showSymbol) {
    return `${currencyInfo.symbol} ${formatted}`;
  }

  if (showCode) {
    return `${currency} ${formatted}`;
  }

  return formatted;
};

export const getAvailableCurrencies = () => {
  return Object.entries(CURRENCIES).map(([code, info]) => ({
    value: code,
    label: `${info.symbol} ${code} - ${info.name}`,
    symbol: info.symbol,
  }));
};

export const getCurrencyOptions = () => {
  return Object.keys(CURRENCIES).map((code) => ({
    value: code,
    label: `${CURRENCIES[code].symbol} ${code}`,
  }));
};

export const groupByCurrency = (items, amountKey = 'total') => {
  const grouped = {};

  items.forEach((item) => {
    const currency = item.currency || 'USD';
    const amount = item[amountKey] || 0;

    if (!grouped[currency]) {
      grouped[currency] = {
        currency,
        total: 0,
        count: 0,
        symbol: getCurrencySymbol(currency),
      };
    }
    grouped[currency].total += amount;
    grouped[currency].count += 1;
  });

  return Object.values(grouped);
};

export const formatCurrencyGroup = (grouped) => {
  if (grouped.length === 0) return 'No data';

  return grouped
    .map((g) => `${g.symbol} ${g.total.toLocaleString()}`)
    .join(' + ');
};
