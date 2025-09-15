import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../../services/apiService';

interface TrainingModule {
  id: number;
  title: string;
  description: string;
  duration: string;
  difficulty: string;
  completed: boolean;
  videoUrl?: string;
}

const TrainingScreen: React.FC = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [showModuleDetail, setShowModuleDetail] = useState(false);

  useEffect(() => {
    loadTrainingModules();
  }, []);

  const loadTrainingModules = async () => {
    try {
      setLoading(true);
      const response = await apiService.request({
        url: '/training/modules',
        method: 'GET',
      });
      
      if (response.data.success) {
        // Add video URLs and enhanced data
        const enhancedModules = response.data.modules.map((module: any) => ({
          ...module,
          videoUrl: getVideoUrl(module.id),
          completed: Math.random() > 0.7, // Random completion for demo
        }));
        setModules(enhancedModules);
      }
    } catch (error) {
      console.error('Error loading training modules:', error);
      Alert.alert('Error', 'Failed to load training modules');
    } finally {
      setLoading(false);
    }
  };

  const getVideoUrl = (moduleId: number): string => {
    // Demo YouTube videos for waste management education
    const videoUrls = {
      1: 'https://www.youtube.com/watch?v=6jQ7y_qQYUA', // Waste Segregation
      2: 'https://www.youtube.com/watch?v=M1kNP4HbAq0', // Recycling
      3: 'https://www.youtube.com/watch?v=0cEp5Y4N6u0', // Composting
      4: 'https://www.youtube.com/watch?v=wbGHqZ7DiZE', // Hazardous Waste
      5: 'https://www.youtube.com/watch?v=G3BmCzcZmFY', // Waste Reduction
    };
    return videoUrls[moduleId as keyof typeof videoUrls] || '';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      default: return '#2196F3';
    }
  };

  const handleModulePress = (module: TrainingModule) => {
    setSelectedModule(module);
    setShowModuleDetail(true);
  };

  const handleStartModule = async () => {
    if (!selectedModule) return;
    
    try {
      if (selectedModule.videoUrl) {
        const supported = await Linking.canOpenURL(selectedModule.videoUrl);
        if (supported) {
          await Linking.openURL(selectedModule.videoUrl);
          // Mark as completed after opening
          setTimeout(() => {
            markModuleCompleted(selectedModule.id);
          }, 2000);
        } else {
          Alert.alert('Error', 'Cannot open video link');
        }
      } else {
        Alert.alert('Info', 'Video content will be available soon');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open video');
    } finally {
      setShowModuleDetail(false);
    }
  };

  const markModuleCompleted = async (moduleId: number) => {
    try {
      await apiService.request({
        url: '/training/progress',
        method: 'POST',
        data: {
          moduleId,
          score: 100,
          completed: true,
        },
      });
      
      // Update local state
      setModules(prev => 
        prev.map(module => 
          module.id === moduleId 
            ? { ...module, completed: true }
            : module
        )
      );
      
      Alert.alert('Congratulations!', 'Module completed successfully!');
    } catch (error) {
      console.error('Error marking module as completed:', error);
    }
  };

  const getCompletionStats = () => {
    const total = modules.length;
    const completed = modules.filter(m => m.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading training modules...</Text>
      </View>
    );
  }

  const stats = getCompletionStats();

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Training Videos</Text>
          <Text style={styles.subtitle}>Learn proper waste segregation</Text>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCard}>
            <MaterialIcons name="school" size={30} color="#2196F3" />
            <View style={styles.progressContent}>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <Text style={styles.progressText}>
                {stats.completed} of {stats.total} modules completed
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${stats.percentage}%` }]} 
                />
              </View>
              <Text style={styles.progressPercentage}>{stats.percentage}%</Text>
            </View>
          </View>
        </View>

        {/* Training Modules */}
        <View style={styles.modulesContainer}>
          <Text style={styles.sectionTitle}>Available Modules</Text>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              onPress={() => handleModulePress(module)}
            >
              <View style={styles.moduleHeader}>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleDescription}>{module.description}</Text>
                </View>
                <View style={styles.moduleStatus}>
                  {module.completed ? (
                    <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                  ) : (
                    <MaterialIcons name="play-circle-filled" size={24} color="#2196F3" />
                  )}
                </View>
              </View>
              
              <View style={styles.moduleFooter}>
                <View style={styles.moduleDetails}>
                  <View style={styles.durationBadge}>
                    <MaterialIcons name="access-time" size={16} color="#666" />
                    <Text style={styles.durationText}>{module.duration}</Text>
                  </View>
                  <View style={[
                    styles.difficultyBadge, 
                    { backgroundColor: getDifficultyColor(module.difficulty) }
                  ]}>
                    <Text style={styles.difficultyText}>{module.difficulty}</Text>
                  </View>
                </View>
                {module.completed && (
                  <Text style={styles.completedText}>✓ Completed</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Module Detail Modal */}
      <Modal
        visible={showModuleDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModuleDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedModule && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedModule.title}</Text>
                  <TouchableOpacity
                    onPress={() => setShowModuleDetail(false)}
                    style={styles.closeButton}
                  >
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalDescription}>{selectedModule.description}</Text>
                
                <View style={styles.modalDetails}>
                  <View style={styles.modalDetailItem}>
                    <MaterialIcons name="access-time" size={20} color="#666" />
                    <Text style={styles.modalDetailText}>Duration: {selectedModule.duration}</Text>
                  </View>
                  <View style={styles.modalDetailItem}>
                    <MaterialIcons name="trending-up" size={20} color="#666" />
                    <Text style={styles.modalDetailText}>Level: {selectedModule.difficulty}</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={handleStartModule}
                >
                  <MaterialIcons 
                    name={selectedModule.completed ? 'replay' : 'play-arrow'} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.startButtonText}>
                    {selectedModule.completed ? 'Watch Again' : 'Start Module'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
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
  progressContainer: {
    padding: 20,
  },
  progressCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
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
  progressContent: {
    flex: 1,
    marginLeft: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'right',
  },
  modulesContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  moduleCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  moduleInfo: {
    flex: 1,
    marginRight: 12,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  moduleStatus: {
    alignItems: 'center',
  },
  moduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  completedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalDetails: {
    marginBottom: 24,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDetailText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TrainingScreen;
