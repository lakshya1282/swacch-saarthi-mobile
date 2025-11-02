import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiService from '../../services/apiService';

interface Complaint {
  _id: string;
  complaintId: string;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  resolution?: {
    resolutionNotes?: string;
    resolvedAt?: string;
  };
}

const AdminComplaintsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const filterParam = (route.params as any)?.filter;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>(filterParam || 'All');
  
  // Modal states
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, selectedFilter, searchQuery]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const response = await apiService.getComplaints();
      
      if (response.data.success) {
        const complaintsData = response.data.complaints || response.data.data || [];
        setComplaints(complaintsData);
      }
    } catch (error) {
      console.error('Error loading complaints:', error);
      Alert.alert('Error', 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadComplaints();
    setRefreshing(false);
  };

  const filterComplaints = () => {
    let filtered = complaints;

    // Apply status filter
    if (selectedFilter !== 'All') {
      filtered = filtered.filter(c => c.status === selectedFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.complaintId.toLowerCase().includes(query) ||
        c.citizenName.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query)
      );
    }

    setFilteredComplaints(filtered);
  };

  const handleComplaintPress = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setModalVisible(true);
  };

  const handleUpdateStatus = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setResolutionNotes('');
    setActionModalVisible(true);
  };

  const submitStatusUpdate = async () => {
    if (!selectedComplaint) return;

    try {
      setUpdating(true);

      const statusData: any = {
        status: newStatus,
        notes: resolutionNotes || `Status changed to ${newStatus}`,
      };

      await apiService.updateComplaintStatus(selectedComplaint._id, statusData);

      Alert.alert('Success', 'Complaint status updated successfully');
      setActionModalVisible(false);
      await loadComplaints();
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update complaint status'
      );
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#FF9800';
      case 'In Progress':
        return '#9C27B0';
      case 'Resolved':
        return '#4CAF50';
      case 'Closed':
        return '#757575';
      case 'Rejected':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return '#F44336';
      case 'High':
        return '#FF5722';
      case 'Medium':
        return '#FF9800';
      case 'Low':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const FilterButton = ({ title, value }: { title: string; value: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === value && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === value && styles.filterButtonTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderComplaintCard = (complaint: Complaint) => (
    <TouchableOpacity
      key={complaint._id}
      style={styles.complaintCard}
      onPress={() => handleComplaintPress(complaint)}
    >
      <View style={styles.complaintHeader}>
        <Text style={styles.complaintId}>#{complaint.complaintId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(complaint.status) }]}>
          <Text style={styles.statusText}>{complaint.status}</Text>
        </View>
      </View>

      <Text style={styles.complaintSubject}>{complaint.subject}</Text>
      
      <View style={styles.complaintMeta}>
        <View style={styles.metaRow}>
          <MaterialIcons name="person" size={16} color="#666" />
          <Text style={styles.metaText}>{complaint.citizenName}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialIcons name="category" size={16} color="#666" />
          <Text style={styles.metaText}>{complaint.category}</Text>
        </View>
      </View>

      <View style={styles.complaintFooter}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(complaint.priority) + '20' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(complaint.priority) }]}>
            {complaint.priority}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(complaint.createdAt)}</Text>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={(e) => {
          e.stopPropagation();
          handleUpdateStatus(complaint);
        }}
      >
        <MaterialIcons name="edit" size={18} color="#4CAF50" />
        <Text style={styles.actionButtonText}>Update Status</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Complaints...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Complaints</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, name, or category..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={24} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <FilterButton title="All" value="All" />
        <FilterButton title="Pending" value="Pending" />
        <FilterButton title="In Progress" value="In Progress" />
        <FilterButton title="Resolved" value="Resolved" />
        <FilterButton title="Closed" value="Closed" />
      </ScrollView>

      {/* Complaints List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            {filteredComplaints.length} Complaint{filteredComplaints.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {filteredComplaints.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No complaints found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Complaints will appear here'}
            </Text>
          </View>
        ) : (
          filteredComplaints.map(renderComplaintCard)
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Complaint Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedComplaint && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Complaint Details</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Complaint ID</Text>
                  <Text style={styles.detailValue}>#{selectedComplaint.complaintId}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedComplaint.status) }]}>
                    <Text style={styles.statusText}>{selectedComplaint.status}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Citizen Information</Text>
                  <Text style={styles.detailValue}>{selectedComplaint.citizenName}</Text>
                  <Text style={styles.detailValueSub}>{selectedComplaint.citizenEmail}</Text>
                  <Text style={styles.detailValueSub}>{selectedComplaint.citizenPhone}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedComplaint.category}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Priority</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedComplaint.priority) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(selectedComplaint.priority) }]}>
                      {selectedComplaint.priority}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Subject</Text>
                  <Text style={styles.detailValue}>{selectedComplaint.subject}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedComplaint.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Submitted On</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedComplaint.createdAt)}</Text>
                </View>

                {selectedComplaint.resolution && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Resolution</Text>
                    <Text style={styles.detailValue}>{selectedComplaint.resolution.resolutionNotes}</Text>
                    {selectedComplaint.resolution.resolvedAt && (
                      <Text style={styles.detailValueSub}>
                        Resolved on: {formatDate(selectedComplaint.resolution.resolvedAt)}
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={() => {
                    setModalVisible(false);
                    handleUpdateStatus(selectedComplaint);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color="#fff" />
                  <Text style={styles.modalActionButtonText}>Update Status</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Action Modal (Update Status) */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Complaint Status</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>New Status</Text>
            <View style={styles.statusOptions}>
              {['Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    newStatus === status && styles.statusOptionSelected,
                  ]}
                  onPress={() => setNewStatus(status)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      newStatus === status && styles.statusOptionTextSelected,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add notes about this status update..."
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.submitButton, updating && styles.submitButtonDisabled]}
              onPress={submitStatusUpdate}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Update Status</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  listHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  complaintCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  complaintId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  complaintSubject: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  complaintMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  bottomPadding: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailValueSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalActionButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusOptions: {
    marginBottom: 20,
  },
  statusOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  statusOptionSelected: {
    backgroundColor: '#4CAF50',
  },
  statusOptionText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  statusOptionTextSelected: {
    color: '#fff',
  },
  textArea: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AdminComplaintsScreen;
