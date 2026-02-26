// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import axios from "axios";
import { getUser, getToken } from "@/lib/auth";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { config } from "@/lib/config";

const API = config.backendUrl;

type PDF = {
  id: string;
  name: string;
};

export default function Documents() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [loading, setLoading] = useState(true);
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [filteredPdfs, setFilteredPdfs] = useState<PDF[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

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
        pdf.name.toLowerCase().includes(searchQuery.toLowerCase()),
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
        headers: { Authorization: `Bearer ${await getToken()}` },
        responseType: "arraybuffer",
      });

      if (!response.data || response.data.byteLength === 0) {
        throw new Error("PDF file is empty");
      }

      // Convert ArrayBuffer → base64 string (chunked to avoid stack overflow)
      const bytes = new Uint8Array(response.data);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);

      const fileName = pdf.name.endsWith(".pdf") ? pdf.name : `${pdf.name}.pdf`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      // Write base64 to cache
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: "base64",
      });

      // Open with native PDF viewer / save to Files
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: `Open ${fileName}`,
        });
      } else {
        showToast("Sharing is not available on this device");
      }

      showToast("PDF ready");
    } catch (err: any) {
      console.error("Error opening PDF:", err);
      const errorMsg =
        err?.response?.data?.error || err?.message || "Unknown error";
      showToast(`Failed: ${errorMsg}`);
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
              <Text style={[styles.title, { color: text }]}>Documents</Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                {filteredPdfs.length}{" "}
                {filteredPdfs.length === 1 ? "Document" : "Documents"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
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
                    <Text style={styles.downloadButtonText}>Opening...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="eye" size={18} color="#059669" />
                    <Text style={styles.downloadButtonText}>View</Text>
                  </>
                )}
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Toast Notification */}
      {toast && (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            alignSelf: "center",
            backgroundColor: "#111827",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 8,
            zIndex: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14 }}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },

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
