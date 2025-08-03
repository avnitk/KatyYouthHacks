import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BlynkService from './BlynkService';
import { CONFIG } from './config';

const SettingsModal = ({ visible, onClose, onConnectionChange }) => {
  const [authToken, setAuthToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      let savedToken = await AsyncStorage.getItem('blynk_auth_token');
      
      if (!savedToken) {
        savedToken = CONFIG.BLYNK.AUTH_TOKEN;
        console.log('🔑 Loading auth token from config:', savedToken);
      } else {
        console.log('🔑 Loading saved auth token');
      }
      
      if (savedToken && savedToken !== 'YOUR_BLYNK_AUTH_TOKEN') {
        setAuthToken(savedToken);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('blynk_auth_token', authToken);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  const testConnection = async () => {
    const tokenToTest = authToken.trim() || CONFIG.BLYNK.AUTH_TOKEN;
    
    if (!tokenToTest || tokenToTest === 'YOUR_BLYNK_AUTH_TOKEN') {
      Alert.alert('Error', 'Please enter your Blynk Auth Token');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');
    setDebugInfo('Testing connection...');

    try {
      console.log('🧪 Testing connection with token:', tokenToTest);
      
      const authValid = await BlynkService.testAuthToken();
      
      if (!authValid) {
        setConnectionStatus('failed');
        setDebugInfo('❌ Auth token is invalid or expired. Please check your Blynk auth token.');
        Alert.alert('Auth Failed', 'Invalid auth token. Please check your Blynk configuration.');
        return;
      }
      
      const isConnected = await BlynkService.testConnection();
      
      if (isConnected) {
        setConnectionStatus('connected');
        onConnectionChange(true);
        setDebugInfo('✅ Connection successful! Hardware is connected to Blynk.');
        Alert.alert('Success', 'Successfully connected to Blynk!');
      } else {
        setConnectionStatus('failed');
        setDebugInfo('✅ Auth token is valid, but hardware is not connected.\n\nCheck:\n1. Arduino is powered on\n2. WiFi credentials are correct\n3. Arduino code is uploaded\n4. Device is connected to same WiFi');
        Alert.alert('Hardware Not Connected', 'Auth token is valid, but hardware is not connected. Check the debug info.');
      }
    } catch (error) {
      setConnectionStatus('failed');
      setDebugInfo(`❌ Error: ${error.message}`);
      Alert.alert('Error', 'Connection failed: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const initializeConnection = async () => {
    const tokenToUse = authToken.trim() || CONFIG.BLYNK.AUTH_TOKEN;
    
    if (!tokenToUse || tokenToUse === 'YOUR_BLYNK_AUTH_TOKEN') {
      Alert.alert('Error', 'Please enter your Blynk Auth Token');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');
    setDebugInfo('Initializing connection...');

    try {
      console.log('🔌 Initializing with token:', tokenToUse);
      const isConnected = await BlynkService.initialize(tokenToUse);
      
      if (isConnected) {
        setConnectionStatus('connected');
        onConnectionChange(true);
        setDebugInfo('✅ Connected and polling for events!');
        Alert.alert('Success', 'Successfully connected to Blynk!');
      } else {
        setConnectionStatus('failed');
        setDebugInfo('❌ Initialization failed. Check hardware connection.');
        Alert.alert('Connection Failed', 'Could not connect to Blynk. Please check the debug info.');
      }
    } catch (error) {
      setConnectionStatus('failed');
      setDebugInfo(`❌ Error: ${error.message}`);
      Alert.alert('Error', 'Connection failed: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'failed':
        return 'Failed';
      default:
        return 'Disconnected';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blynk Configuration</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Auth Token</Text>
              <TextInput
                style={styles.input}
                value={authToken}
                onChangeText={setAuthToken}
                placeholder="Enter your Blynk Auth Token"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.connectionStatus}>
              <View style={[styles.statusIndicator, { backgroundColor: getConnectionStatusColor() }]} />
              <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.testButton]}
                onPress={testConnection}
                disabled={isConnecting}
              >
                <Ionicons name="wifi" size={20} color="white" />
                <Text style={styles.buttonText}>
                  {isConnecting ? 'Testing...' : 'Test Connection'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveSettings}
              >
                <Ionicons name="save" size={20} color="white" />
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.initButton]}
              onPress={initializeConnection}
              disabled={isConnecting}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.buttonText}>
                {isConnecting ? 'Initializing...' : 'Initialize & Start Polling'}
              </Text>
            </TouchableOpacity>
          </View>

          {}
          {debugInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Debug Information</Text>
              <View style={styles.debugBox}>
                <Text style={styles.debugText}>{debugInfo}</Text>
              </View>
            </View>
          )}

          {}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Setup Instructions</Text>
            
            <View key="instruction-1" style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>
                Create a Blynk account at blynk.cloud
              </Text>
            </View>
            
            <View key="instruction-2" style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>
                Create a new device and get your Auth Token
              </Text>
            </View>
            
            <View key="instruction-3" style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>
                Upload the Arduino code to your device
              </Text>
            </View>
            
            <View key="instruction-4" style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>
                Enter your Auth Token above and test connection
              </Text>
            </View>
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Troubleshooting</Text>
            
            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootTitle}>Device Not Connecting?</Text>
              <Text style={styles.troubleshootText}>
                • Check Arduino serial monitor for WiFi connection status{'\n'}
                • Verify WiFi credentials in Arduino code{'\n'}
                • Ensure both devices are on same WiFi network{'\n'}
                • Check Blynk auth token is correct
              </Text>
            </View>
            
            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootTitle}>No Notifications?</Text>
              <Text style={styles.troubleshootText}>
                • Test with "Test Emergency" button first{'\n'}
                • Check Arduino serial monitor for button presses{'\n'}
                • Verify virtual pins are configured correctly
              </Text>
            </View>
          </View>

          {/* Pin Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pin Configuration</Text>
            
            <View key="pin-v1" style={styles.pinItem}>
              <Text style={styles.pinLabel}>V1 - Emergency Button</Text>
              <Text style={styles.pinDescription}>
                Connected to push button for emergency alerts
              </Text>
            </View>
            
            <View key="pin-v2" style={styles.pinItem}>
              <Text style={styles.pinLabel}>V2 - Obstacle Detection</Text>
              <Text style={styles.pinDescription}>
                Connected to ultrasonic sensor for obstacle detection
              </Text>
            </View>
            
            <View key="pin-v3" style={styles.pinItem}>
              <Text style={styles.pinLabel}>V3 - Notifications</Text>
              <Text style={styles.pinDescription}>
                For sending notifications to the device
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  testButton: {
    backgroundColor: '#4A90E2',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  initButton: {
    backgroundColor: '#FF9800',
    flex: 1,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  debugBox: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  troubleshootItem: {
    marginBottom: 15,
  },
  troubleshootTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  troubleshootText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  pinItem: {
    marginBottom: 15,
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  pinDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default SettingsModal; 