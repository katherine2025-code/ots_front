import { Chart, registerables } from 'chart.js';

// Estilo común de todos los gráficos de la app (fondo claro): tipografía del sistema, textos y
// rejilla en gris pizarra, barras con esquinas redondeadas y un ancho máximo para que no queden
// como bloques. Cada gráfico puede seguir sobrescribiendo lo que necesite.
export function aplicarEstiloGraficos(): void {
  // Registrar antes de tocar los defaults por tipo (datasets.bar no existe hasta registrar BarController)
  Chart.register(...registerables);

  Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#64748b';
  Chart.defaults.borderColor = 'rgba(15, 23, 42, 0.06)';

  Chart.defaults.elements.bar.borderRadius = 6;
  Chart.defaults.elements.bar.borderSkipped = 'start';
  Chart.defaults.datasets.bar.maxBarThickness = 56;

  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.boxHeight = 8;

  Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: 'bold' };
}
