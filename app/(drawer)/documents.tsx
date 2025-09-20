// @ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import * as DocumentPicker from "expo-document-picker";
import { shareAsync } from "expo-sharing";

type Document = {
  id: string;
  name: string;
  type: "policy" | "form" | "lease" | "invoice" | "other";
  tags: string[];
  size: number;
  uploadedAt: string;
  downloadUrl?: string;
  mime?: string;
};

export default function Documents() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const documentTypes = [
    { value: "", label: "All Types" },
    { value: "policy", label: "Policies" },
    { value: "form", label: "Forms" },
    { value: "lease", label: "Lease Documents" },
    { value: "invoice", label: "Invoices" },
    { value: "other", label: "Other" },
  ];

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual documents API call
      // const response = await documentsAPI.getDocuments();
      // setDocuments(response.data);

      // For now, setting empty array until API is implemented
      setDocuments([]);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        !searchQuery ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesType = !typeFilter || doc.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, typeFilter]);

  const handleUploadDocument = async () => {
    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.type === "success") {
        // TODO: Implement actual document upload API call
        // const response = await documentsAPI.uploadDocument(result);

        Alert.alert(
          "Upload Successful",
          "Document has been uploaded successfully!",
          [{ text: "OK", onPress: loadDocuments }]
        );
      }
    } catch (error) {
      Alert.alert("Upload Failed", "Please try again later.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      if (document.downloadUrl) {
        await Linking.openURL(document.downloadUrl);
      } else {
        Alert.alert(
          "Download",
          "Document download feature will be available soon."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Unable to download document.");
    }
  };

  const handleDeleteDocument = (documentId: string) => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // TODO: Implement actual document deletion API call
            // await documentsAPI.deleteDocument(documentId);
            setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDocumentIcon = (type: string, mime?: string) => {
    if (mime?.includes("pdf")) return "file-text";
    if (mime?.includes("image")) return "image";
    if (mime?.includes("video")) return "video";
    if (mime?.includes("audio")) return "music";

    switch (type) {
      case "policy":
        return "shield";
      case "form":
        return "clipboard";
      case "lease":
        return "home";
      case "invoice":
        return "credit-card";
      default:
        return "file";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "policy":
        return "#6366F1";
      case "form":
        return "#10B981";
      case "lease":
        return "#F59E0B";
      case "invoice":
        return "#EF4444";
      default:
        return "#6B7280";
    }
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
          Loading documents...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: cardBg, borderColor: borderCol },
        ]}
      >
        <View style={styles.headerLeft}>
          <Feather name="file-text" size={24} color={text} />
          <Text style={[styles.headerTitle, { color: text }]}>Documents</Text>
        </View>
        <Pressable
          style={[
            styles.uploadButton,
            uploading && styles.uploadButtonDisabled,
          ]}
          onPress={handleUploadDocument}
          disabled={uploading}
        >
          <Feather name="upload" size={16} color="#ffffff" />
          <Text style={styles.uploadButtonText}>
            {uploading ? "Uploading..." : "Upload"}
          </Text>
        </Pressable>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
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
            placeholder="Search documents..."
            placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
          />
          <Pressable onPress={() => setShowFilters(!showFilters)}>
            <Feather name="filter" size={20} color={text} />
          </Pressable>
        </View>

        {showFilters && (
          <View
            style={[
              styles.filtersContainer,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <Text style={[styles.filterLabel, { color: text }]}>
              Document Type:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterButtons}>
                {documentTypes.map((type) => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.filterButton,
                      { borderColor: borderCol },
                      typeFilter === type.value && styles.activeFilterButton,
                    ]}
                    onPress={() => setTypeFilter(type.value)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        { color: typeFilter === type.value ? "#6366F1" : text },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Documents List */}
      <ScrollView style={styles.content}>
        {filteredDocuments.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <Feather
              name="file-text"
              size={48}
              color={text}
              style={{ opacity: 0.3 }}
            />
            <Text style={[styles.emptyText, { color: text }]}>
              {searchQuery || typeFilter
                ? "No documents match your filters"
                : "No documents yet"}
            </Text>
            <Text style={[styles.emptySubtext, { color: text }]}>
              Upload documents to get started
            </Text>
          </View>
        ) : (
          filteredDocuments.map((document) => (
            <View
              key={document.id}
              style={[
                styles.documentCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.documentHeader}>
                <View style={styles.documentIcon}>
                  <Feather
                    name={getDocumentIcon(document.type, document.mime)}
                    size={24}
                    color={getTypeColor(document.type)}
                  />
                </View>
                <View style={styles.documentInfo}>
                  <Text
                    style={[styles.documentName, { color: text }]}
                    numberOfLines={2}
                  >
                    {document.name}
                  </Text>
                  <View style={styles.documentMeta}>
                    <Text
                      style={[
                        styles.documentMetaText,
                        { color: text, opacity: 0.7 },
                      ]}
                    >
                      {formatFileSize(document.size)}
                    </Text>
                    <Text
                      style={[
                        styles.documentMetaText,
                        { color: text, opacity: 0.5 },
                      ]}
                    >
                      •
                    </Text>
                    <Text
                      style={[
                        styles.documentMetaText,
                        { color: text, opacity: 0.7 },
                      ]}
                    >
                      {new Date(document.uploadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.documentActions}>
                  <Pressable
                    style={[
                      styles.actionButton,
                      { backgroundColor: `${getTypeColor(document.type)}22` },
                    ]}
                    onPress={() => handleDownloadDocument(document)}
                  >
                    <Feather
                      name="download"
                      size={16}
                      color={getTypeColor(document.type)}
                    />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.actionButton,
                      { backgroundColor: "rgba(239, 68, 68, 0.1)" },
                    ]}
                    onPress={() => handleDeleteDocument(document.id)}
                  >
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>

              {document.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {document.tags.map((tag, index) => (
                    <View
                      key={index}
                      style={[
                        styles.tag,
                        { backgroundColor: `${getTypeColor(document.type)}22` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          { color: getTypeColor(document.type) },
                        ]}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },

  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  searchSection: {
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  filtersContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeFilterButton: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "#6366F1",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
  },

  documentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  documentMetaText: {
    fontSize: 12,
  },

  documentActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
