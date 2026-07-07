import React from 'react';
import { motion } from 'motion/react';

interface GaugeProps {
  score: number; // 0 a 100
  label: string;
}

export function AbusividadeGauge({ score, label }: GaugeProps) {
  // Cálculo do ângulo (de -90deg a 90deg para um semi-círculo)
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-inner border border-gray-100">
      <div className="relative w-64 h-32 overflow-hidden">
        {/* Fundo do Gauge */}
        <div className="absolute top-0 left-0 w-64 h-64 border-[20px] border-gray-100 rounded-full" />
        
        {/* Cores do Gauge (Gradiente de Alerta) */}
        <div className="absolute top-0 left-0 w-64 h-64 border-[20px] border-transparent border-l-green-500 border-t-yellow-500 border-r-red-600 rounded-full rotate-45" />

        {/* Ponteiro Animado */}
        <motion.div 
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute bottom-0 left-1/2 w-1 h-28 bg-gray-800 origin-bottom -translate-x-1/2 z-20"
        >
          <div className="w-4 h-4 bg-gray-800 rounded-full -translate-x-[6px] translate-y-[100px]" />
        </motion.div>
      </div>
      
      <div className="mt-4 text-center">
        <span className="text-4xl font-black text-red-600 uppercase italic tracking-tighter">
          {label}
        </span>
        <p className="text-gray-500 text-sm font-bold mt-1">Nível de Irregularidade Detectado</p>
      </div>
    </div>
  );
}
