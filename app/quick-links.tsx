// @ts-nocheck
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";

type ServiceItem = {
  key: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
  color: string;
};

type ServiceSection = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  services: ServiceItem[];
};

const SERVICE_SECTIONS: ServiceSection[] = [
  {
    title: "Visitors",
    icon: "users",
    color: "#06B6D4",
    services: [
      {
        key: "invite-guest",
        title: "Invite Guest",
        subtitle: "Send invitations",
        icon: "user-plus",
        href: "/visitors/invite",
        color: "#06B6D4",
      },
      {
        key: "cab-auto",
        title: "Cab/Auto",
        subtitle: "Book transportation",
        icon: "truck",
        href: "/visitors/transport",
        color: "#06B6D4",
      },
      {
        key: "delivery",
        title: "Delivery",
        subtitle: "Manage deliveries",
        icon: "package",
        href: "/visitors/delivery",
        color: "#06B6D4",
      },
      {
        key: "my-passes",
        title: "My Passes",
        subtitle: "View visitor passes",
        icon: "credit-card",
        href: "/visitors/passes",
        color: "#06B6D4",
      },
      {
        key: "kids-exit",
        title: "Allow Kids Exit",
        subtitle: "Child permissions",
        icon: "shield",
        href: "/visitors/kids-exit",
        color: "#06B6D4",
      },
    ],
  },
  {
    title: "Security",
    icon: "shield",
    color: "#EF4444",
    services: [
      {
        key: "call-security",
        title: "Call Security",
        subtitle: "Emergency contact",
        icon: "phone-call",
        href: "/security/call",
        color: "#EF4444",
      },
      {
        key: "message-security",
        title: "Message",
        subtitle: "Send message",
        icon: "message-circle",
        href: "/security/message",
        color: "#EF4444",
      },
      {
        key: "guard-info",
        title: "Guard",
        subtitle: "Guard information",
        icon: "user-check",
        href: "/security/guard",
        color: "#EF4444",
      },
    ],
  },
  {
    title: "Community",
    icon: "home",
    color: "#8B5CF6",
    services: [
      {
        key: "maintenance",
        title: "Maintenance",
        subtitle: "Repair requests",
        icon: "tool",
        href: "/maintenance",
        color: "#8B5CF6",
      },
      {
        key: "meter-reading",
        title: "Meter",
        subtitle: "Reading & bills",
        icon: "activity",
        href: "/community/meter",
        color: "#8B5CF6",
      },
      {
        key: "emergency-numbers",
        title: "Emergency Numbers",
        subtitle: "Important contacts",
        icon: "phone",
        href: "/community/emergency",
        color: "#8B5CF6",
      },
      {
        key: "amenities",
        title: "Amenities/Bookings",
        subtitle: "Book facilities",
        icon: "calendar",
        href: "/bookings",
        color: "#8B5CF6",
      },
    ],
  },
  {
    title: "Help",
    icon: "help-circle",
    color: "#10B981",
    services: [
      {
        key: "help-support",
        title: "Support",
        subtitle: "Get assistance",
        icon: "help-circle",
        href: "/help",
        color: "#10B981",
      },
      {
        key: "faq",
        title: "FAQ",
        subtitle: "Common questions",
        icon: "info",
        href: "/help/faq",
        color: "#10B981",
      },
      {
        key: "contact",
        title: "Contact Us",
        subtitle: "Reach out",
        icon: "mail",
        href: "/help/contact",
        color: "#10B981",
      },
    ],
  },
];

function ServiceCard({ service }: { service: ServiceItem }) {
  const theme = useColorScheme() ?? "light";
  const text = useThemeColor({}, "text");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <Pressable
      onPress={() => router.push(service.href)}
      android_ripple={{ color: `${service.color}22` }}
      style={[
        styles.serviceCard,
        { backgroundColor: cardBg, borderColor: borderCol },
      ]}
    >
      <View
        style={[
          styles.serviceIcon,
          {
            backgroundColor: `${service.color}22`,
            borderColor: `${service.color}44`,
          },
        ]}
      >
        <Feather name={service.icon} size={18} color={service.color} />
      </View>
      <View style={styles.serviceInfo}>
        <Text style={[styles.serviceTitle, { color: text }]} numberOfLines={1}>
          {service.title}
        </Text>
        {service.subtitle && (
          <Text
            style={[styles.serviceSubtitle, { color: text, opacity: 0.6 }]}
            numberOfLines={1}
          >
            {service.subtitle}
          </Text>
        )}
      </View>
      <Feather
        name="chevron-right"
        size={16}
        color={text}
        style={{ opacity: 0.4 }}
      />
    </Pressable>
  );
}

function SectionHeader({ section }: { section: ServiceSection }) {
  const text = useThemeColor({}, "text");

  return (
    <View style={styles.sectionHeader}>
      <View
        style={[
          styles.sectionIcon,
          {
            backgroundColor: `${section.color}22`,
            borderColor: `${section.color}44`,
          },
        ]}
      >
        <Feather name={section.icon} size={20} color={section.color} />
      </View>
      <Text style={[styles.sectionTitle, { color: text }]}>
        {section.title}
      </Text>
    </View>
  );
}

export default function QuickLinks() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const border = theme === "dark" ? "#262626" : "#E5E7EB";
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Fixed header — sits above the scroll area */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(insets.top, 16),
            backgroundColor: bg,
            borderBottomColor: border,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={tint} />
            </Pressable>
            <View>
              <Text style={[styles.headerTitle, { color: text }]}>
                All Services
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: text, opacity: 0.5 }]}
              >
                Browse all available features
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {SERVICE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <SectionHeader section={section} />
            <View style={styles.servicesContainer}>
              {section.services.map((service) => (
                <ServiceCard key={service.key} service={service} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  servicesContainer: {
    gap: 8,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  serviceIcon: {
    height: 36,
    width: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  serviceInfo: {
    flex: 1,
    gap: 2,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  serviceSubtitle: {
    fontSize: 12,
  },
});
