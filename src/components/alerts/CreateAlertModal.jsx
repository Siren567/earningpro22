import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AlertSymbolSearch from './AlertSymbolSearch';
import AlertPreviewSentence from './AlertPreviewSentence';

const CONDITIONS = [
  { value: 'price_above',   label: 'Price Above',      prefix: '$' },
  { value: 'price_below',   label: 'Price Below',       prefix: '$' },
  { value: 'percent_above', label: '% Change Above',    prefix: '%' },
  { value: 'percent_below', label: '% Change Below',    prefix: '%' },
];

const CHANNELS = [
  { id: 'discord',  label: 'Discord',  available: true },
  { id: 'telegram', label: 'Telegram', available: true },
  { id: 'email',    label: 'Email',    available: false, coming: true },
  { id: 'sms',      label: 'SMS',      available: false, coming: true },
];

const EMPTY_FORM = {
  symbol: '',
  assetName: '',
  conditionType: 'price_above',
  targetValue: '',
  channels: [],
};

export default function CreateAlertModal({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [targetError, setTargetError] = useState('');
  const isEditing = !!initialData?.id;

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          symbol: initialData.stock_symbol || '',
          assetName: initialData.asset_name || '',
          conditionType: initialData.condition_type || 'price_above',
          targetValue: initialData.target_value != null ? String(initialData.target_value) : '',
          channels: initialData.channels || [],
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setTargetError('');
    }
  }, [open, initialData]);

  const currentCondition = CONDITIONS.find(c => c.value === form.conditionType);
  const isPercent = form.conditionType?.includes('percent');

  const validateTarget = (val) => {
    if (val === '' || val === null) return 'Required';
    const n = Number(val);
    if (isNaN(n)) return 'Must be a number';
    if (!isPercent && n <= 0) return 'Price must be positive';
    return '';
  };

  const handleTargetChange = (val) => {
    setForm(f => ({ ...f, targetValue: val }));
    setTargetError(validateTarget(val));
  };

  const toggleChannel = (id) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(id) ? f.channels.filter(c => c !== id) : [...f.channels, id],
    }));
  };

  const canSubmit =
    form.symbol.trim().length > 0 &&
    form.conditionType &&
    form.targetValue !== '' &&
    !isNaN(Number(form.targetValue)) &&
    validateTarget(form.targetValue) === '' &&
    form.channels.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave({
      stock_symbol: form.symbol.toUpperCase(),
      asset_name: form.assetName,
      condition_type: form.conditionType,
      target_value: parseFloat(form.targetValue),
      channels: form.channels,
      is_active: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="dark:bg-[#14141e] bg-white dark:border-white/10 border-gray-200 max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="dark:text-white text-gray-900">
            {isEditing ? 'Edit Alert' : 'Create Alert'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Symbol search */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide dark:text-gray-400 text-gray-600 mb-2 block">Asset</label>
            <AlertSymbolSearch
              value={form.symbol}
              assetName={form.assetName}
              onChange={(val) => setForm(f => ({ ...f, symbol: val }))}
              onSelect={({ symbol, name }) => setForm(f => ({ ...f, symbol, assetName: name }))}
            />
          </div>

          {/* Condition */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide dark:text-gray-400 text-gray-600 mb-2 block">Condition</label>
            <Select value={form.conditionType} onValueChange={(v) => setForm(f => ({ ...f, conditionType: v }))}>
              <SelectTrigger className="dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 dark:text-white text-gray-900 rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#1a1a2e] bg-white dark:border-white/10">
                {CONDITIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target value */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide dark:text-gray-400 text-gray-600 mb-2 block">
              {isPercent ? 'Percentage (%)' : 'Price ($)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm dark:text-gray-500 text-gray-400 font-medium pointer-events-none">
                {isPercent ? '%' : '$'}
              </span>
              <input
                type="number"
                value={form.targetValue}
                onChange={(e) => handleTargetChange(e.target.value)}
                placeholder={isPercent ? 'e.g. 5' : 'e.g. 180.00'}
                step={isPercent ? '0.1' : '0.01'}
                className={`w-full pl-8 pr-4 py-2.5 text-sm rounded-xl dark:bg-white/5 bg-gray-50 border dark:text-white text-gray-900 placeholder:dark:text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors ${
                  targetError
                    ? 'border-red-500/50 focus:ring-red-500'
                    : 'dark:border-white/10 border-gray-200 focus:ring-blue-500'
                }`}
              />
            </div>
            {targetError && <p className="text-xs text-red-400 mt-1">{targetError}</p>}
          </div>

          {/* Channels */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide dark:text-gray-400 text-gray-600 mb-2 block">Delivery Channels</label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map(ch => {
                const selected = form.channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    disabled={!ch.available}
                    onClick={() => ch.available && toggleChannel(ch.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      !ch.available
                        ? 'dark:bg-white/[0.02] bg-gray-50 dark:border-white/5 border-gray-100 opacity-50 cursor-not-allowed'
                        : selected
                          ? 'dark:bg-blue-500/15 bg-blue-50 dark:border-blue-500/30 border-blue-300 dark:text-cyan-400 text-blue-700'
                          : 'dark:bg-white/[0.03] bg-gray-50 dark:border-white/10 border-gray-200 dark:text-gray-300 text-gray-700 dark:hover:bg-white/[0.06] hover:bg-gray-100'
                    }`}
                  >
                    <span>{ch.label}</span>
                    {ch.coming && (
                      <span className="text-[10px] dark:text-gray-600 text-gray-400 font-normal">Soon</span>
                    )}
                    {ch.available && selected && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider dark:text-gray-600 text-gray-400 font-semibold mb-1.5">Preview</p>
            <AlertPreviewSentence
              symbol={form.symbol}
              conditionType={form.conditionType}
              targetValue={form.targetValue}
              channels={form.channels}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isEditing ? 'Save Changes' : 'Create Alert'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}