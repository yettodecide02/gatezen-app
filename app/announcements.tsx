// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { Styling } from "@/constants/Platform";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AnnouncementsPage() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const sub = useThemeColor({}, "icon");
  const insets = useSafeAreaInsets();

  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const divider =
    theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const [token, user] = await Promise.all([getToken(), getUser()]);
      const communityId = (user as any)?.communityId;
      if (!communityId) return;

      const res = await axios.get(`${config.backendUrl}/resident/announcements`, {
        params: { communityId },
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setAnnouncements(res.data?.data ?? []);
    } catch (e) {
      console.error("Failed to fetch announcements:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: bg,
            borderBottomColor: divider,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: text }]}>
            Announcements
          </Text>
          {!loading && (
            <Text style={[styles.headerCount, { color: sub }]}>
              {announcements.length}{" "}
              {announcements.length === 1 ? "post" : "posts"}
            </Text>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : announcements.length === 0 ? (
        <View style={styles.center}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: theme === "dark" ? "#1F1F1F" : "#F5F3FF" },
            ]}
          >
            <Feather name="bell-off" size={36} color="#6366F1" opacity={0.7} />
          </View>
          <Text style={[styles.emptyTitle, { color: text }]}>
            No Announcements
          </Text>
          <Text style={[styles.emptySubtitle, { color: sub }]}>
            You're all caught up. Check back later.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
        >
          {announcements.map((item, index) => {
            const isOpen = expanded === item.id;
            const isLong = item.content?.length > 120;
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: cardBg,
                    borderColor: borderCol,
                    marginTop: index === 0 ? 0 : 12,
                  },
                ]}
              >
                {/* Accent bar */}
                <View style={styles.accentBar} />

                <View style={styles.cardInner}>
                  {/* Top row */}
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor:
                            theme === "dark" ? "#2D2D5A" : "#EEF2FF",
                        },
                      ]}
                    >
                      <Feather name="bell" size={18} color="#6366F1" />
                    </View>

                    <View style={styles.cardMeta}>
                      <Text
                        style={[styles.cardTitle, { color: text }]}
                        numberOfLines={isOpen ? undefined : 2}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <Feather
                          name="clock"
                          size={12}
                          color={sub}
                          style={{ opacity: 0.6 }}
                        />
                        <Text style={[styles.metaTime, { color: sub }]}>
                          {timeAgo(item.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Divider */}
                  <View
                    style={[styles.divider, { backgroundColor: divider }]}
                  />

                  {/* Body */}
                  <Text
                    style={[styles.cardBody, { color: text }]}
                    numberOfLines={isOpen ? undefined : 3}
                  >
                    {item.content}
                  </Text>

                  {/* Read more / less */}
                  {isLong && (
                    <TouchableOpacity
                      onPress={() => setExpanded(isOpen ? null : item.id)}
                      style={styles.readMoreBtn}
                    >
                      <Text style={styles.readMoreText}>
                        {isOpen ? "Show less" : "Read more"}
                      </Text>
                      <Feather
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={14}
                        color="#6366F1"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerCount: {
    fontSize: 13,
    marginTop: 1,
    opacity: 0.7,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  accentBar: {
    width: 4,
    backgroundColor: "#6366F1",
  },
  cardInner: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  divider: {
    height: 1,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.8,
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6366F1",
  },
});
