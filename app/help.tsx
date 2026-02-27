// @ts-nocheck
import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, Modal, Linking, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const FAQS = [
  { id: "1", question: "How do I reset my password?", answer: "Go to Login → Forgot Password, enter your registered email, and follow the link sent to you.", category: "Account" },
  { id: "2", question: "Where can I see my maintenance requests?", answer: "Open the Maintenance page. You can track statuses (submitted, in-progress, resolved) and add comments.", category: "Maintenance" },
  { id: "3", question: "How do I download invoices/receipts?", answer: "Go to Payments, open the payment row, and click Download Receipt.", category: "Payments" },
  { id: "4", question: "How do I book community facilities?", answer: "Visit the Bookings page, pick a date/time slot, and confirm. Double-booking is automatically prevented.", category: "Bookings" },
  { id: "5", question: "How do I add visitors?", answer: "Go to Visitors page, click Add Visitor, fill in their details and expected visit time. They will receive a QR code.", category: "Visitors" },
  { id: "6", question: "Where can I find community documents?", answer: "Visit the Documents page to view and download community policies, forms, and other important documents.", category: "Documents" },
];

const TOPICS = ["General", "Account", "Payments", "Maintenance", "Bookings", "Visitors", "Documents"];
const CONTACTS = [
  { title: "Community Guidelines", icon: "book-open", color: "#6366F1", action: "info" },
  { title: "Contact Support", icon: "message-square", color: "#10B981", action: "form" },
  { title: "Email Support", icon: "mail", color: "#F59E0B", action: "email" },
  { title: "Call Help Desk", icon: "phone", color: "#EF4444", action: "phone" },
];

export default function Help() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg = isDark ? "#111111" : "#F8FAFC";

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", topic: "General", message: "" });
  const [sending, setSending] = useState(false);
  const { toast, showInfo, showError, showSuccess, hideToast } = useToast();

  const filteredFAQs = FAQS.filter(f =>
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContact = (action) => {
    if (action === "info") { showInfo("Community guidelines document coming soon."); }
    else if (action === "form") { setShowForm(true); }
    else if (action === "email") { Linking.openURL("mailto:support@cgate.com"); }
    else if (action === "phone") { Linking.openURL("tel:+1234567890"); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) { showError("Please fill in all required fields."); return; }
    try {
      setSending(true);
      await new Promise(r => setTimeout(r, 800));
      showSuccess("Ticket submitted! We will get back to you shortly.");
      setShowForm(false);
      setForm({ name: "", email: "", topic: "General", message: "" });
    } catch { showError("Failed to submit ticket."); }
    finally { setSending(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Help & Support</Text>
            <Text style={{ fontSize: 12, color: muted }}>FAQs and contact options</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 }}>
          <Feather name="search" size={15} color={muted} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search FAQs…" placeholderTextColor={muted} style={{ flex: 1, fontSize: 14, color: text }} />
          {!!searchQuery && <Pressable onPress={() => setSearchQuery("")}><Feather name="x" size={14} color={muted} /></Pressable>}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>

        {/* Quick contact */}
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Contact Options</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {CONTACTS.map(c => (
              <Pressable key={c.title} onPress={() => handleContact(c.action)}
                style={({ pressed }) => ({ width: "48%", backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.8 : 1 })}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: c.color + "18", alignItems: "center", justifyContent: "center" }}>
                  <Feather name={c.icon} size={16} color={c.color} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: text, flex: 1 }} numberOfLines={2}>{c.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Frequently Asked Questions</Text>
          {filteredFAQs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 30, gap: 6 }}>
              <Feather name="search" size={24} color={muted} />
              <Text style={{ fontSize: 14, color: muted }}>No results for "{searchQuery}"</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, overflow: "hidden" }}>
              {filteredFAQs.map((faq, idx) => (
                <Pressable key={faq.id} onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                  style={({ pressed }) => ({ padding: 14, backgroundColor: pressed ? (isDark ? "#222" : "#F8FAFC") : "transparent", borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: borderCol })}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: tint }}>Q</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: text }}>{faq.question}</Text>
                    <Feather name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"} size={15} color={muted} />
                  </View>
                  {expandedFAQ === faq.id && (
                    <View style={{ marginTop: 10, marginLeft: 38, padding: 10, backgroundColor: tint + "08", borderRadius: 8 }}>
                      <Text style={{ fontSize: 13, color: text, lineHeight: 20 }}>{faq.answer}</Text>
                      <View style={{ marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: tint + "20" }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: tint }}>{faq.category}</Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Support form modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Submit a Ticket</Text>
              <Pressable onPress={() => setShowForm(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: borderCol, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>
            {[{ label: "Name *", key: "name", placeholder: "Your full name" }, { label: "Email *", key: "email", placeholder: "your@email.com", keyboardType: "email-address" }, { label: "Message *", key: "message", placeholder: "Describe your issue…", multiline: true, lines: 4 }].map(f => (
              <View key={f.key}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>{f.label}</Text>
                <TextInput
                  value={form[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={muted}
                  multiline={f.multiline}
                  numberOfLines={f.lines}
                  keyboardType={f.keyboardType || "default"}
                  style={{ backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: text, minHeight: f.multiline ? 90 : undefined, textAlignVertical: f.multiline ? "top" : undefined }}
                />
              </View>
            ))}
            <Pressable onPress={handleSubmit} disabled={sending}
              style={({ pressed }) => ({ backgroundColor: pressed || sending ? tint + "CC" : tint, borderRadius: 12, padding: 14, alignItems: "center" })}>
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Submit Ticket</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
