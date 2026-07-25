const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound' },
  PKR: { symbol: '₨', code: 'PKR', name: 'Pakistani Rupee' },
};

// Exchange rates relative to USD (base currency)
const EXCHANGE_RATES = {
  USD: 1,
  EUR: 1.08,    // 1 EUR = 1.08 USD
  GBP: 1.27,    // 1 GBP = 1.27 USD
  PKR: 0.0036,  // 1 PKR = 0.0036 USD
};

export const getCurrencySymbol = (code) => {
  return CURRENCIES[code]?.symbol || code || '$';
};

export const isValidCurrency = (code) => {
  return CURRENCIES.hasOwnProperty(code);
};

export const getCurrencyInfo = (code) => {
  return CURRENCIES[code] || CURRENCIES.USD;
};

export const convertToUSD = (amount, fromCurrency) => {
  if (!amount || isNaN(amount)) return 0;
  const rate = EXCHANGE_RATES[fromCurrency] || 1;
  return amount * rate;
};

export const getExchangeRate = (fromCurrency, toCurrency = 'USD') => {
  if (fromCurrency === toCurrency) return 1;
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;
  return fromRate / toRate;
};

export default CURRENCIES;