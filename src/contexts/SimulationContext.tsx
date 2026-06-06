import { createContext, useContext, useState, type ReactNode } from 'react';

interface SimulatedData {
  hqTotals: Record<string, number>;
  totalSales: number;
}

interface SimulationContextType {
  simulatedData: SimulatedData | null;
  setSimulatedData: (data: SimulatedData | null) => void;
  clearSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simulatedData, setSimulatedData] = useState<SimulatedData | null>(null);

  const clearSimulation = () => setSimulatedData(null);

  return (
    <SimulationContext.Provider value={{ simulatedData, setSimulatedData, clearSimulation }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
