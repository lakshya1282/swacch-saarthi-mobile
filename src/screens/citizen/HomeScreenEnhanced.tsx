import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, DESIGN_TOKENS } from '../../constants';
import {
  FadeIn,
  SlideInFromBottom,
  ScaleIn,
  Pulse,
  Stagger,
  Card,
  Button,
} from '../../components/common';

const { width: screenWidth } = Dimensions.get('window');

interface UserData {
  firstName: string;
  lastName: string;
  userType: string;
  totalPickups?: number;
  rating?: { average: number };
}

interface PickupStats {
  totalPickups: number;
  completedPickups: number;
  pendingPickups: number;
  segregationRate: number;
  monthlyPickups: number;
  carbonSaved: number;
}

const EnhancedHomeScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pickupStats, setPickupStats] = useState<PickupStats>({
    totalPickups: 0,
    completedPickups: 0,
    pendingPickups: 0,
    segregationRate: 0,
    monthlyPickups: 0,
    carbonSaved: 0,
  });
  const [recentPickups, setRecentPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { logout } = useAuth();

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const pickupsResponse = await apiService.getPickups();
      if (pickupsResponse.data.success) {
        const pickups = pickupsResponse.data.data || pickupsResponse.data.pickups || [];
        const totalPickups = pickups.length;
        const completedPickups = pickups.filter((p: any) => p.status === 'completed').length;
        const pendingPickups = pickups.filter((p: any) => p.status === 'pending').length;
        const segregationRate = totalPickups > 0 ? Math.round((completedPickups / totalPickups) * 100) : 0;
        
        // Calculate additional stats
        const monthlyPickups = pickups.filter((p: any) => {
          const pickupDate = new Date(p.scheduledDate || p.createdAt);
          const currentDate = new Date();
          return pickupDate.getMonth() === currentDate.getMonth() && 
                 pickupDate.getFullYear() === currentDate.getFullYear();
        }).length;
        
        const carbonSaved = completedPickups * 2.5; // Estimate: 2.5 kg CO2 saved per pickup
        
        setPickupStats({
          totalPickups,
          completedPickups,
          pendingPickups,
          segregationRate,
          monthlyPickups,
          carbonSaved,
        });
        
        setRecentPickups(pickups.slice(0, 3));
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      if (error.response?.status === 401) {
        console.log('Authentication error - user will be logged out automatically');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.STATUS.PENDING;
      case 'assigned': return COLORS.STATUS.ASSIGNED;
      case 'in_progress': return COLORS.STATUS.IN_PROGRESS;
      case 'completed': return COLORS.STATUS.COMPLETED;
      case 'cancelled': return COLORS.STATUS.CANCELLED;
      default: return COLORS.NEUTRAL[500];
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const quickActions = [
    {
      title: 'Schedule Pickup',
      subtitle: 'Book waste collection',
      icon: 'schedule',
      gradient: COLORS.GRADIENT.PRIMARY,
      onPress: () => navigation.navigate('Schedule' as never),
    },
    {
      title: 'Training Videos',
      subtitle: 'Learn segregation',
      icon: 'school',
      gradient: COLORS.GRADIENT.ACCENT,
      onPress: () => navigation.navigate('Training' as never),
    },
    {
      title: 'QR Code',
      subtitle: 'View your code',
      icon: 'qr-code',
      gradient: COLORS.GRADIENT.SECONDARY,
      onPress: () => navigation.navigate('QRCode' as never),
    },
    {
      title: 'Waste Guide',
      subtitle: 'Validation help',
      icon: 'help',
      gradient: COLORS.GRADIENT.FOREST,
      onPress: () => navigation.navigate('WasteValidation' as never),
    },
  ];

  const statsCards = [
    {
      title: 'Total Pickups',
      value: pickupStats.totalPickups,
      icon: 'delete',
      color: COLORS.PRIMARY,
      subtitle: 'All time',
    },
    {
      title: 'This Month',
      value: pickupStats.monthlyPickups,
      icon: 'calendar-today',
      color: COLORS.ACCENT,
      subtitle: 'Current month',
    },
    {
      title: 'Segregation Rate',
      value: `${pickupStats.segregationRate}%`,
      icon: 'eco',
      color: COLORS.SUCCESS,
      subtitle: 'Accuracy',
    },
    {
      title: 'Carbon Saved',
      value: `${pickupStats.carbonSaved}kg`,
      icon: 'nature',
      color: COLORS.SUCCESS,
      subtitle: 'CO₂ equivalent',
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Pulse>
          <MaterialIcons name="eco" size={64} color={COLORS.PRIMARY} />
        </Pulse>
        <FadeIn delay={300}>
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </FadeIn>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={COLORS.GRADIENT.PRIMARY}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FadeIn>
            <View style={styles.headerContent}>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>
                  {userData ? `${userData.firstName} ${userData.lastName}` : 'User'}
                </Text>
                <Text style={styles.userSubtitle}>Eco Warrior 🌱</Text>
              </View>
              
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <MaterialIcons name="logout" size={24} color={COLORS.TEXT.WHITE} />
              </TouchableOpacity>
            </View>
          </FadeIn>

          {/* Quick Stats Summary */}
          <SlideInFromBottom delay={200}>
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pickupStats.totalPickups}</Text>
                <Text style={styles.statLabel}>Total Pickups</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pickupStats.completedPickups}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pickupStats.segregationRate}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
            </View>
          </SlideInFromBottom>
        </LinearGradient>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Stats Grid */}
          <FadeIn delay={400}>
            <Text style={styles.sectionTitle}>Your Impact</Text>
          </FadeIn>
          
          <Stagger staggerDelay={100} initialDelay={500}>
            <View style={styles.statsGrid}>
              {statsCards.map((stat, index) => (
                <ScaleIn key={index} delay={600 + index * 100}>
                  <Card style={styles.statCard} shadow="small">
                    <View style={styles.statCardContent}>
                      <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                        <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
                      </View>
                      <Text style={styles.statCardValue}>{stat.value}</Text>
                      <Text style={styles.statCardTitle}>{stat.title}</Text>
                      <Text style={styles.statCardSubtitle}>{stat.subtitle}</Text>
                    </View>
                  </Card>
                </ScaleIn>
              ))}
            </View>
          </Stagger>

          {/* Quick Actions */}
          <FadeIn delay={800}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </FadeIn>
          
          <Stagger staggerDelay={100} initialDelay={900}>
            <View style={styles.actionsGrid}>
              {quickActions.map((action, index) => (
                <SlideInFromBottom key={index} delay={1000 + index * 100}>
                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={action.gradient}
                      style={styles.actionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <MaterialIcons name={action.icon as any} size={28} color={COLORS.TEXT.WHITE} />
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </SlideInFromBottom>
              ))}
            </View>
          </Stagger>

          {/* Recent Pickups */}
          {recentPickups.length > 0 && (
            <>
              <FadeIn delay={1200}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </FadeIn>
              
              <Stagger staggerDelay={100} initialDelay={1300}>
                {recentPickups.map((pickup, index) => (
                  <SlideInFromBottom key={pickup._id || index} delay={1400 + index * 100}>
                    <Card style={styles.pickupCard} variant="outlined">
                      <View style={styles.pickupHeader}>
                        <Text style={styles.pickupId}>#{pickup.pickupId}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pickup.status) }]}>
                          <Text style={styles.statusText}>
                            {pickup.status?.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.pickupDetails}>
                        <View style={styles.pickupDetailRow}>
                          <MaterialIcons name="schedule" size={16} color={COLORS.TEXT.SECONDARY} />
                          <Text style={styles.pickupDetailText}>
                            {new Date(pickup.scheduledDate).toLocaleDateString()}
                          </Text>
                        </View>
                        
                        <View style={styles.pickupDetailRow}>
                          <MaterialIcons name="delete" size={16} color={COLORS.TEXT.SECONDARY} />
                          <Text style={styles.pickupDetailText}>
                            {pickup.wasteTypes?.join(', ') || 'Mixed waste'}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </SlideInFromBottom>
                ))}
              </Stagger>
              
              <FadeIn delay={1600}>
                <Button
                  title="View All History"
                  variant="ghost"
                  icon="history"
                  onPress={() => navigation.navigate('PickupHistory' as never)}
                  style={styles.viewAllButton}
                />
              </FadeIn>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: DESIGN_TOKENS.SPACING.MD,
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.SECONDARY,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  
  // Header Styles
  header: {
    paddingTop: 60,
    paddingBottom: DESIGN_TOKENS.SPACING.XL,
    paddingHorizontal: DESIGN_TOKENS.SPACING.LG,
    borderBottomLeftRadius: DESIGN_TOKENS.BORDER_RADIUS.XL,
    borderBottomRightRadius: DESIGN_TOKENS.BORDER_RADIUS.XL,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DESIGN_TOKENS.SPACING.XL,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.WHITE,
    opacity: 0.9,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.NORMAL,
  },
  userName: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.XXL,
    color: COLORS.TEXT.WHITE,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.BOLD,
    marginTop: DESIGN_TOKENS.SPACING.XS,
  },
  userSubtitle: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.WHITE,
    opacity: 0.8,
    marginTop: DESIGN_TOKENS.SPACING.XS,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  logoutButton: {
    padding: DESIGN_TOKENS.SPACING.SM,
    borderRadius: DESIGN_TOKENS.BORDER_RADIUS.SM,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: DESIGN_TOKENS.BORDER_RADIUS.MD,
    padding: DESIGN_TOKENS.SPACING.LG,
    backdropFilter: 'blur(10px)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.XL,
    color: COLORS.TEXT.WHITE,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.BOLD,
  },
  statLabel: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.WHITE,
    opacity: 0.8,
    marginTop: DESIGN_TOKENS.SPACING.XS,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: DESIGN_TOKENS.SPACING.MD,
  },
  
  // Main Content
  mainContent: {
    padding: DESIGN_TOKENS.SPACING.LG,
  },
  sectionTitle: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.LG,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.BOLD,
    marginBottom: DESIGN_TOKENS.SPACING.MD,
    marginTop: DESIGN_TOKENS.SPACING.LG,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DESIGN_TOKENS.SPACING.MD,
    marginBottom: DESIGN_TOKENS.SPACING.LG,
  },
  statCard: {
    flex: 1,
    minWidth: (screenWidth - DESIGN_TOKENS.SPACING.LG * 2 - DESIGN_TOKENS.SPACING.MD) / 2,
    padding: DESIGN_TOKENS.SPACING.LG,
  },
  statCardContent: {
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DESIGN_TOKENS.SPACING.SM,
  },
  statCardValue: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.XL,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.BOLD,
    marginBottom: DESIGN_TOKENS.SPACING.XS,
  },
  statCardTitle: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.SEMIBOLD,
    textAlign: 'center',
    marginBottom: DESIGN_TOKENS.SPACING.XS,
  },
  statCardSubtitle: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
  },
  
  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DESIGN_TOKENS.SPACING.MD,
    marginBottom: DESIGN_TOKENS.SPACING.LG,
  },
  actionCard: {
    flex: 1,
    minWidth: (screenWidth - DESIGN_TOKENS.SPACING.LG * 2 - DESIGN_TOKENS.SPACING.MD) / 2,
    borderRadius: DESIGN_TOKENS.BORDER_RADIUS.MD,
    overflow: 'hidden',
    ...DESIGN_TOKENS.SHADOWS.SMALL,
  },
  actionGradient: {
    padding: DESIGN_TOKENS.SPACING.LG,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.WHITE,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.SEMIBOLD,
    marginTop: DESIGN_TOKENS.SPACING.SM,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.WHITE,
    opacity: 0.9,
    marginTop: DESIGN_TOKENS.SPACING.XS,
    textAlign: 'center',
  },
  
  // Pickup Cards
  pickupCard: {
    marginBottom: DESIGN_TOKENS.SPACING.MD,
    padding: DESIGN_TOKENS.SPACING.MD,
  },
  pickupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DESIGN_TOKENS.SPACING.SM,
  },
  pickupId: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.SEMIBOLD,
  },
  statusBadge: {
    paddingHorizontal: DESIGN_TOKENS.SPACING.SM,
    paddingVertical: DESIGN_TOKENS.SPACING.XS,
    borderRadius: DESIGN_TOKENS.BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.WHITE,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  pickupDetails: {
    gap: DESIGN_TOKENS.SPACING.XS,
  },
  pickupDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DESIGN_TOKENS.SPACING.SM,
  },
  pickupDetailText: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.SECONDARY,
    flex: 1,
  },
  
  // View All Button
  viewAllButton: {
    marginTop: DESIGN_TOKENS.SPACING.MD,
  },
});

export default EnhancedHomeScreen;