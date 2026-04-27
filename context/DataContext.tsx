import { createContext, useContext, useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabaseClient";

import { getDB, resetDBConnection } from "@/services/database";
import { syncService } from "@/services/syncService";

interface DataContextType {
  isLoading: boolean;
  isSyncing: boolean;
  resetData: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
  isLoading: true,
  isSyncing: true,
  resetData: async () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <DataContext.Provider
      value={{ isLoading, isSyncing, resetData: async () => {} }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }

  return context;
};
