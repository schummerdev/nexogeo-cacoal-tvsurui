// ModernChart.jsx - Gráficos modernos com Recharts
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

// Cores modernas para gráficos
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Tooltip personalizado
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card-modern" style={{
        padding: '12px',
        minWidth: '120px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <p style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600', 
          color: 'var(--color-text)',
          margin: '0 0 4px 0'
        }}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ 
            fontSize: '0.75rem', 
            color: entry.color,
            margin: '0'
          }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Gráfico de linha moderno
export const ModernLineChart = ({ data, title, height = 300 }) => {
  return (
    <div className="card-modern" style={{ padding: '24px' }}>
      {title && (
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          color: 'var(--color-text)',
          marginBottom: '16px' 
        }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis 
            dataKey="name" 
            stroke="var(--color-text-secondary)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="var(--color-text-secondary)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }}
            fill="url(#lineGradient)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico de pizza moderno
export const ModernPieChart = ({ data, title, height = 300 }) => {
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Só mostra label se > 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="card-modern" style={{ padding: '24px' }}>
      {title && (
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          color: 'var(--color-text)',
          marginBottom: '16px' 
        }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico de barras moderno
export const ModernBarChart = ({ data, title, height = 300 }) => {
  return (
    <div className="card-modern" style={{ padding: '24px' }}>
      {title && (
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          color: 'var(--color-text)',
          marginBottom: '16px' 
        }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={1}/>
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis 
            dataKey="name" 
            stroke="var(--color-text-secondary)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="var(--color-text-secondary)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill="url(#barGradient)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// KPI Card Animado
export const AnimatedKPICard = ({ icon, value, label, trend = 0, color = 'primary' }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;
    
    const duration = 2000;
    const startTime = Date.now();
    const endValue = typeof value === 'number' ? value : 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = endValue * easeOut;
      
      setDisplayValue(Math.round(currentValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, isVisible]);

  const colorMap = {
    primary: 'var(--gradient-primary)',
    success: 'var(--gradient-forest)',
    warning: 'var(--gradient-sunset)',
    info: 'var(--gradient-ocean)'
  };

  return (
    <div className="card-modern hover-lift" style={{
      position: 'relative',
      padding: '24px',
      background: 'var(--color-surface)',
      overflow: 'hidden'
    }}>
      {/* Background gradient subtle */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: colorMap[color],
        opacity: 0.05,
        zIndex: 1
      }} />
      
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px' 
        }}>
          <div style={{ 
            fontSize: '2rem',
            filter: 'grayscale(0.2)'
          }}>
            {icon}
          </div>
          {trend !== 0 && (
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              padding: '4px 8px',
              borderRadius: '12px',
              color: trend > 0 ? 'var(--color-success)' : 'var(--color-danger)',
              background: trend > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
            }}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <div style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: 'var(--color-text)',
          marginBottom: '4px',
          fontFamily: 'inherit'
        }}>
          {displayValue.toLocaleString()}
        </div>
        
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          margin: 0,
          fontWeight: '500'
        }}>
          {label}
        </p>
      </div>
    </div>
  );
};

// Dashboard Stats (conjunto de KPIs)
export const DashboardStats = ({ stats }) => {
  return (
    <div className="grid grid-4" style={{ gap: '24px', marginBottom: '32px' }}>
      {stats.map((stat, index) => (
        <AnimatedKPICard
          key={index}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          trend={stat.trend}
          color={stat.color}
        />
      ))}
    </div>
  );
};