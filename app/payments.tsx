// @ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";

type PaymentItem = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: "due" | "paid" | "failed";
  createdAt: string;
  paidAt?: string;
};

type AutopaySettings = {
  autopay: boolean;
  provider: string;
  last4: string;
};

export default function Payments() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [items, setItems] = useState<PaymentItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("mock");
  const [autopay, setAutopay] = useState<AutopaySettings>({
    autopay: false,
    provider: "mock",
    last4: "0000",
  });

  const due = useMemo(() => items.filter((i) => i.status === "due"), [items]);
  const history = useMemo(
    () => items.filter((i) => i.status !== "due"),
    [items],
  );

  const load = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // const response = await fetch('/api/payments');
      // const data = await response.json();
      // setItems(data.payments);
      // setAutopay(data.autopaySettings);

      setItems([]);
      setAutopay({ autopay: false, provider: "mock", last4: "0000" });
    } catch (error) {
      console.error("Failed to load payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const payNow = async (id: string) => {
    try {
      setBusy(true);
      // TODO: Replace with actual payment processing
      // const response = await fetch('/api/payments/process', {
      //   method: 'POST',
      //   body: JSON.stringify({ id, provider })
      // });
      // const result = await response.json();

      Alert.alert(
        "Payment Successful",
        "Your payment has been processed successfully.",
        [{ text: "OK", onPress: () => load() }],
      );
    } catch (error) {
      Alert.alert("Payment Failed", "Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  const toggleAutopay = async () => {
    const newValue = !autopay.autopay;
    setAutopay((prev) => ({ ...prev, autopay: newValue }));
    // TODO: Sync with backend
    // await fetch('/api/payments/autopay', {
    //   method: 'POST',
    //   body: JSON.stringify({ autopay: newValue, provider })
    // });
  };

  const downloadReceipt = (id: string) => {
    Alert.alert("Receipt", "Receipt download feature will be available soon.");
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: bg, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: text }]}>
          Loading payments...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      {/* Alert Banner */}
      {due.length > 0 && (
        <View style={styles.alertBanner}>
          <Feather name="alert-circle" size={20} color="#DC2626" />
          <Text style={styles.alertText}>
            <Text style={styles.alertBold}>{due.length} invoice(s)</Text>{" "}
            pending — settle now to avoid late fees.
          </Text>
        </View>
      )}

      {/* Provider & Autopay Settings */}
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: borderCol },
        ]}
      >
        <View style={styles.settingsRow}>
          <Text style={[styles.label, { color: text }]}>Payment Provider</Text>
          <Text style={[styles.providerText, { color: text }]}>
            {provider} (demo)
          </Text>
        </View>

        <View style={styles.autopayRow}>
          <View style={styles.autopayInfo}>
            <Feather name="repeat" size={20} color={text} />
            <Text style={[styles.autopayLabel, { color: text }]}>Auto-pay</Text>
          </View>
          <Switch
            value={autopay.autopay}
            onValueChange={toggleAutopay}
            trackColor={{ false: "#767577", true: "#6366F1" }}
            thumbColor={autopay.autopay ? "#ffffff" : "#f4f3f4"}
          />
        </View>
        <Text style={[styles.autopayStatus, { color: text, opacity: 0.7 }]}>
          {autopay.autopay
            ? `On (${autopay.provider}, **** ${autopay.last4})`
            : "Off"}
        </Text>
      </View>

      {/* Outstanding Bills */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="credit-card" size={24} color={text} />
          <Text style={[styles.sectionTitle, { color: text }]}>
            Outstanding Bills
          </Text>
        </View>

        {due.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <Text style={[styles.emptyText, { color: text }]}>No dues 🎉</Text>
          </View>
        ) : (
          due.map((bill) => (
            <View
              key={bill.id}
              style={[
                styles.billCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.billInfo}>
                <Text style={[styles.billTitle, { color: text }]}>
                  {bill.description}
                </Text>
                <Text style={[styles.billDate, { color: text, opacity: 0.7 }]}>
                  {new Date(bill.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.billAmount, { color: text }]}>
                {bill.amount} {bill.currency || "INR"}
              </Text>
              <Pressable
                style={[styles.payButton, busy && styles.payButtonDisabled]}
                onPress={() => payNow(bill.id)}
                disabled={busy}
              >
                <Feather name="zap" size={16} color="#ffffff" />
                <Text style={styles.payButtonText}>
                  {busy ? "Processing..." : "Pay now"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Payment History */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="file-text" size={24} color={text} />
          <Text style={[styles.sectionTitle, { color: text }]}>
            Payment History
          </Text>
        </View>

        {history.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <Text style={[styles.emptyText, { color: text }]}>
              No previous payments
            </Text>
          </View>
        ) : (
          history.map((payment) => (
            <View
              key={payment.id}
              style={[
                styles.historyCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.historyInfo}>
                <Text style={[styles.historyTitle, { color: text }]}>
                  {payment.description}
                </Text>
                <Text
                  style={[styles.historyDate, { color: text, opacity: 0.7 }]}
                >
                  {payment.status === "paid"
                    ? `Paid on ${new Date(
                        payment.paidAt!,
                      ).toLocaleDateString()}`
                    : payment.status.toUpperCase()}
                </Text>
              </View>
              <View
                style={[styles.statusChip, styles[`status_${payment.status}`]]}
              >
                <Feather name="check-circle" size={14} color="#065F46" />
                <Text
                  style={[
                    styles.statusText,
                    styles[`statusText_${payment.status}`],
                  ]}
                >
                  {payment.status}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.receiptButton,
                  payment.status !== "paid" && styles.receiptButtonDisabled,
                ]}
                onPress={() => downloadReceipt(payment.id)}
                disabled={payment.status !== "paid"}
              >
                <Feather
                  name="file-text"
                  size={16}
                  color={payment.status === "paid" ? "#6366F1" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.receiptButtonText,
                    {
                      color: payment.status === "paid" ? "#6366F1" : "#9CA3AF",
                    },
                  ]}
                >
                  Receipt
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },

  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  alertText: { flex: 1, color: "#DC2626", fontSize: 14 },
  alertBold: { fontWeight: "700" },

  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    gap: 12,
  },

  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 16, fontWeight: "600" },
  providerText: { fontSize: 14, opacity: 0.8 },

  autopayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  autopayInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  autopayLabel: { fontSize: 16, fontWeight: "500" },
  autopayStatus: { fontSize: 12, textAlign: "right" },

  section: { margin: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700" },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  emptyText: { fontSize: 16, opacity: 0.7 },

  billCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  billInfo: { flex: 1 },
  billTitle: { fontSize: 16, fontWeight: "600" },
  billDate: { fontSize: 12, marginTop: 4 },
  billAmount: { fontSize: 16, fontWeight: "700", marginRight: 8 },

  payButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: "#ffffff", fontWeight: "600" },

  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: 16, fontWeight: "600" },
  historyDate: { fontSize: 12, marginTop: 4 },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  status_paid: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  status_failed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusText_paid: { color: "#065F46" },
  statusText_failed: { color: "#DC2626" },

  receiptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  receiptButtonDisabled: { borderColor: "#9CA3AF" },
  receiptButtonText: { fontSize: 12, fontWeight: "500" },
});
