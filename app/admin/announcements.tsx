// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId, getUser } from "@/lib/auth";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  theme: string;
  textColor: string;
  muted: string;
  onDelete: (id: string) => void;
  tint: string;
}

interface CreateAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string }) => void;
  theme: string;
  textColor: string;
  tint: string;
  error: string;
  setError: (error: string) => void;
}

// Announcement Card Component
function AnnouncementCard({
  announcement,
  theme,
  textColor,
  muted,
  onDelete,
  tint,
}: AnnouncementCardProps) {
  const handleDelete = () => {
    Alert.alert(
      "Delete Announcement",
      "Are you sure you want to delete this announcement?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(announcement.id),
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View
      style={[
        styles.announcementCard,
        {
          backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff",
          borderColor:
            theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <View style={styles.announcementHeader}>
        <View style={styles.announcementInfo}>
          <Text style={[styles.announcementTitle, { color: textColor }]}>
            {announcement.title}
          </Text>
          <View style={styles.announcementMeta}>
            <Feather name="calendar" size={12} color={muted} />
            <Text style={[styles.announcementDate, { color: muted }]}>
              {formatDate(announcement.createdAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleDelete}
          style={[
            styles.deleteButton,
            {
              borderColor: theme === "dark" ? "#fee2e2" : "#fee2e2",
            },
          ]}
        >
          <Feather name="trash-2" size={14} color="#ef4444" />
        </TouchableOpacity>
      </View>
      <Text style={[styles.announcementContent, { color: textColor }]}>
        {announcement.content}
      </Text>
    </View>
  );
}

// Create Announcement Modal
function CreateAnnouncementModal({
  visible,
  onClose,
  onSubmit,
  theme,
  textColor,
  tint,
  error,
  setError,
  muted,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");
      onClose();
    } catch (error) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setError("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff",
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Create New Announcement
            </Text>
          </View>

          <View style={styles.modalBody}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textColor }]}>
                Title *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme === "dark" ? "#2A2A2A" : "#f9fafb",
                    borderColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                    color: textColor,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter announcement title"
                placeholderTextColor={theme === "dark" ? "#6b7280" : "#9ca3af"}
                maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textColor }]}>
                Content *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme === "dark" ? "#2A2A2A" : "#f9fafb",
                    borderColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                    color: textColor,
                  },
                ]}
                value={content}
                onChangeText={setContent}
                placeholder="Enter announcement content"
                placeholderTextColor={theme === "dark" ? "#6b7280" : "#9ca3af"}
                multiline
                numberOfLines={6}
                maxLength={1000}
              />
              <Text style={[styles.charCount, { color: muted }]}>
                {content.length}/1000 characters
              </Text>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.modalButton,
                styles.cancelButton,
                {
                  borderColor:
                    theme === "dark" ? "rgba(255,255,255,0.2)" : "#d1d5db",
                },
              ]}
              disabled={loading}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: theme === "dark" ? "#9ca3af" : "#6b7280" },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.modalButton,
                styles.submitButton,
                {
                  backgroundColor: tint,
                  opacity:
                    loading || !title.trim() || !content.trim() ? 0.5 : 1,
                },
              ]}
              disabled={loading || !title.trim() || !content.trim()}
            >
              <Text style={[styles.submitButtonText, { color: "#ffffff" }]}>
                {loading ? "Creating..." : "Create Announcement"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminAnnouncements() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const muted = iconColor;
  const insets = useSafeAreaInsets();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const url = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000";
  
  
  useEffect(() => {
    fetchAnnouncements();
  }, []);
  
  const fetchAnnouncements = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      
      if (!communityId) {
        Alert.alert(
          "Error",
          "Community information not found. Please login again."
        );
        return;
      }


      const res = await axios.get(`${url}/admin/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: communityId },
      });
      setAnnouncements(res.data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      Alert.alert("Error", "Failed to load announcements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const handleCreateAnnouncement = async (announcementData) => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      if (!communityId) {
        Alert.alert(
          "Error",
          "Community information not found. Please login again."
        );
        return;
      }

      const data = {
        title: announcementData.title,
        content: announcementData.content,
        communityId: communityId,
      };

      const response = await axios.post(
        `${url}/admin/create-announcement`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Add the new announcement to the list
      setAnnouncements((prev) => [response.data.announcement, ...prev]);
      setSuccess("Announcement created successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);

      fetchAnnouncements();
    } catch (error) {
      console.error("Error creating announcement:", error);
      setError(error.response?.data?.error || "Failed to create announcement");
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      await axios.delete(`${url}/admin/announcements/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: communityId },
      });

      // Remove the announcement from the list
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
      setSuccess("Announcement deleted successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting announcement:", error);
      Alert.alert("Error", "Failed to delete announcement");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View
          style={[
            styles.centerContent,
            { paddingTop: Math.max(insets.top, 16) },
          ]}
        >
          <Text style={[styles.loadingText, { color: textColor }]}>
            Loading announcements...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color={textColor} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: tint }]}>
                <Feather name="message-square" size={20} color="#ffffff" />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: textColor }]}>
                  Announcements
                </Text>
                <Text style={[styles.headerSubtitle, { color: muted }]}>
                  Manage community announcements
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={[styles.createButton, { backgroundColor: tint }]}
            >
              <Feather name="plus" size={18} color="#ffffff" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error/Success Messages */}
        {error && (
          <View style={styles.messageContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={[styles.messageContainer, styles.successMessage]}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {/* Stats */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff",
              borderColor:
                theme === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <Text style={[styles.statsTitle, { color: textColor }]}>
            All Announcements ({announcements.length})
          </Text>
        </View>

        {/* Announcements List */}
        {announcements.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff",
                borderColor:
                  theme === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <Feather
              name="message-square"
              size={48}
              color={muted}
              style={{ opacity: 0.3 }}
            />
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              No announcements found
            </Text>
            <Text style={[styles.emptySubtitle, { color: muted }]}>
              Create your first announcement to get started
            </Text>
          </View>
        ) : (
          <View style={styles.announcementsList}>
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                theme={theme}
                textColor={textColor}
                muted={muted}
                onDelete={handleDeleteAnnouncement}
                tint={tint}
              />
            ))}
          </View>
        )}

        {/* Create Announcement Modal */}
        <CreateAnnouncementModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAnnouncement}
          theme={theme}
          textColor={textColor}
          tint={tint}
          error={error}
          setError={setError}
          muted={muted}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
  successMessage: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  successText: {
    color: "#16a34a",
    fontSize: 14,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  announcementsList: {
    gap: 12,
  },
  announcementCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  announcementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  announcementInfo: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  announcementMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  announcementDate: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  announcementContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: 20,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  submitButton: {
    // backgroundColor will be set dynamically
  },
  submitButtonText: {
    fontWeight: "600",
  },
});
