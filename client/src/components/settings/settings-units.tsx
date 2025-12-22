import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUnits } from "@/lib/use-units";
import { Currency, TemperatureUnit } from "@/lib/units";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export function UnitsSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currency, temperatureUnit, updateUnits, isLoading } = useUnits();
  
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);
  const [selectedTemperatureUnit, setSelectedTemperatureUnit] = useState<TemperatureUnit>(temperatureUnit);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when preferences change
  useEffect(() => {
    setSelectedCurrency(currency);
    setSelectedTemperatureUnit(temperatureUnit);
    setHasChanges(false);
  }, [currency, temperatureUnit]);

  // Check if there are changes
  useEffect(() => {
    const changed = selectedCurrency !== currency || selectedTemperatureUnit !== temperatureUnit;
    setHasChanges(changed);
  }, [selectedCurrency, selectedTemperatureUnit, currency, temperatureUnit]);

  const handleSave = () => {
    updateUnits({
      currency: selectedCurrency,
      temperatureUnit: selectedTemperatureUnit,
    });
    
    toast({
      title: t('settings.units.updated'),
      description: t('settings.units.updatedDescription'),
    });
  };

  const currencyOptions: { value: Currency; label: string }[] = [
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'CHF', label: 'Swiss Franc (CHF)' },
    // European currencies
    { value: 'PLN', label: 'Polish Złoty (zł)' },
    { value: 'CZK', label: 'Czech Koruna (Kč)' },
    { value: 'NOK', label: 'Norwegian Krone (kr)' },
    { value: 'SEK', label: 'Swedish Krona (kr)' },
    { value: 'DKK', label: 'Danish Krone (kr)' },
    { value: 'HUF', label: 'Hungarian Forint (Ft)' },
    { value: 'RON', label: 'Romanian Leu (lei)' },
    { value: 'BGN', label: 'Bulgarian Lev (лв)' },
    { value: 'HRK', label: 'Croatian Kuna (kn)' },
    // Other currencies
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' },
    { value: 'CNY', label: 'Chinese Yuan (¥)' },
  ];

  const temperatureOptions: { value: TemperatureUnit; label: string }[] = [
    { value: 'C', label: 'Celsius (°C)' },
    { value: 'F', label: 'Fahrenheit (°F)' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.units.title')}</CardTitle>
        <CardDescription>
          {t('settings.units.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Currency Selection */}
        <div className="space-y-2">
          <Label htmlFor="currency">{t('settings.units.currency')}</Label>
          <Select
            value={selectedCurrency}
            onValueChange={(value) => setSelectedCurrency(value as Currency)}
          >
            <SelectTrigger id="currency">
              <SelectValue placeholder={t('settings.units.selectCurrency')} />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {t('settings.units.currencyDescription')}
          </p>
        </div>

        {/* Temperature Unit Selection */}
        <div className="space-y-2">
          <Label htmlFor="temperature">{t('settings.units.temperature')}</Label>
          <Select
            value={selectedTemperatureUnit}
            onValueChange={(value) => setSelectedTemperatureUnit(value as TemperatureUnit)}
          >
            <SelectTrigger id="temperature">
              <SelectValue placeholder={t('settings.units.selectTemperature')} />
            </SelectTrigger>
            <SelectContent>
              {temperatureOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {t('settings.units.temperatureDescription')}
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? t('common.loading') : t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}

