import React, {
  useContext,
  createContext,
  type PropsWithChildren,
  useState,
  useEffect,
} from "react";
import { getCurrentStreak } from "@/services/generic";
import { useDatabase } from "@/context/databaseContext";

interface HomeContextType {
  resetFlag: boolean;
  setResetFlag: (flag: boolean) => void;
  weeklyTotal: number;
  setWeeklyTotal: (streak: number) => void;
  monthlyTotal: number;
  setMonthlyTotal: (streak: number) => void;
}

const HomeContext = createContext<HomeContextType | undefined>(undefined);

export function useHome() {
  const value = useContext(HomeContext);

  if (!value) {
    throw new Error("useHome must be wrapped in a <HomeProvider />");
  }

  return value;
}

export function HomeProvider({ children }: PropsWithChildren) {
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [resetFlag, setResetFlag] = useState(false);
  const { db } = useDatabase();

  useEffect(() => {
    const fetchCurrentStreak = async () => {
      const { workoutsMonth, workoutsWeek } = await getCurrentStreak(db);
      setWeeklyTotal(workoutsWeek);
      setMonthlyTotal(workoutsMonth);
      setResetFlag(false);
    };

    fetchCurrentStreak();
  }, [db, resetFlag]);

  return (
    <HomeContext.Provider
      value={{
        resetFlag,
        setResetFlag,
        weeklyTotal,
        setWeeklyTotal,
        monthlyTotal,
        setMonthlyTotal,
      }}
    >
      {children}
    </HomeContext.Provider>
  );
}
