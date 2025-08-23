import React, { useState, useEffect, useRef } from 'react';
import { SpendingData, TimeSeriesData, AnalyticsService } from '../services/AnalyticsService';

interface SpendingChartProps {
  data: SpendingData[];
  timeSeriesData: TimeSeriesData[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  chartType?: 'pie' | 'bar' | 'line';
}

export default function SpendingChart({ 
  data, 
  timeSeriesData, 
  selectedCategory, 
  onCategorySelect,
  chartType = 'pie'
}: SpendingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 400, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current?.parentElement) {
        const parent = canvasRef.current.parentElement;
        const width = Math.min(parent.clientWidth - 40, 500);
        const height = chartType === 'line' ? 300 : width;
        setChartDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [chartType]);

  useEffect(() => {
    if (canvasRef.current && data.length > 0) {
      drawChart();
    }
  }, [data, timeSeriesData, chartType, chartDimensions, hoveredSegment, selectedCategory]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = chartDimensions.width;
    canvas.height = chartDimensions.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (chartType === 'pie') {
      drawPieChart(ctx);
    } else if (chartType === 'bar') {
      drawBarChart(ctx);
    } else if (chartType === 'line') {
      drawLineChart(ctx);
    }
  };

  const drawPieChart = (ctx: CanvasRenderingContext2D) => {
    const centerX = chartDimensions.width / 2;
    const centerY = chartDimensions.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    const total = data.reduce((sum, item) => sum + item.amount, 0);
    let currentAngle = -Math.PI / 2; // Start from top

    data.forEach((item, index) => {
      const categoryInfo = AnalyticsService.getCategoryById(item.category);
      const sliceAngle = (item.amount / total) * 2 * Math.PI;
      
      // Determine color
      let color = categoryInfo?.color || '#6B7280';
      if (hoveredSegment === item.category) {
        color = lightenColor(color, 20);
      }
      if (selectedCategory && selectedCategory !== item.category) {
        color = lightenColor(color, -30);
      }

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label if slice is large enough
      if (item.percentage > 5) {
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${item.percentage.toFixed(0)}%`, labelX, labelY);
      }

      currentAngle += sliceAngle;
    });

    // Draw center circle for donut effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw total in center
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', centerX, centerY - 10);
    ctx.font = '14px Arial';
    ctx.fillText(`$${total.toFixed(0)}`, centerX, centerY + 10);
  };

  const drawBarChart = (ctx: CanvasRenderingContext2D) => {
    const padding = 60;
    const chartWidth = chartDimensions.width - padding * 2;
    const chartHeight = chartDimensions.height - padding * 2;
    
    const maxAmount = Math.max(...data.map(d => d.amount));
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, chartDimensions.height - padding);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, chartDimensions.height - padding);
    ctx.lineTo(chartDimensions.width - padding, chartDimensions.height - padding);
    ctx.stroke();

    // Draw bars
    data.forEach((item, index) => {
      const categoryInfo = AnalyticsService.getCategoryById(item.category);
      const barHeight = (item.amount / maxAmount) * chartHeight;
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const y = chartDimensions.height - padding - barHeight;

      let color = categoryInfo?.color || '#6B7280';
      if (hoveredSegment === item.category) {
        color = lightenColor(color, 20);
      }

      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw value on top of bar
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`$${item.amount.toFixed(0)}`, x + barWidth / 2, y - 5);

      // Draw category label
      ctx.save();
      ctx.translate(x + barWidth / 2, chartDimensions.height - padding + 15);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'right';
      ctx.fillText(categoryInfo?.name || item.category, 0, 0);
      ctx.restore();
    });

    // Draw Y-axis labels
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = (maxAmount / ySteps) * i;
      const y = chartDimensions.height - padding - (chartHeight / ySteps) * i;
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`$${value.toFixed(0)}`, padding - 10, y + 3);
      
      // Grid lines
      ctx.strokeStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(chartDimensions.width - padding, y);
      ctx.stroke();
    }
  };

  const drawLineChart = (ctx: CanvasRenderingContext2D) => {
    if (timeSeriesData.length === 0) return;

    const padding = 60;
    const chartWidth = chartDimensions.width - padding * 2;
    const chartHeight = chartDimensions.height - padding * 2;
    
    const maxAmount = Math.max(...timeSeriesData.map(d => d.amount));
    const minAmount = Math.min(...timeSeriesData.map(d => d.amount));
    const range = maxAmount - minAmount || 1;

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, chartDimensions.height - padding);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, chartDimensions.height - padding);
    ctx.lineTo(chartDimensions.width - padding, chartDimensions.height - padding);
    ctx.stroke();

    // Draw grid lines and labels
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = minAmount + (range / ySteps) * i;
      const y = chartDimensions.height - padding - (chartHeight / ySteps) * i;
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`$${value.toFixed(0)}`, padding - 10, y + 3);
      
      // Grid lines
      ctx.strokeStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(chartDimensions.width - padding, y);
      ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    timeSeriesData.forEach((point, index) => {
      const x = padding + (index / (timeSeriesData.length - 1)) * chartWidth;
      const y = chartDimensions.height - padding - ((point.amount - minAmount) / range) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#3b82f6';
    timeSeriesData.forEach((point, index) => {
      const x = padding + (index / (timeSeriesData.length - 1)) * chartWidth;
      const y = chartDimensions.height - padding - ((point.amount - minAmount) / range) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw X-axis labels (sample every few points to avoid crowding)
    const labelStep = Math.max(1, Math.floor(timeSeriesData.length / 8));
    timeSeriesData.forEach((point, index) => {
      if (index % labelStep === 0) {
        const x = padding + (index / (timeSeriesData.length - 1)) * chartWidth;
        
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x, chartDimensions.height - padding + 15);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(new Date(point.date).toLocaleDateString(), 0, 0);
        ctx.restore();
      }
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (chartType !== 'pie') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = chartDimensions.width / 2;
    const centerY = chartDimensions.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    if (distance > radius) return;

    const angle = Math.atan2(y - centerY, x - centerX) + Math.PI / 2;
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;

    const total = data.reduce((sum, item) => sum + item.amount, 0);
    let currentAngle = 0;

    for (const item of data) {
      const sliceAngle = (item.amount / total) * 2 * Math.PI;
      if (normalizedAngle >= currentAngle && normalizedAngle <= currentAngle + sliceAngle) {
        onCategorySelect(selectedCategory === item.category ? null : item.category);
        break;
      }
      currentAngle += sliceAngle;
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (chartType !== 'pie') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = chartDimensions.width / 2;
    const centerY = chartDimensions.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    if (distance > radius) {
      setHoveredSegment(null);
      return;
    }

    const angle = Math.atan2(y - centerY, x - centerX) + Math.PI / 2;
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;

    const total = data.reduce((sum, item) => sum + item.amount, 0);
    let currentAngle = 0;

    for (const item of data) {
      const sliceAngle = (item.amount / total) * 2 * Math.PI;
      if (normalizedAngle >= currentAngle && normalizedAngle <= currentAngle + sliceAngle) {
        setHoveredSegment(item.category);
        break;
      }
      currentAngle += sliceAngle;
    }
  };

  const lightenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Chart Type Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Spending Visualization</h3>
        <div className="flex space-x-2">
          {[
            { type: 'pie', label: 'Pie Chart' },
            { type: 'bar', label: 'Bar Chart' },
            { type: 'line', label: 'Trend Line' }
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onCategorySelect(null)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                chartType === type
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart */}
          <div className="flex-1 flex justify-center">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredSegment(null)}
              className="cursor-pointer"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          {/* Legend */}
          <div className="lg:w-80">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Categories</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.map((item) => {
                const categoryInfo = AnalyticsService.getCategoryById(item.category);
                const isSelected = selectedCategory === item.category;
                const isHovered = hoveredSegment === item.category;
                
                return (
                  <div
                    key={item.category}
                    onClick={() => onCategorySelect(isSelected ? null : item.category)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 
                      isHovered ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: categoryInfo?.color || '#6B7280' }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {categoryInfo?.icon} {categoryInfo?.name || item.category}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.count} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${item.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}