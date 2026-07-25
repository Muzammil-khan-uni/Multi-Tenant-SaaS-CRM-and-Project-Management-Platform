import React, { useMemo } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const RadialProgress = ({
  value = 0,
  label,
  sublabel,
  color = '#3b82f6',
  size = 140,
}) => {
  const { isDark } = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));

  const data = useMemo(
    () => [{ name: label, value: clamped, fill: color }],
    [clamped, color, label]
  );

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size }} className="relative">
        <RadialBarChart
          width={size}
          height={size}
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: isDark ? '#374151' : '#e5e7eb' }}
            dataKey="value"
            cornerRadius={20}
            animationDuration={900}
          />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {clamped}%
          </span>
        </div>
      </div>
      {label && (
        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
          {label}
        </p>
      )}
      {sublabel && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          {sublabel}
        </p>
      )}
    </div>
  );
};

export default React.memo(RadialProgress);
