// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/hooks/useToast";

export default function BlocksAndUnits() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState({});

  useEffect(() => {
    if (blocks.length > 0) {
      const collapsed = {};
      blocks.forEach((b) => {
        if (collapsedBlocks[b.id] === undefined) collapsed[b.id] = true;
      });
      if (Object.keys(collapsed).length > 0)
        setCollapsedBlocks(prev => ({ ...prev, ...collapsed }));
    }
  }, [blocks.length]);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [blockForm, setBlockForm] = useState({ name: "", description: "" });
  const [blockLoading, setBlockLoading] = useState(false);

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitCreationStep, setUnitCreationStep] = useState(1);
  const [unitsToCreate, setUnitsToCreate] = useState(1);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [currentUnitNumber, setCurrentUnitNumber] = useState("");
  const [createdUnits, setCreatedUnits] = useState([]);
  const [unitBlockId, setUnitBlockId] = useState(null);
  const [unitLoading, setUnitLoading] = useState(false);
  const [deleteBlockId, setDeleteBlockId] = useState(null);
  const [deletingBlock, setDeletingBlock] = useState(false);
  const [deleteUnitId, setDeleteUnitId] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(false);

  const { toast, showError, showSuccess, showInfo, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => { fetchBlocks(); }, []);

  const fetchBlocks = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      const res = await axios.get(`${url}/admin/blocks`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });
      const data = res.data.blocks || res.data.data || res.data;
      setBlocks(Array.isArray(data) ? data : []);
    } catch {
      showError("Failed to load blocks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateBlock = async () => {
    if (!blockForm.name.trim()) { showError("Block name is required"); return; }
    setBlockLoading(true);
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      const method = editingBlock ? "put" : "post";
      const endpoint = editingBlock ? `${url}/admin/blocks/${editingBlock.id}` : `${url}/admin/blocks`;
      await axios[method](endpoint, { ...blockForm, communityId }, { headers: { Authorization: `Bearer ${token}` } });
      showSuccess(editingBlock ? "Block updated!" : "Block created!");
      setShowBlockModal(false);
      setBlockForm({ name: "", description: "" });
      setEditingBlock(null);
      fetchBlocks();
    } catch (e) {
      showError(e.response?.data?.message || "Failed to save block");
    } finally {
      setBlockLoading(false);
    }
  };

  const confirmDeleteBlock = async () => {
    setDeletingBlock(true);
    try {
      const token = await getToken();
      await axios.delete(`${url}/admin/blocks/${deleteBlockId}`, { headers: { Authorization: `Bearer ${token}` } });
      showSuccess("Block deleted!");
      fetchBlocks();
    } catch (e) {
      showError(e.response?.data?.message || "Failed to delete block");
    } finally {
      setDeletingBlock(false);
      setDeleteBlockId(null);
    }
  };

  const confirmDeleteUnit = async () => {
    setDeletingUnit(true);
    try {
      const token = await getToken();
      await axios.delete(`${url}/admin/units/${deleteUnitId}`, { headers: { Authorization: `Bearer ${token}` } });
      showSuccess("Unit deleted!");
      fetchBlocks();
    } catch (e) {
      showError(e.response?.data?.message || "Failed to delete unit");
    } finally {
      setDeletingUnit(false);
      setDeleteUnitId(null);
    }
  };

  const handleCreateUnit = async () => {
    if (!currentUnitNumber.trim()) { showError("Unit number required"); return; }
    setUnitLoading(true);
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      await axios.post(`${url}/admin/units`,
        { number: currentUnitNumber.trim(), blockId: unitBlockId, communityId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCreatedUnits(prev => [...prev, { number: currentUnitNumber.trim() }]);
      if (currentUnitIndex + 1 < unitsToCreate) {
        showSuccess(`Unit ${currentUnitNumber} created!`);
        setCurrentUnitIndex(prev => prev + 1);
        setCurrentUnitNumber("");
      } else {
        showSuccess(`All ${unitsToCreate} units created!`);
        setShowUnitModal(false);
        resetUnitForm();
        fetchBlocks();
      }
    } catch (e) {
      showError(e.response?.data?.message || "Failed to create unit");
    } finally {
      setUnitLoading(false);
    }
  };

  const resetUnitForm = () => {
    setUnitCreationStep(1); setUnitsToCreate(1); setCurrentUnitIndex(0);
    setCurrentUnitNumber(""); setCreatedUnits([]); setUnitBlockId(null);
  };

  const startCreateUnit = (blockId) => {
    setUnitBlockId(blockId); setUnitCreationStep(1); setUnitsToCreate(1);
    setCurrentUnitIndex(0); setCurrentUnitNumber(""); setCreatedUnits([]);
    setShowUnitModal(true);
  };

  const totalUnits = blocks.reduce((s, b) => s + (b.units?.length || 0), 0);
  const occupiedUnits = blocks.reduce((s, b) => s + (b.units?.filter(u => u.residents?.length > 0).length || 0), 0);

  const stats = [
    { label: "Total Blocks", value: blocks.length, icon: "grid", color: "#6366F1" },
    { label: "Total Units", value: totalUnits, icon: "home", color: "#3B82F6" },
    { label: "Occupied", value: occupiedUnits, icon: "users", color: "#10B981" },
    { label: "Vacant", value: totalUnits - occupiedUnits, icon: "unlock", color: "#F59E0B" },
  ];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={tint} />
        <Text style={[styles.loadingText, { color: muted }]}>Loading blocks...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Toast {...toast} onHide={hideToast} />
      <ConfirmModal visible={!!deleteBlockId} title="Delete Block" message="Delete this block and all its units?" onConfirm={confirmDeleteBlock} onCancel={() => setDeleteBlockId(null)} loading={deletingBlock} confirmText="Delete" confirmColor="#EF4444" />
      <ConfirmModal visible={!!deleteUnitId} title="Delete Unit" message="Delete this unit?" onConfirm={confirmDeleteUnit} onCancel={() => setDeleteUnitId(null)} loading={deletingUnit} confirmText="Delete" confirmColor="#EF4444" />

      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 20), borderBottomColor: borderCol, backgroundColor: bg }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: borderCol }]}>
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: textColor }]}>Blocks & Units</Text>
            <Text style={[styles.screenSub, { color: muted }]}>{blocks.length} blocks · {totalUnits} units</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => { setEditingBlock(null); setBlockForm({ name: "", description: "" }); setShowBlockModal(true); }} style={[styles.addBtn, { backgroundColor: tint }]}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Block</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBlocks(); }} tintColor={tint} />}
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.statIconWrap, { backgroundColor: s.color + "1A" }]}>
                <Feather name={s.icon} size={16} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: textColor }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: muted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Blocks */}
        {blocks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.emptyIcon, { backgroundColor: tint + "1A" }]}>
              <Feather name="grid" size={28} color={tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No blocks yet</Text>
            <Text style={[styles.emptyMsg, { color: muted }]}>Create your first block to get started</Text>
          </View>
        ) : (
          blocks.map((block) => {
            const isCollapsed = collapsedBlocks[block.id] !== false;
            const units = block.units || [];
            return (
              <View key={block.id} style={[styles.blockCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                {/* Block header row */}
                <View style={styles.blockTopRow}>
                  <TouchableOpacity style={styles.blockTitleRow} onPress={() => setCollapsedBlocks(prev => ({ ...prev, [block.id]: !isCollapsed }))}>
                    <View style={[styles.blockIcon, { backgroundColor: "#6366F11A" }]}>
                      <Feather name="grid" size={16} color="#6366F1" />
                    </View>
                    <View style={styles.blockTitleWrap}>
                      <Text style={[styles.blockName, { color: textColor }]}>{block.name}</Text>
                      <Text style={[styles.blockMeta, { color: muted }]}>{units.length} unit{units.length !== 1 ? "s" : ""}</Text>
                    </View>
                    <Feather name={isCollapsed ? "chevron-down" : "chevron-up"} size={16} color={muted} />
                  </TouchableOpacity>
                  <View style={styles.blockActions}>
                    <TouchableOpacity onPress={() => startCreateUnit(block.id)} style={[styles.iconBtn, { backgroundColor: tint + "1A" }]}>
                      <Feather name="plus" size={14} color={tint} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingBlock(block); setBlockForm({ name: block.name, description: block.description || "" }); setShowBlockModal(true); }} style={[styles.iconBtn, { backgroundColor: "#F59E0B1A" }]}>
                      <Feather name="edit-2" size={14} color="#F59E0B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeleteBlockId(block.id)} style={[styles.iconBtn, { backgroundColor: "#EF44441A" }]}>
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Units grid */}
                {!isCollapsed && (
                  <View style={[styles.unitsSection, { borderTopColor: borderCol }]}>
                    {units.length === 0 ? (
                      <Text style={[styles.noUnitsText, { color: muted }]}>No units — tap + to add units</Text>
                    ) : (
                      <View style={styles.unitsGrid}>
                        {units.map((unit) => {
                          const occupied = unit.residents?.length > 0;
                          return (
                            <View key={unit.id} style={[styles.unitChip, { backgroundColor: occupied ? "#10B98115" : borderCol, borderColor: occupied ? "#10B98140" : borderCol }]}>
                              <Text style={[styles.unitNum, { color: occupied ? "#10B981" : muted }]}>{unit.number}</Text>
                              <TouchableOpacity onPress={() => setDeleteUnitId(unit.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Feather name="x" size={10} color={occupied ? "#10B981" : muted} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Block Modal */}
      <Modal visible={showBlockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>{editingBlock ? "Edit Block" : "Create Block"}</Text>
              <TouchableOpacity onPress={() => { setShowBlockModal(false); setBlockForm({ name: "", description: "" }); setEditingBlock(null); }} style={[styles.modalClose, { borderColor: borderCol }]}>
                <Feather name="x" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Block Name</Text>
                <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111111" : "#F8FAFC" }]}>
                  <Feather name="grid" size={16} color={muted} />
                  <TextInput style={[styles.fieldInput, { color: textColor }]} placeholder="e.g. Block A, Tower 1" placeholderTextColor={muted} value={blockForm.name} onChangeText={v => setBlockForm(p => ({ ...p, name: v }))} />
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Description (Optional)</Text>
                <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111111" : "#F8FAFC", alignItems: "flex-start", paddingVertical: 10 }]}>
                  <Feather name="file-text" size={16} color={muted} style={{ marginTop: 2 }} />
                  <TextInput style={[styles.fieldInput, { color: textColor }]} placeholder="Brief description" placeholderTextColor={muted} value={blockForm.description} onChangeText={v => setBlockForm(p => ({ ...p, description: v }))} multiline numberOfLines={3} />
                </View>
              </View>
            </View>
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <TouchableOpacity onPress={() => { setShowBlockModal(false); setBlockForm({ name: "", description: "" }); setEditingBlock(null); }} style={[styles.cancelBtn, { borderColor: borderCol }]}>
                <Text style={[styles.cancelBtnText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateBlock} disabled={blockLoading} style={[styles.submitBtn, { backgroundColor: tint, opacity: blockLoading ? 0.6 : 1 }]}>
                {blockLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>{editingBlock ? "Save Changes" : "Create Block"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unit Modal */}
      <Modal visible={showUnitModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {unitCreationStep === 1 ? "How many units?" : `Unit ${currentUnitIndex + 1} of ${unitsToCreate}`}
              </Text>
              <TouchableOpacity onPress={() => { setShowUnitModal(false); resetUnitForm(); }} style={[styles.modalClose, { borderColor: borderCol }]}>
                <Feather name="x" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {unitCreationStep === 1 ? (
                <View style={styles.fieldWrap}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>Number of Units to Create</Text>
                  <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111111" : "#F8FAFC" }]}>
                    <Feather name="hash" size={16} color={muted} />
                    <TextInput style={[styles.fieldInput, { color: textColor }]} placeholder="1–50" placeholderTextColor={muted} value={String(unitsToCreate)} onChangeText={v => setUnitsToCreate(parseInt(v) || 1)} keyboardType="numeric" />
                  </View>
                </View>
              ) : (
                <>
                  {createdUnits.length > 0 && (
                    <View style={styles.createdWrap}>
                      {createdUnits.map((u, i) => (
                        <View key={i} style={[styles.createdChip, { backgroundColor: "#10B98115", borderColor: "#10B98140" }]}>
                          <Feather name="check" size={10} color="#10B981" />
                          <Text style={[styles.createdNum, { color: "#10B981" }]}>{u.number}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.fieldLabel, { color: muted }]}>Unit Number</Text>
                    <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111111" : "#F8FAFC" }]}>
                      <Feather name="home" size={16} color={muted} />
                      <TextInput style={[styles.fieldInput, { color: textColor }]} placeholder="e.g. 101, A-01" placeholderTextColor={muted} value={currentUnitNumber} onChangeText={setCurrentUnitNumber} autoFocus />
                    </View>
                  </View>
                </>
              )}
            </View>
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <TouchableOpacity onPress={() => { setShowUnitModal(false); resetUnitForm(); }} style={[styles.cancelBtn, { borderColor: borderCol }]}>
                <Text style={[styles.cancelBtnText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={unitCreationStep === 1 ? () => { if(unitsToCreate<1||unitsToCreate>50){showError("Enter 1–50");return;} setUnitCreationStep(2); } : handleCreateUnit}
                disabled={unitLoading}
                style={[styles.submitBtn, { backgroundColor: tint, opacity: unitLoading ? 0.6 : 1 }]}
              >
                {unitLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>{unitCreationStep === 1 ? "Next" : currentUnitIndex + 1 < unitsToCreate ? `Add Unit (${currentUnitIndex + 1}/${unitsToCreate})` : "Finish"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  screenSub: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  statCard: { width: "48%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  statIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyMsg: { fontSize: 13, textAlign: "center" },
  blockCard: { borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  blockTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  blockTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  blockIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  blockTitleWrap: { flex: 1 },
  blockName: { fontSize: 15, fontWeight: "700" },
  blockMeta: { fontSize: 12, marginTop: 1 },
  blockActions: { flexDirection: "row", gap: 6, marginLeft: 8 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  unitsSection: { borderTopWidth: 1, padding: 14 },
  noUnitsText: { fontSize: 13, textAlign: "center", paddingVertical: 8 },
  unitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  unitChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  unitNum: { fontSize: 12, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalClose: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: "row", gap: 10, padding: 20, borderTopWidth: 1 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  fieldInput: { flex: 1, fontSize: 15 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  cancelBtnText: { fontSize: 14, fontWeight: "600" },
  submitBtn: { flex: 2, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  createdWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  createdChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  createdNum: { fontSize: 11, fontWeight: "600" },
});
