import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { clearAuthStorage } from '../utils/clearStorage';

const { width, height } = Dimensions.get('window');

const LandingScreen: React.FC = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const motivationalQuotes = [
    "Together, we can make our cities cleaner and greener",
    "Every small step towards cleanliness counts",
    "Be the change you wish to see in your community",
    "Clean surroundings, healthy living",
    "Your waste today is tomorrow's resource"
  ];

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotate quotes
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 4000);

    return () => clearInterval(quoteInterval);
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('Login' as never);
  };

  const handleClearStorage = async () => {
    console.log('Clearing auth storage...');
    await clearAuthStorage();
    alert('Storage cleared! Please restart the app.');
  };

  const features = [
    {
      icon: 'schedule',
      title: 'Smart Scheduling',
      description: 'Schedule waste pickups at your convenience',
      color: '#4CAF50',
    },
    {
      icon: 'qr-code-scanner',
      title: 'QR Verification',
      description: 'Secure QR-based pickup verification system',
      color: '#2196F3',
    },
    {
      icon: 'location-on',
      title: 'Real-time Tracking',
      description: 'Track waste collection in real-time',
      color: '#FF9800',
    },
    {
      icon: 'analytics',
      title: 'Impact Analytics',
      description: 'See your environmental impact',
      color: '#9C27B0',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e88e5" />
      
      <LinearGradient
        colors={['#1e88e5', '#1565c0', '#0d47a1']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo and Title */}
            <Animated.View
              style={[
                styles.logoContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons
                  name="leaf-circle"
                  size={80}
                  color="#fff"
                />
              </View>
            </Animated.View>

            <Text style={styles.appTitle}>Swacch-Saarthii</Text>
            <Text style={styles.tagline}>स्वच्छ साथी</Text>
            <Text style={styles.subtitle}>
              Your Partner in Clean & Green Living
            </Text>

            {/* Motivational Quote */}
            <Animated.View style={styles.quoteContainer}>
              <MaterialIcons name="format-quote" size={24} color="#FFD700" />
              <Text style={styles.quoteText}>
                {motivationalQuotes[currentQuoteIndex]}
              </Text>
            </Animated.View>
          </Animated.View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Why Choose Swacch-Saarthii?</Text>
            
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.featureCard,
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: slideAnim,
                        },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                    <MaterialIcons
                      name={feature.icon as any}
                      size={30}
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Mission Statement */}
          <View style={styles.missionSection}>
            <MaterialCommunityIcons
              name="earth"
              size={50}
              color="#4CAF50"
            />
            <Text style={styles.missionTitle}>Our Mission</Text>
            <Text style={styles.missionText}>
              Empowering communities to build cleaner, healthier, and more
              sustainable cities through smart waste management solutions.
            </Text>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>50K+</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>100+</Text>
              <Text style={styles.statLabel}>Cities</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500T</Text>
              <Text style={styles.statLabel}>Waste Managed</Text>
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>
              Join the Clean Revolution Today!
            </Text>
            <Text style={styles.ctaSubtitle}>
              Be part of the change. Start your journey towards a cleaner tomorrow.
            </Text>

            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Register' as never)}
            >
              <Text style={styles.secondaryButtonText}>
                New User? Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Debug Button - Remove in production */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={handleClearStorage}
            >
              <Text style={styles.debugButtonText}>Clear Storage (Debug)</Text>
            </TouchableOpacity>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Made with ❤️ for a Cleaner India
            </Text>
            <View style={styles.socialIcons}>
              <MaterialCommunityIcons
                name="facebook"
                size={24}
                color="#fff"
                style={styles.socialIcon}
              />
              <MaterialCommunityIcons
                name="twitter"
                size={24}
                color="#fff"
                style={styles.socialIcon}
              />
              <MaterialCommunityIcons
                name="instagram"
                size={24}
                color="#fff"
                style={styles.socialIcon}
              />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  tagline: {
    fontSize: 24,
    color: '#FFD700',
    marginBottom: 10,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 30,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quoteText: {
    color: '#fff',
    fontSize: 16,
    fontStyle: 'italic',
    marginLeft: 10,
    flex: 1,
    textAlign: 'center',
  },
  featuresSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  missionSection: {
    backgroundColor: '#fff',
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  missionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 15,
  },
  missionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 30,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e88e5',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#ddd',
  },
  ctaSection: {
    backgroundColor: '#fff',
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  getStartedButton: {
    width: '100%',
    marginBottom: 15,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  secondaryButtonText: {
    color: '#1e88e5',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 30,
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 15,
  },
  socialIcons: {
    flexDirection: 'row',
  },
  socialIcon: {
    marginHorizontal: 15,
    opacity: 0.8,
  },
  debugButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  debugButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default LandingScreen;