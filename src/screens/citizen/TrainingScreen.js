import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const TrainingScreen = () => {
  const [currentModule, setCurrentModule] = useState(0);
  const [completedModules, setCompletedModules] = useState([]);
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [userScore, setUserScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const trainingModules = [
    {
      id: 1,
      title: 'Waste Segregation Basics',
      description: 'Learn the fundamentals of waste segregation',
      content: [
        {
          type: 'text',
          title: 'Why Segregate Waste?',
          content: 'Waste segregation at source is the most important step in waste management. It helps in:\n• Reducing landfill burden\n• Enabling recycling\n• Preventing environmental pollution\n• Making waste processing more efficient',
        },
        {
          type: 'image',
          title: 'Three Types of Waste',
          content: 'waste_types.png', // You would add this image to assets
          description: 'Dry waste (Blue bin), Wet waste (Green bin), Hazardous waste (Red bin)',
        },
      ],
      quiz: {
        question: 'Which bin should kitchen vegetable peels go into?',
        options: ['Blue bin (Dry)', 'Green bin (Wet)', 'Red bin (Hazardous)', 'Any bin'],
        correctAnswer: 1,
        explanation: 'Kitchen vegetable peels are organic waste and should go into the green bin for wet waste.',
      },
    },
    {
      id: 2,
      title: 'Dry Waste Management',
      description: 'Learn about recyclable dry waste',
      content: [
        {
          type: 'text',
          title: 'What is Dry Waste?',
          content: 'Dry waste includes:\n• Paper and cardboard\n• Plastic bottles and containers\n• Metal cans and foils\n• Glass bottles and jars\n• Cloth and textiles\n• Electronics (e-waste)',
        },
        {
          type: 'text',
          title: 'How to Prepare Dry Waste',
          content: '• Clean containers before disposal\n• Remove labels when possible\n• Separate different materials\n• Fold cardboard to save space\n• Keep electronics separate for e-waste collection',
        },
      ],
      quiz: {
        question: 'Which of these should NOT go in dry waste?',
        options: ['Plastic bottle', 'Banana peel', 'Newspaper', 'Glass jar'],
        correctAnswer: 1,
        explanation: 'Banana peel is organic matter and should go in wet waste (green bin).',
      },
    },
    {
      id: 3,
      title: 'Wet Waste and Composting',
      description: 'Learn about organic waste and home composting',
      content: [
        {
          type: 'text',
          title: 'What is Wet Waste?',
          content: 'Wet waste includes all biodegradable organic matter:\n• Kitchen scraps (vegetable peels, fruit rinds)\n• Food leftovers\n• Garden waste (leaves, small branches)\n• Tea bags and coffee grounds\n• Eggshells',
        },
        {
          type: 'text',
          title: 'Home Composting Benefits',
          content: '• Reduces household waste by 30-40%\n• Creates nutrient-rich soil amendment\n• Reduces methane emissions from landfills\n• Saves money on fertilizers\n• Easy to implement at home',
        },
        {
          type: 'text',
          title: 'Simple Composting Steps',
          content: '1. Use a compost bin or designated area\n2. Layer green (wet) and brown (dry) materials\n3. Turn the compost weekly\n4. Keep moisture balanced\n5. Compost will be ready in 2-3 months',
        },
      ],
      quiz: {
        question: 'How much household waste can home composting reduce?',
        options: ['10-20%', '30-40%', '50-60%', '70-80%'],
        correctAnswer: 1,
        explanation: 'Home composting can reduce household waste by 30-40% as organic waste makes up a large portion of household waste.',
      },
    },
    {
      id: 4,
      title: 'Hazardous Waste Handling',
      description: 'Learn about dangerous waste materials',
      content: [
        {
          type: 'text',
          title: 'What is Hazardous Waste?',
          content: 'Hazardous waste includes:\n• Batteries (all types)\n• Electronic devices and components\n• CFL bulbs and tube lights\n• Paint and chemical containers\n• Medical waste (syringes, medicines)\n• Pesticide containers',
        },
        {
          type: 'text',
          title: 'Why Special Handling?',
          content: 'Hazardous waste contains toxic substances that can:\n• Pollute soil and groundwater\n• Harm human health\n• Damage the environment\n• Require specialized disposal methods',
        },
        {
          type: 'text',
          title: 'Proper Disposal',
          content: '• Never mix with other waste\n• Use designated collection points\n• Contact municipal authorities for pickup\n• Some retailers accept old electronics\n• Follow local guidelines for disposal',
        },
      ],
      quiz: {
        question: 'Where should old mobile phones be disposed?',
        options: ['Regular dustbin', 'Wet waste bin', 'Hazardous waste collection', 'Roadside'],
        correctAnswer: 2,
        explanation: 'Mobile phones contain toxic materials and should go to hazardous waste collection points or e-waste facilities.',
      },
    },
    {
      id: 5,
      title: 'Waste Reduction Tips',
      description: 'Learn to reduce waste generation',
      content: [
        {
          type: 'text',
          title: 'The 5 Rs of Waste Management',
          content: '1. REFUSE: Say no to unnecessary items\n2. REDUCE: Use less, buy less\n3. REUSE: Find new purposes for items\n4. RECYCLE: Process materials into new products\n5. ROT: Compost organic waste',
        },
        {
          type: 'text',
          title: 'Practical Reduction Tips',
          content: '• Use reusable bags for shopping\n• Buy in bulk to reduce packaging\n• Choose products with minimal packaging\n• Repair items instead of discarding\n• Donate or sell items you no longer need\n• Use both sides of paper',
        },
      ],
      quiz: {
        question: 'Which "R" comes first in waste management hierarchy?',
        options: ['Reduce', 'Reuse', 'Refuse', 'Recycle'],
        correctAnswer: 2,
        explanation: 'REFUSE comes first - preventing waste generation is better than managing waste after it\'s created.',
      },
    },
  ];

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const progress = await AsyncStorage.getItem('trainingProgress');
      if (progress) {
        setCompletedModules(JSON.parse(progress));
      }
    } catch (error) {
      console.error('Error loading training progress:', error);
    }
  };

  const saveProgress = async (moduleId) => {
    try {
      const newCompleted = [...completedModules, moduleId];
      await AsyncStorage.setItem('trainingProgress', JSON.stringify(newCompleted));
      setCompletedModules(newCompleted);
    } catch (error) {
      console.error('Error saving training progress:', error);
    }
  };

  const startQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setSelectedAnswer(null);
    setQuizModalVisible(true);
  };

  const submitQuiz = () => {
    if (selectedAnswer === null) {
      Alert.alert('Select Answer', 'Please select an answer before submitting.');
      return;
    }

    const isCorrect = selectedAnswer === currentQuiz.correctAnswer;
    if (isCorrect) {
      setUserScore(userScore + 1);
      Alert.alert('Correct!', currentQuiz.explanation, [
        { text: 'Continue', onPress: completeModule }
      ]);
    } else {
      Alert.alert('Incorrect', currentQuiz.explanation, [
        { text: 'Try Again', onPress: () => setSelectedAnswer(null) },
        { text: 'Continue Anyway', onPress: completeModule }
      ]);
    }
  };

  const completeModule = () => {
    const moduleId = trainingModules[currentModule].id;
    if (!completedModules.includes(moduleId)) {
      saveProgress(moduleId);
    }
    setQuizModalVisible(false);
    setCurrentQuiz(null);
    setSelectedAnswer(null);
  };

  const renderModuleContent = (module) => {
    return (
      <ScrollView style={styles.contentContainer}>
        <Text style={styles.moduleTitle}>{module.title}</Text>
        {module.content.map((item, index) => (
          <View key={index} style={styles.contentItem}>
            <Text style={styles.contentTitle}>{item.title}</Text>
            {item.type === 'text' && (
              <Text style={styles.contentText}>{item.content}</Text>
            )}
            {item.type === 'image' && (
              <View style={styles.imageContainer}>
                <View style={styles.imagePlaceholder}>
                  <Icon name="image" size={50} color="#ccc" />
                  <Text style={styles.imageDescription}>{item.description}</Text>
                </View>
              </View>
            )}
          </View>
        ))}
        
        <TouchableOpacity
          style={styles.quizButton}
          onPress={() => startQuiz(module.quiz)}>
          <Icon name="quiz" size={24} color="#fff" />
          <Text style={styles.quizButtonText}>Take Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderQuizModal = () => {
    if (!currentQuiz) return null;

    return (
      <Modal
        visible={quizModalVisible}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.quizQuestion}>{currentQuiz.question}</Text>
            
            {currentQuiz.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === index && styles.selectedOption,
                ]}
                onPress={() => setSelectedAnswer(index)}>
                <Text style={[
                  styles.optionText,
                  selectedAnswer === index && styles.selectedOptionText,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setQuizModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitQuiz}>
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Waste Management Training</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Progress: {completedModules.length}/{trainingModules.length} modules
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedModules.length / trainingModules.length) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>

      <View style={styles.moduleSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {trainingModules.map((module, index) => (
            <TouchableOpacity
              key={module.id}
              style={[
                styles.moduleTab,
                currentModule === index && styles.activeModuleTab,
                completedModules.includes(module.id) && styles.completedModuleTab,
              ]}
              onPress={() => setCurrentModule(index)}>
              <Text style={[
                styles.moduleTabText,
                currentModule === index && styles.activeModuleTabText,
                completedModules.includes(module.id) && styles.completedModuleTabText,
              ]}>
                {completedModules.includes(module.id) && '✓ '}
                Module {module.id}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {renderModuleContent(trainingModules[currentModule])}
      {renderQuizModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  moduleSelector: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  moduleTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeModuleTab: {
    backgroundColor: '#4CAF50',
  },
  completedModuleTab: {
    backgroundColor: '#8BC34A',
  },
  moduleTabText: {
    fontSize: 14,
    color: '#666',
  },
  activeModuleTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  completedModuleTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  moduleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  contentItem: {
    marginBottom: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  imagePlaceholder: {
    width: width - 80,
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imageDescription: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  quizButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  quizButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    padding: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e8',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f44336',
    borderRadius: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginLeft: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default TrainingScreen;
