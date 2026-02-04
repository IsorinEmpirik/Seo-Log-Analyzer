# Chart.js Guide

## When to Use
- Quick implementation
- Simple charts (line, bar, pie, doughnut, radar)
- Lightweight (60KB gzipped)
- Mobile-friendly

## When NOT to Use
- Complex customizations → D3.js
- 3D charts → Plotly
- 10,000+ data points → Plotly WebGL

## Basic Line Chart
```javascript
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{
      label: 'Crawls',
      data: [12, 19, 3],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  }
});
```

## Basic Bar Chart
```javascript
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['200', '301', '404', '500'],
    datasets: [{
      label: 'HTTP Codes',
      data: [1200, 300, 50, 10],
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
    }]
  },
  options: {
    scales: { y: { beginAtZero: true } }
  }
});
```

## React Integration
```jsx
import { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

function MyChart({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: data
    });
    return () => chartInstance.current?.destroy();
  }, [data]);

  return <canvas ref={chartRef} />;
}
```

## Best Practices
- Use responsive containers
- Destroy charts before recreation
- Disable animations for large datasets
- Use decimation for many points
