// @ts-nocheck
import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";

const SECTIONS = [
  {
    title: "Visitors",
    icon: "users",
    color: "#06B6D4",
    items: [
      {
        key: "invite",
        title: "Invite Guest",
        subtitle: "Send invitations",
        icon: "user-plus",
        href: "/visitors?visitorType=GUEST",
      },
      {
        key: "transport",
        title: "Cab / Auto",
        subtitle: "Book transportation",
        icon: "truck",
        href: "/visitors?visitorType=CAB_AUTO",
      },
      {
        key: "delivery",
        title: "Delivery",
        subtitle: "Manage deliveries",
        icon: "package",
        href: "/visitors/delivery",
      },
      {
        key: "passes",
        title: "My Passes",
        subtitle: "View visitor passes",
        icon: "credit-card",
        href: "/visitors/passes",
      },
      {
        key: "kids",
        title: "Kids Exit",
        subtitle: "Child permissions",
        icon: "shield",
        href: "/visitors/kids-exit",
      },
    ],
  },
  {
    title: "Security",
    icon: "shield",
    color: "#EF4444",
    items: [
      {
        key: "call",
        title: "Call Security",
        subtitle: "Emergency contact",
        icon: "phone-call",
        href: "/security/call",
      },
      {
        key: "msg",
        title: "Message",
        subtitle: "Send message",
        icon: "message-circle",
        href: "/security/message",
      },
      {
        key: "guard",
        title: "Guard Info",
        subtitle: "Guard information",
        icon: "user-check",
        href: "/security/guard",
      },
    ],
  },
  {
    title: "Community",
    icon: "home",
    color: "#8B5CF6",
    items: [
      {
        key: "maint",
        title: "Maintenance",
        subtitle: "Repair requests",
        icon: "tool",
        href: "/maintenance",
      },
      {
        key: "meter",
        title: "Meter Reading",
        subtitle: "Reading & bills",
        icon: "activity",
        href: "/community/meter",
      },
      {
        key: "emergency",
        title: "Emergency Numbers",
        subtitle: "Important contacts",
        icon: "phone",
        href: "/community/emergency",
      },
      {
        key: "bookings",
        title: "Bookings",
        subtitle: "Book facilities",
        icon: "calendar",
        href: "/bookings",
      },
    ],
  },
  {
    title: "Help",
    icon: "help-circle",
    color: "#10B981",
    items: [
      {
        key: "help",
        title: "Support",
        subtitle: "Get assistance",
        icon: "help-circle",
        href: "/help",
      },
      {
        key: "faq",
        title: "FAQ",
        subtitle: "Common questions",
        icon: "list",
        href: "/help/faq",
      },
      {
        key: "contact",
        title: "Contact Us",
        subtitle: "Reach out to us",
        icon: "mail",
        href: "/help/contact",
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
        {SECTIONS.map((section) => (
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
