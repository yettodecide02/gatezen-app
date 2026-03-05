// @ts-nocheck
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getEnabledFeatures } from "@/lib/auth";

// featureKey: null → always visible; string → requires that feature
const SECTIONS = [
  {
    title: "Visitors",
    icon: "users",
    color: "#06B6D4",
    featureKey: "VISITOR_MANAGEMENT",
    items: [
      {
        key: "invite",
        featureKey: "VISITOR_MANAGEMENT",
        title: "Invite Guest",
        subtitle: "Send invitations",
        icon: "user-plus",
        href: "/resident/visitors?visitorType=GUEST",
      },
      {
        key: "transport",
        featureKey: "VISITOR_MANAGEMENT",
        title: "Cab / Auto",
        subtitle: "Book transportation",
        icon: "truck",
        href: "/resident/visitors?visitorType=CAB_AUTO",
      },
      {
        key: "delivery",
        featureKey: "DELIVERY_MANAGEMENT",
        title: "Delivery",
        subtitle: "Manage deliveries",
        icon: "package",
        href: "/resident/visitors/delivery",
      },
      {
        key: "passes",
        featureKey: "VISITOR_MANAGEMENT",
        title: "My Passes",
        subtitle: "View visitor passes",
        icon: "credit-card",
        href: "/resident/visitors/passes",
      },
      {
        key: "kids",
        featureKey: "KIDS_CHECKOUT",
        title: "Kids Exit",
        subtitle: "Child permissions",
        icon: "shield",
        href: "/resident/visitors/kids-exit",
      },
    ],
  },
  {
    title: "Security",
    icon: "shield",
    color: "#EF4444",
    featureKey: null, // always visible
    items: [
      {
        key: "call",
        featureKey: null,
        title: "Call Security",
        subtitle: "Emergency contact",
        icon: "phone-call",
        href: "/resident/security/call",
      },
      {
        key: "msg",
        featureKey: "E_INTERCOM",
        title: "Message",
        subtitle: "Send message",
        icon: "message-circle",
        href: "/resident/security/message",
      },
      {
        key: "guard",
        featureKey: null,
        title: "Guard Info",
        subtitle: "Guard information",
        icon: "user-check",
        href: "/resident/security/guard",
      },
    ],
  },
  {
    title: "Community",
    icon: "home",
    color: "#8B5CF6",
    featureKey: null,
    items: [
      {
        key: "maint",
        featureKey: "HELPDESK",
        title: "Maintenance",
        subtitle: "Repair requests",
        icon: "tool",
        href: "/resident/maintenance",
      },
      {
        key: "meter",
        featureKey: "UTILITY_PAYMENT",
        title: "Meter Reading",
        subtitle: "Reading & bills",
        icon: "activity",
        href: "/resident/community/meter",
      },
      {
        key: "emergency",
        featureKey: null,
        title: "Emergency Numbers",
        subtitle: "Important contacts",
        icon: "phone",
        href: "/resident/community/emergency",
      },
      {
        key: "bookings",
        featureKey: "AMENITY_BOOKING",
        title: "Bookings",
        subtitle: "Book facilities",
        icon: "calendar",
        href: "/resident/bookings",
      },
      {
        key: "payments",
        featureKey: "UTILITY_PAYMENT",
        title: "Pay Bills",
        subtitle: "Utility payments",
        icon: "credit-card",
        href: "/resident/payments",
      },
      {
        key: "directory",
        featureKey: "DIRECTORY",
        title: "Directory",
        subtitle: "Browse residents",
        icon: "book",
        href: "/resident/directory",
      },
      {
        key: "documents",
        featureKey: "DOCUMENTS_UPLOADING",
        title: "Documents",
        subtitle: "Policies & forms",
        icon: "file-text",
        href: "/resident/documents",
      },
    ],
  },
  {
    title: "Engagement",
    icon: "layers",
    color: "#10B981",
    featureKey: null,
    items: [
      {
        key: "notice-board",
        featureKey: "NOTICE_BOARD",
        title: "Notice Board",
        subtitle: "Community notices",
        icon: "clipboard",
        href: "/resident/notice-board",
      },
      {
        key: "surveys",
        featureKey: "SURVEYS",
        title: "Surveys",
        subtitle: "Share your feedback",
        icon: "bar-chart-2",
        href: "/resident/surveys",
      },
      {
        key: "polls",
        featureKey: "ELECTION_POLLS",
        title: "Election Polls",
        subtitle: "Vote on community matters",
        icon: "check-square",
        href: "/resident/election-polls",
      },
    ],
  },
  {
    title: "Help",
    icon: "help-circle",
    color: "#10B981",
    featureKey: null,
    items: [
      {
        key: "help",
        featureKey: null,
        title: "Support",
        subtitle: "Get assistance",
        icon: "help-circle",
        href: "/resident/help",
      },
      {
        key: "faq",
        featureKey: null,
        title: "FAQ",
        subtitle: "Common questions",
        icon: "list",
        href: "/resident/help/faq",
      },
      {
        key: "contact",
        featureKey: null,
        title: "Contact Us",
        subtitle: "Reach out to us",
        icon: "mail",
        href: "/resident/help/contact",
      },
    ],
  },
];

export default function QuickLinks() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    getEnabledFeatures().then(setEnabledFeatures);
  }, []);

  const visibleSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.featureKey || enabledFeatures.includes(item.featureKey),
    ),
  })).filter(
    (section) =>
      (!section.featureKey || enabledFeatures.includes(section.featureKey)) &&
      section.items.length > 0,
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 14,
          paddingHorizontal: 20,
          backgroundColor: bg,
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: borderCol,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
              Services
            </Text>
            <Text style={{ fontSize: 12, color: muted }}>
              All available features
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {visibleSections.map((section) => (
          <View key={section.title}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: section.color + "20",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={section.icon} size={12} color={section.color} />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: section.color,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {section.title}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: borderCol,
                overflow: "hidden",
              }}
            >
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.key}
                  onPress={() => router.push(item.href)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 13,
                    gap: 12,
                    backgroundColor: pressed
                      ? isDark
                        ? "#222"
                        : "#F8FAFC"
                      : "transparent",
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: borderCol,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: section.color + "18",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name={item.icon} size={17} color={section.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: "600", color: text }}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: muted, marginTop: 1 }}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={15} color={muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
