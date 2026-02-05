// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import axios from "axios";
import { getUser, getToken } from "@/lib/auth";
import { File, Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import { Buffer } from "buffer";

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

type PDF = {
  id: string;
  name: string;
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
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [filteredPdfs, setFilteredPdfs] = useState<PDF[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user?.communityId) {
        setLoading(false);
        return console.error("User has no communityId");
      }

      await fetchPdfs(user.communityId);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPdfs(pdfs);
    } else {
      const filtered = pdfs.filter((pdf) =>
        pdf.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPdfs(filtered);
    }
  }, [searchQuery, pdfs]);

  const fetchPdfs = async (cid: string) => {
    try {
      const res = await axios.get(`${API}/resident/pdfs?communityId=${cid}`, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });
      setPdfs(res.data.pdfs || []);
      setFilteredPdfs(res.data.pdfs || []);
    } catch (err) {
      console.error("Error fetching PDFs:", err);
      setPdfs([]);
      setFilteredPdfs([]);
    }
  };

  const downloadPdf = async (pdf: PDF) => {
    setDownloadingId(pdf.id);
    try {
      const response = await axios.get(`${API}/resident/pdf/${pdf.id}`, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
        responseType: "arraybuffer",
      });

      const fileName = pdf.name.endsWith(".pdf") ? pdf.name : `${pdf.name}.pdf`;

      // Use new FileSystem API
      const file = new File(Paths.cache, fileName);

      // Convert ArrayBuffer to base64
      const base64 = Buffer.from(response.data).toString("base64");

      // Write file using new API
      await file.write(base64);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save or Share PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Success", `PDF saved to ${file.uri}`);
      }
    } catch (err) {
      console.error("Error downloading PDF:", err);
      Alert.alert(
        "Error",
        "Failed to download PDF: " + (err?.message || "Unknown error")
      );
    } finally {
      setDownloadingId(null);
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
          <View style={styles.headerIcon}>
            <Feather name="file-text" size={24} color="#6366F1" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: text }]}>Documents</Text>
          </View>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {filteredPdfs.length}{" "}
            {filteredPdfs.length === 1 ? "Document" : "Documents"}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={[styles.searchInput, { color: text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search documents by name..."
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Documents List */}
      <ScrollView style={styles.content}>
        {filteredPdfs.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.emptyIcon}>
              <Feather name="file-text" size={32} color="#9CA3AF" />
            </View>
            <Text style={[styles.emptyText, { color: text }]}>
              {searchQuery
                ? "No documents match your search"
                : "No documents available"}
            </Text>
          </View>
        ) : (
          filteredPdfs.map((pdf) => (
            <Pressable
              key={pdf.id}
              style={[
                styles.documentCard,
                {
                  backgroundColor: cardBg,
                  borderColor: borderCol,
                },
              ]}
              onPress={() => downloadPdf(pdf)}
            >
              <View style={styles.documentHeader}>
                <View style={styles.documentIconWrapper}>
                  <Feather name="file-text" size={20} color="#DC2626" />
                </View>
                <View style={styles.documentInfo}>
                  <Text
                    style={[styles.documentName, { color: text }]}
                    numberOfLines={2}
                  >
                    {pdf.name}
                  </Text>
                  <Text style={styles.documentType}>PDF Document</Text>
                </View>
              </View>

              <Pressable
                style={[
                  styles.downloadButton,
                  downloadingId === pdf.id && styles.downloadButtonDisabled,
                ]}
                onPress={() => downloadPdf(pdf)}
                disabled={downloadingId === pdf.id}
              >
                {downloadingId === pdf.id ? (
                  <>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={styles.downloadButtonText}>
                      Downloading...
                    </Text>
                  </>
                ) : (
                  <>
                    <Feather name="download" size={18} color="#059669" />
                    <Text style={styles.downloadButtonText}>Download</Text>
                  </>
                )}
              </Pressable>
            </Pressable>
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
  headerIcon: {
    padding: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },

  searchSection: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 48,
    alignItems: "center",
    gap: 16,
    marginTop: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    backgroundColor: "#F3F4F6",
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
  },

  documentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  documentIconWrapper: {
    padding: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  documentType: {
    fontSize: 12,
    color: "#6B7280",
  },

  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#059669",
  },
});
