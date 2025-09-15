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
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import apiService from '../../services/api.service';

interface PickupRecord {
  _id: string;
  pickupId: string;
  verificationCode: string;
  wasteTypes: string[];
  estimatedWeight: string;
  actualWeight?: number;
  timeSlot: string;
  scheduledDate: string;
  status: string;
  citizenRating?: {
    rating: number;
    feedback: string;
    ratedAt: string;
  };
  workerRating?: {
    rating: number;
    feedback: string;
  };
  cancellationReason?: string;
  completionNotes?: string;
  createdAt: string;
  completedAt?: string;
  workerId?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  canReview: boolean;
  showVerificationCode: boolean;
  rejectionReason?: string;
}

interface PickupStats {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
}

const PickupHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [pickups, setPickups] = useState<PickupRecord[]>([]);
  const [stats, setStats] = useState<PickupStats>({
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<PickupRecord | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchPickupHistory = async () => {
    try {
      const response = await apiService.getPickupHistory();
      setPickups(response.data || []);
      setStats(response.stats || {
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
      });
    } catch (error) {
      console.error('Error fetching pickup history:', error);
      Alert.alert('Error', 'Failed to load pickup history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPickupHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPickupHistory();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#4CAF50';
      case 'scheduled':
      case 'assigned':
        return '#2196F3';
      case 'in_progress':
        return '#FF9800';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'check-circle';
      case 'scheduled':
        return 'schedule';
      case 'assigned':
        return 'assignment-ind';
      case 'in_progress':
        return 'local-shipping';
      case 'cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeSlot: string) => {
    const slots: Record<string, string> = {
      morning: '6:00 AM - 10:00 AM',
      midday: '10:00 AM - 2:00 PM',
      afternoon: '2:00 PM - 6:00 PM',
      evening: '6:00 PM - 8:00 PM',
    };
    return slots[timeSlot] || timeSlot;
  };

  const filteredPickups = pickups.filter(pickup => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') {
      return ['scheduled', 'assigned', 'in_progress'].includes(pickup.status.toLowerCase());
    }
    return pickup.status.toLowerCase() === selectedFilter;
  });

  const openReviewModal = (pickup: PickupRecord) => {
    setSelectedPickup(pickup);
    setRating(0);
    setFeedback('');
    setReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedPickup) return;
    
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setSubmittingReview(true);
    try {
      await apiService.submitPickupReview(selectedPickup.pickupId, rating, feedback);
      Alert.alert('Success', 'Review submitted successfully');
      setReviewModal(false);
      fetchPickupHistory();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStarRating = () => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <MaterialIcons
              name={star <= rating ? 'star' : 'star-border'}
              size={40}
              color={star <= rating ? '#FFD700' : '#ccc'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPickupCard = (pickup: PickupRecord) => {
    const statusColor = getStatusColor(pickup.status);
    const statusIcon = getStatusIcon(pickup.status);

    return (
      <View key={pickup._id} style={styles.pickupCard}>
        <View style={styles.cardHeader}>
          <View style={styles.pickupIdContainer}>
            <Text style={styles.pickupId}>#{pickup.pickupId}</Text>
            <Text style={styles.pickupDate}>{formatDate(pickup.scheduledDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <MaterialIcons name={statusIcon as any} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {pickup.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MaterialIcons name="delete" size={18} color="#666" />
            <Text style={styles.infoText}>
              {pickup.wasteTypes.join(', ')} - {pickup.estimatedWeight}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="access-time" size={18} color="#666" />
            <Text style={styles.infoText}>{formatTime(pickup.timeSlot)}</Text>
          </View>

          {pickup.workerId && (
            <View style={styles.infoRow}>
              <MaterialIcons name="person" size={18} color="#666" />
              <Text style={styles.infoText}>
                Worker: {pickup.workerId.firstName} {pickup.workerId.lastName}
              </Text>
            </View>
          )}

          {pickup.showVerificationCode && (
            <View style={styles.verificationContainer}>
              <MaterialIcons name="verified-user" size={18} color="#4CAF50" />
              <Text style={styles.verificationLabel}>Verification Code:</Text>
              <Text style={styles.verificationCode}>{pickup.verificationCode}</Text>
            </View>
          )}

          {pickup.status === 'cancelled' && pickup.cancellationReason && (
            <View style={styles.rejectionContainer}>
              <MaterialIcons name="info" size={18} color="#f44336" />
              <Text style={styles.rejectionText}>
                Reason: {pickup.cancellationReason}
              </Text>
            </View>
          )}

          {pickup.status === 'completed' && pickup.actualWeight && (
            <View style={styles.infoRow}>
              <MaterialIcons name="scale" size={18} color="#666" />
              <Text style={styles.infoText}>
                Actual Weight: {pickup.actualWeight} kg
              </Text>
            </View>
          )}

          {pickup.citizenRating && (
            <View style={styles.reviewContainer}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>Your Review:</Text>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialIcons
                      key={star}
                      name={star <= pickup.citizenRating!.rating ? 'star' : 'star-border'}
                      size={16}
                      color="#FFD700"
                    />
                  ))}
                </View>
              </View>
              {pickup.citizenRating.feedback && (
                <Text style={styles.reviewFeedback}>{pickup.citizenRating.feedback}</Text>
              )}
            </View>
          )}

          {pickup.canReview && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => openReviewModal(pickup)}>
              <MaterialIcons name="rate-review" size={20} color="white" />
              <Text style={styles.reviewButtonText}>Leave a Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Pickups</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#2196F3' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f44336' }]}>{stats.cancelled}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}>
        {(['all', 'pending', 'completed', 'cancelled'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.filterTabActive,
            ]}
            onPress={() => setSelectedFilter(filter)}>
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === filter && styles.filterTabTextActive,
              ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pickup List */}
      <ScrollView
        style={styles.pickupList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredPickups.length > 0 ? (
          filteredPickups.map(renderPickupCard)
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No pickups found</Text>
          </View>
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={reviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Your Pickup</Text>
              <TouchableOpacity onPress={() => setReviewModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              How was your experience with pickup #{selectedPickup?.pickupId}?
            </Text>

            {renderStarRating()}

            <TextInput
              style={styles.feedbackInput}
              placeholder="Share your feedback (optional)"
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setReviewModal(false)}>
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitModalButton]}
                onPress={submitReview}
                disabled={submittingReview}>
                {submittingReview ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitModalButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    marginTop: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 1,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#4CAF50',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
  },
  filterTabTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  pickupList: {
    flex: 1,
    padding: 16,
  },
  pickupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickupIdContainer: {
    flex: 1,
  },
  pickupId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pickupDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  verificationLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  verificationCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectionText: {
    fontSize: 14,
    color: '#f44336',
    marginLeft: 8,
    flex: 1,
  },
  reviewContainer: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewFeedback: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
  },
  submitModalButton: {
    backgroundColor: '#4CAF50',
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: '#666',
  },
  submitModalButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default PickupHistoryScreen;