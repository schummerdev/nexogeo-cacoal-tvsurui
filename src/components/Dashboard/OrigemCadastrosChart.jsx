import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const OrigemCadastrosChart = ({ data }) => {
  // Cores para o gráfico de pizza
  const backgroundColors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(14, 165, 233, 0.8)',
  ];

  // Preparar os dados para o gráfico
  const chartData = {
    labels: data.map(item => {
      const origem = item.origem || 'Desconhecida';
      return origem.charAt(0).toUpperCase() + origem.slice(1);
    }),
    datasets: [
      {
        label: 'Origem dos Cadastros',
        data: data.map(item => item.total),
        backgroundColor: backgroundColors.slice(0, data.length),
        borderColor: backgroundColors.slice(0, data.length).map(color => color.replace('0.8', '1')),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
  };

  return <Pie data={chartData} options={options} />;
};

export default OrigemCadastrosChart;