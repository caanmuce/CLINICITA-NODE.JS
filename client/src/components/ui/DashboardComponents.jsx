// src/components/ui/DashboardComponents.jsx
// Componentes reutilizables para dashboards

import { AnimatedCard } from './AnimatedComponents';
import { StaggerItem } from './AnimatedComponents';
import { Loader2, XCircle, Info } from 'lucide-react';

export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  bg, 
  href, 
  loading, 
  error, 
  notAvailable 
}) => (
  <AnimatedCard hover as={href ? 'a' : 'div'} href={href} className={`${bg} border relative`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {loading && (
          <div className="flex items-center gap-2 mt-1">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <span className="text-sm text-gray-500">Cargando...</span>
          </div>
        )}
        {error && (
          <p className="text-2xl font-bold text-red-600 mt-1 flex items-center gap-1">
            <XCircle className="h-5 w-5" /> Error
          </p>
        )}
        {notAvailable && !loading && !error && (
          <p className="text-2xl font-bold text-gray-400 mt-1 flex items-center gap-1">
            <Info className="h-5 w-5" /> N/D
          </p>
        )}
        {!loading && !error && !notAvailable && (
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className={`p-3 rounded-full ${bg} ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </AnimatedCard>
);

export const QuickAction = ({ label, href, icon: Icon, color, index }) => (
  <StaggerItem key={index} style={{ transitionDelay: `${index * 50}ms` }}>
    <AnimatedCard as="a" href={href} className={`flex flex-col items-center gap-3 p-4 rounded-xl text-white ${color} cursor-pointer`}>
      <div className="p-3 bg-white/20 rounded-lg">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-medium text-center">{label}</p>
    </AnimatedCard>
  </StaggerItem>
);