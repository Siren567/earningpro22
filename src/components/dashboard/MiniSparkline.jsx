import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts';

/**
 * Micro sparkline chart — no axes, no tooltip, pure signal.
 * Renders either as a plain line or a filled area.
 *
 * Props:
 *   data    number[]   — raw values to plot
 *   color   string     — stroke color (default: emerald)
 *   height  number     — chart height in px (default: 36)
 *   filled  boolean    — render as area chart with subtle fill
 */
export default function MiniSparkline({
  data = [],
  color = '#10b981',
  height = 36,
  filled = true,
}) {
  const points = useMemo(
    () => data.map((v, i) => ({ i, v: Number(v) })),
    [data]
  );

  if (points.length < 2) return null;

  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, '')}`;

  if (filled) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
