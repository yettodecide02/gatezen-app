// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

type SupportTicket = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

export default function Help() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFAQ, setSelectedFAQ] = useState<string | null>(null);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportForm, setSupportForm] = useState<SupportTicket>({
    name: "",
    email: "",
    topic: "General",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const faqs: FAQ[] = [
    {
      id: "1",
      question: "How do I reset my password?",
      answer:
        "Go to Login → Forgot Password, enter your registered email, and follow the link sent to you.",
      category: "Account",
    },
    {
      id: "2",
      question: "Where can I see my maintenance requests?",
      answer:
        "Open the Maintenance page. You can track statuses (submitted, in-progress, resolved) and add comments.",
      category: "Maintenance",
    },
    {
      id: "3",
      question: "How do I download invoices/receipts?",
      answer:
        "Go to Payments, open the payment row, and click Download Receipt.",
      category: "Payments",
    },
    {
      id: "4",
      question: "How do I book community facilities?",
      answer:
        "Visit the Bookings page, pick a date/time slot, and confirm. Double-booking is automatically prevented.",
      category: "Bookings",
    },
    {
      id: "5",
      question: "How do I add visitors?",
      answer:
        "Go to Visitors page, click 'Add Visitor', fill in their details and expected visit time. They'll receive a QR code.",
      category: "Visitors",
    },
    {
      id: "6",
      question: "Where can I find community documents?",
      answer:
        "Visit the Documents page to view and download community policies, forms, and other important documents.",
      category: "Documents",
    },
  ];

  const topics = [
    "General",
    "Account",
    "Payments",
    "Maintenance",
    "Bookings",
    "Visitors",
    "Documents",
  ];

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const contactOptions = [
    {
      title: "Community Guidelines",
      icon: "book-open",
      color: "#6366F1",
      action: () =>
        Alert.alert(
          "Community Guidelines",
          "Community guidelines document will be available soon.",
        ),
    },
    {
      title: "Contact Support",
      icon: "message-square",
      color: "#10B981",
      action: () => setShowSupportForm(true),
    },
    {
      title: "Email Us",
      icon: "mail",
      color: "#F59E0B",
      action: () => Linking.openURL("mailto:support@gatezen.com"),
    },
    {
      title: "Call Help Desk",
      icon: "phone",
      color: "#EF4444",
      action: () => Linking.openURL("tel:+1234567890"),
    },
  ];

  const handleSubmitTicket = async () => {
    if (!supportForm.name || !supportForm.email || !supportForm.message) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      setSending(true);
      // TODO: Implement actual support ticket submission API call
      // const response = await supportAPI.submitTicket(supportForm);

      Alert.alert(
        "Success",
        "Your support ticket has been submitted. We'll get back to you shortly!",
        [
          {
            text: "OK",
            onPress: () => {
              setShowSupportForm(false);
              setSupportForm({
                name: "",
                email: "",
                topic: "General",
                message: "",
              });
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert("Error", "Failed to submit ticket. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(insets.top, 16),
            backgroundColor: bg,
            borderBottomColor: borderCol,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={24} color={tint} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.title, { color: text }]}>
                Help & Support
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Get answers and support
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsGrid}>
            {contactOptions.map((option, index) => (
              <Pressable
                key={index}
                style={[
                  styles.actionCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                ]}
                onPress={option.action}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: `${option.color}22` },
                  ]}
                >
                  <Feather name={option.icon} size={20} color={option.color} />
                </View>
                <Text
                  style={[styles.actionTitle, { color: text }]}
                  numberOfLines={2}
                >
                  {option.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FAQ Search */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>
            Frequently Asked Questions
          </Text>

          <View
            style={[
              styles.searchContainer,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <Feather name="search" size={20} color={text} />
            <TextInput
              style={[styles.searchInput, { color: text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search FAQs..."
              placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
            />
          </View>

          {/* FAQ List */}
          <View style={styles.faqList}>
            {filteredFAQs.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                ]}
              >
                <Feather
                  name="search"
                  size={48}
                  color={text}
                  style={{ opacity: 0.3 }}
                />
                <Text style={[styles.emptyText, { color: text }]}>
                  No FAQs match your search
                </Text>
                <Text style={[styles.emptySubtext, { color: text }]}>
                  Try a different search term or contact support
                </Text>
              </View>
            ) : (
              filteredFAQs.map((faq) => (
                <View
                  key={faq.id}
                  style={[
                    styles.faqCard,
                    { backgroundColor: cardBg, borderColor: borderCol },
                  ]}
                >
                  <Pressable
                    style={styles.faqHeader}
                    onPress={() =>
                      setSelectedFAQ(selectedFAQ === faq.id ? null : faq.id)
                    }
                  >
                    <View style={styles.faqHeaderLeft}>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: "#6366F122" },
                        ]}
                      >
                        <Text
                          style={[styles.categoryText, { color: "#6366F1" }]}
                        >
                          {faq.category}
                        </Text>
                      </View>
                      <Text
                        style={[styles.faqQuestion, { color: text }]}
                        numberOfLines={2}
                      >
                        {faq.question}
                      </Text>
                    </View>
                    <Feather
                      name={
                        selectedFAQ === faq.id ? "chevron-up" : "chevron-down"
                      }
                      size={20}
                      color={text}
                    />
                  </Pressable>

                  {selectedFAQ === faq.id && (
                    <View style={styles.faqAnswer}>
                      <Text
                        style={[
                          styles.faqAnswerText,
                          { color: text, opacity: 0.8 },
                        ]}
                      >
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>

        {/* Still Need Help */}
        <View
          style={[
            styles.helpCard,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <View style={styles.helpCardIcon}>
            <Feather name="message-circle" size={24} color="#6366F1" />
          </View>
          <View style={styles.helpCardContent}>
            <Text style={[styles.helpCardTitle, { color: text }]}>
              Still need help?
            </Text>
            <Text style={[styles.helpCardText, { color: text, opacity: 0.7 }]}>
              Can't find what you're looking for? Contact our support team.
            </Text>
            <Pressable
              style={styles.helpCardButton}
              onPress={() => setShowSupportForm(true)}
            >
              <Text style={styles.helpCardButtonText}>Contact Support</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Support Form Modal */}
      <Modal
        visible={showSupportForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSupportForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: text }]}>
                Contact Support
              </Text>
              <Pressable onPress={() => setShowSupportForm(false)}>
                <Feather name="x" size={24} color={text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: text }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={supportForm.name}
                onChangeText={(text) =>
                  setSupportForm((prev) => ({ ...prev, name: text }))
                }
                placeholder="Your full name"
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
              />

              <Text style={[styles.formLabel, { color: text }]}>Email *</Text>
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={supportForm.email}
                onChangeText={(text) =>
                  setSupportForm((prev) => ({ ...prev, email: text }))
                }
                placeholder="your@email.com"
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                keyboardType="email-address"
              />

              <Text style={[styles.formLabel, { color: text }]}>Topic</Text>
              <View style={styles.topicButtons}>
                {topics.map((topic) => (
                  <Pressable
                    key={topic}
                    style={[
                      styles.topicButton,
                      { borderColor: borderCol },
                      supportForm.topic === topic && styles.selectedTopicButton,
                    ]}
                    onPress={() =>
                      setSupportForm((prev) => ({ ...prev, topic }))
                    }
                  >
                    <Text
                      style={[
                        styles.topicButtonText,
                        {
                          color: supportForm.topic === topic ? "#6366F1" : text,
                        },
                      ]}
                    >
                      {topic}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { color: text }]}>Message *</Text>
              <TextInput
                style={[
                  styles.messageInput,
                  { color: text, borderColor: borderCol },
                ]}
                value={supportForm.message}
                onChangeText={(text) =>
                  setSupportForm((prev) => ({ ...prev, message: text }))
                }
                placeholder="Describe your issue or question..."
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                multiline
                numberOfLines={4}
              />

              <Pressable
                style={[
                  styles.submitButton,
                  sending && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitTicket}
                disabled={sending}
              >
                <Feather name="send" size={16} color="#ffffff" />
                <Text style={styles.submitButtonText}>
                  {sending ? "Sending..." : "Send Message"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    padding: 16,
  },

  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  faqList: {
    gap: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: "center",
  },

  faqCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  faqHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 20,
  },

  helpCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    gap: 16,
    marginTop: 16,
  },
  helpCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  helpCardContent: {
    flex: 1,
    gap: 8,
  },
  helpCardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  helpCardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  helpCardButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  helpCardButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalForm: {
    padding: 20,
  },

  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },

  topicButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topicButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedTopicButton: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "#6366F1",
  },
  topicButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },

  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 100,
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
