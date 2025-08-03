import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import BlynkService from './BlynkService';
import { CONFIG } from './config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastButtonPress, setLastButtonPress] = useState(null);
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
    });

    loadNotifications();

    initializeBlynk();

    BlynkService.addListener('buttonPress', handleButtonPress);
    BlynkService.addListener('obstacleDetected', handleObstacleDetection);
    BlynkService.addListener('connected', handleConnectionChange);
    BlynkService.addListener('disconnected', handleConnectionChange);
    BlynkService.addListener('error', handleBlynkError);

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
      BlynkService.disconnect();
    };
  }, []);

  const initializeBlynk = async () => {
    try {
      let savedToken = await BlynkService.loadAuthToken();
      
      if (!savedToken) {
        savedToken = CONFIG.BLYNK.AUTH_TOKEN;
        await BlynkService.saveAuthToken(savedToken);
      } else {
      }
      
      if (savedToken && savedToken !== 'YOUR_BLYNK_AUTH_TOKEN') {
        const connected = await BlynkService.initialize(savedToken);
        setIsConnected(connected);
      } else {
      }
    } catch (error) {
    }
  };

  const handleButtonPress = (data) => {
    const alertMessage = 'Emergency button pressed! User needs assistance.';
    addNotification('Emergency Alert', alertMessage);
    sendLocalNotification('Walking Stick Alert', alertMessage);
    setLastButtonPress(new Date().toLocaleString());
  };

  const handleObstacleDetection = (data) => {
    const alertMessage = 'Obstacle detected ahead! Please be careful.';
    addNotification('Obstacle Alert', alertMessage);
    sendLocalNotification('Obstacle Warning', alertMessage);
  };

  const handleConnectionChange = (data) => {
    setIsConnected(data.status === 'connected');
  };

  const handleBlynkError = (data) => {
  };

  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }
  };

  const sendLocalNotification = async (title, body) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
    }
  };

  const addNotification = (title, message) => {
    const newNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      timestamp: new Date().toLocaleString(),
      type: 'alert',
    };

    setNotifications(prev => [newNotification, ...prev]);
    saveNotifications([newNotification, ...notifications]);
  };

  const saveNotifications = async (notifList) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(notifList));
    } catch (error) {
    }
  };

  const loadNotifications = async () => {
    try {
      const savedNotifications = await AsyncStorage.getItem('notifications');
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
    } catch (error) {
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    AsyncStorage.removeItem('notifications');
  };

  const handleConnectionStatusChange = (connected) => {
    setIsConnected(connected);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 16, 
            backgroundColor: '#EC4899', 
            alignItems: 'center', 
            justifyContent: 'center',
            shadowColor: '#EC4899',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}>
            <Ionicons name="heart" size={28} color="white" />
          </View>
          <Text style={styles.headerTitle}>Care Companion</Text>
        </View>
        <View style={styles.headerButtons}>
          <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]}>
            <Text style={styles.connectionText}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.notificationsSection}>
        <View style={styles.notificationsHeader}>
          <Text style={styles.sectionTitle}>🔔 Alerts & Notifications</Text>
          <TouchableOpacity onPress={clearNotifications} style={styles.clearButton}>
            <Ionicons name="trash" size={18} color="#DC2626" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            notifications.map((notif, index) => (
              <View key={`${notif.id}-${index}`} style={styles.notificationItem}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{notif.title}</Text>
                  <Text style={styles.notificationTime}>{notif.timestamp}</Text>
                </View>
                <Text style={styles.notificationMessage}>{notif.message}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF2F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#FCE7F3',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#831843',
    marginLeft: 16,
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 0,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FCE7F3',
  },
  statusSection: {
    backgroundColor: 'white',
    margin: 24,
    padding: 28,
    borderRadius: 24,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#831843',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 20,
    backgroundColor: '#FDF2F8',
    borderRadius: 20,
    marginHorizontal: 6,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statusText: {
    fontSize: 14,
    color: '#831843',
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  lastPressInfo: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lastPressText: {
    fontSize: 15,
    color: '#92400E',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  notificationsSection: {
    flex: 1,
    backgroundColor: 'white',
    margin: 24,
    marginTop: 12,
    padding: 28,
    borderRadius: 24,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingVertical: 2,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  clearButtonText: {
    color: '#DC2626',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 12,
  },
  notificationsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#A78BFA',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  notificationItem: {
    backgroundColor: '#FDF2F8',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#831843',
    letterSpacing: -0.3,
  },
  notificationTime: {
    fontSize: 13,
    color: '#A78BFA',
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 15,
    color: '#6B21A8',
    lineHeight: 22,
    fontWeight: '500',
  },
});
