import React from 'react';

const CONDITION_LABELS = {
  price_above:   { verb: 'goes above',    prefix: '$', isPercent: false },
  price_below:   { verb: 'drops below',   prefix: '$', isPercent: false },
  percent_above: { verb: 'rises above',   prefix: '',  isPercent: true  },
  percent_below: { verb: 'falls below',   prefix: '',  isPercent: true  },
};

export default function AlertPreviewSentence({ symbol, conditionType, targetValue, channels }) {
  const hasSymbol    = symbol && symbol.trim().length > 0;
  const hasCondition = conditionType && CONDITION_LABELS[conditionType];
  const hasTarget    = targetValue !== '' && targetValue !== null && targetValue !== undefined && !isNaN(Number(targetValue));
  const hasChannels  = channels && channels.length > 0;

  if (!hasSymbol || !hasCondition || !hasTarget || !hasChannels) {
    return (
      <p className="text-sm dark:text-gray-600 text-gray-400 italic">
        Fill in the fields above to see a preview.
      </p>
    );
  }

  const info = CONDITION_LABELS[conditionType];
  const channelStr = channels.length === 1
    ? `on ${channels[0].charAt(0).toUpperCase() + channels[0].slice(1)}`
    : `on ${channels.slice(0, -1).map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')} and ${channels[channels.length - 1].charAt(0).toUpperCase() + channels[channels.length - 1].slice(1)}`;

  const valueStr = info.isPercent
    ? `${Number(targetValue) >= 0 ? '+' : ''}${Number(targetValue).toFixed(2)}%`
    : `$${Number(targetValue).toFixed(2)}`;

  return (
    <p className="text-sm dark:text-gray-300 text-gray-700 leading-relaxed">
      Notify me{' '}
      <span className="font-semibold dark:text-cyan-400 text-blue-600">{channelStr}</span>
      {' '}when{' '}
      <span className="font-semibold dark:text-white text-gray-900">{symbol.toUpperCase()}</span>
      {' '}{info.verb}{' '}
      <span className="font-semibold dark:text-white text-gray-900">{valueStr}</span>
    </p>
  );
}