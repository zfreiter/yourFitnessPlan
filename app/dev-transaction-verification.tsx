import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSync } from "@/context/SyncContext";
import { useAuth } from "@/context/authContext";
import { runDevTransactionVerification } from "@/services/devTransactionVerification";
import { runDevWorkoutSyncVerification } from "@/services/devWorkoutSyncVerification";

export default function DevTransactionVerificationScreen() {
  const { isSyncLoading, isSyncing } = useSync();
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("Not run yet.");

  if (!__DEV__) return null;

  const run = async () => {
    setRunning(true);
    setOutput("Running local SQLite checks…");
    try {
      const transactionResults = await runDevTransactionVerification();
      const syncResults = await runDevWorkoutSyncVerification();
      const results = [...transactionResults, ...syncResults];
      setOutput(JSON.stringify(results, null, 2));
    } catch (error) {
      setOutput(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };

  const syncBusy = !!user && (isSyncLoading || isSyncing);
  const busy = running || syncBusy;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          DEV ONLY: SQLite transaction and workout sync verification
        </Text>
        <Text>
          Creates and removes synthetic fixture rows in the local database. It
          Sync checks use a fake Supabase client and never send Supabase
          requests. Run on an isolated development install with app sync idle.
        </Text>
      </View>

      <Pressable
        disabled={busy}
        onPress={run}
        style={{
          padding: 14,
          borderRadius: 8,
          backgroundColor: busy ? "#777" : "#147D54",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>
          {busy
            ? syncBusy
              ? "Waiting for sync to finish…"
              : "Running…"
            : "Run SQLite and sync checks"}
        </Text>
      </Pressable>

      {running && <ActivityIndicator />}
      <Text selectable style={{ fontFamily: "monospace" }}>{output}</Text>
    </ScrollView>
  );
}
