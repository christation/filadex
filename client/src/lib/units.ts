// Currency and temperature unit utilities

export type Currency = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'PLN' | 'CZK' | 'NOK' | 'SEK' | 'DKK' | 'HUF' | 'RON' | 'BGN' | 'HRK';
export type TemperatureUnit = 'C' | 'F';

// Currency symbols and formatting
const CURRENCY_INFO: Record<Currency, { symbol: string; position: 'before' | 'after'; decimals: number }> = {
  EUR: { symbol: '€', position: 'after', decimals: 2 },
  USD: { symbol: '$', position: 'before', decimals: 2 },
  GBP: { symbol: '£', position: 'before', decimals: 2 },
  JPY: { symbol: '¥', position: 'before', decimals: 0 },
  CAD: { symbol: 'C$', position: 'before', decimals: 2 },
  AUD: { symbol: 'A$', position: 'before', decimals: 2 },
  CHF: { symbol: 'CHF', position: 'before', decimals: 2 },
  CNY: { symbol: '¥', position: 'before', decimals: 2 },
  PLN: { symbol: 'zł', position: 'after', decimals: 2 }, // Polish Złoty
  CZK: { symbol: 'Kč', position: 'after', decimals: 2 }, // Czech Koruna
  NOK: { symbol: 'kr', position: 'after', decimals: 2 }, // Norwegian Krone
  SEK: { symbol: 'kr', position: 'after', decimals: 2 }, // Swedish Krona
  DKK: { symbol: 'kr', position: 'after', decimals: 2 }, // Danish Krone
  HUF: { symbol: 'Ft', position: 'after', decimals: 0 }, // Hungarian Forint
  RON: { symbol: 'lei', position: 'after', decimals: 2 }, // Romanian Leu
  BGN: { symbol: 'лв', position: 'after', decimals: 2 }, // Bulgarian Lev
  HRK: { symbol: 'kn', position: 'after', decimals: 2 }, // Croatian Kuna
};

/**
 * Format a currency value with the specified currency
 */
export function formatCurrency(value: number | string | null | undefined, currency: Currency = 'EUR'): string {
  if (value === null || value === undefined || value === '') {
    return `0 ${CURRENCY_INFO[currency].symbol}`;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return `0 ${CURRENCY_INFO[currency].symbol}`;
  }

  const info = CURRENCY_INFO[currency];
  const formattedValue = numValue.toFixed(info.decimals);

  if (info.position === 'before') {
    return `${info.symbol}${formattedValue}`;
  } else {
    return `${formattedValue} ${info.symbol}`;
  }
}

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9 / 5) + 32;
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5 / 9;
}

/**
 * Parse temperature string (e.g., "200-220°C" or "200-220") and convert if needed
 */
export function convertTemperature(tempString: string, targetUnit: TemperatureUnit): string {
  if (!tempString || tempString.trim() === '') {
    return '';
  }

  // Remove existing unit symbols
  const cleaned = tempString.replace(/[°CF]/g, '').trim();

  // Check if it's a range (e.g., "200-220")
  if (cleaned.includes('-')) {
    const [min, max] = cleaned.split('-').map(s => parseFloat(s.trim()));
    if (!isNaN(min) && !isNaN(max)) {
      if (targetUnit === 'F') {
        const minF = celsiusToFahrenheit(min);
        const maxF = celsiusToFahrenheit(max);
        return `${Math.round(minF)}-${Math.round(maxF)}°F`;
      } else {
        return `${Math.round(min)}-${Math.round(max)}°C`;
      }
    }
  } else {
    // Single value
    const value = parseFloat(cleaned);
    if (!isNaN(value)) {
      if (targetUnit === 'F') {
        const fahrenheit = celsiusToFahrenheit(value);
        return `${Math.round(fahrenheit)}°F`;
      } else {
        return `${Math.round(value)}°C`;
      }
    }
  }

  // If we can't parse it, return as-is with unit appended
  return `${cleaned}°${targetUnit}`;
}

/**
 * Format temperature with unit symbol
 */
export function formatTemperature(value: number | string | null | undefined, unit: TemperatureUnit = 'C'): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return '';
  }

  if (unit === 'F') {
    const fahrenheit = celsiusToFahrenheit(numValue);
    return `${Math.round(fahrenheit)}°F`;
  } else {
    return `${Math.round(numValue)}°C`;
  }
}

/**
 * Get temperature unit symbol
 */
export function getTemperatureUnitSymbol(unit: TemperatureUnit): string {
  return unit === 'F' ? '°F' : '°C';
}

