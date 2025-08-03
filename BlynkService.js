import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from './config';

class BlynkService {
  constructor() {
    this.authToken = null;
    this.server = CONFIG.BLYNK.SERVER;
    this.isConnected = false;
    this.listeners = [];
    this.pollInterval = null;
    this.lastButtonState = false;
  }

  async initialize(authToken) {
    this.authToken = authToken;
    
    try {
      await AsyncStorage.setItem('blynk_auth_token', authToken);
      
      const isConnected = await this.testConnection();
      
      if (isConnected) {
        this.isConnected = true;
        this.startPolling();
        this.notifyListeners('connected', { status: 'connected' });
      } else {
        this.isConnected = false;
        this.notifyListeners('error', { error: 'Hardware not connected to Blynk IoT' });
      }
      
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      this.notifyListeners('error', { error: error.message });
      return false;
    }
  }

  startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    this.pollInterval = setInterval(async () => {
      await this.checkButtonPress();
    }, CONFIG.APP.POLLING_INTERVAL);
  }

  async checkButtonPress() {
    if (!this.authToken) {
      return;
    }

    try {
      const buttonResponse = await fetch(`${this.server}/external/api/get?token=${this.authToken}&V0`);
      
      if (!buttonResponse.ok) {
        return;
      }
      
      const buttonState = await buttonResponse.text();
      
      if (buttonState === "1" && !this.lastButtonState) {
        this.lastButtonState = true;
        
        this.notifyListeners('buttonPress', {
          timestamp: new Date().toISOString(),
          type: 'emergency'
        });
        
        setTimeout(() => {
          this.lastButtonState = false;
        }, 2000);
      } else if (buttonState === "0") {
        this.lastButtonState = false;
      }
      
      const obstacleResponse = await fetch(`${this.server}/external/api/get?token=${this.authToken}&pin=${CONFIG.BLYNK.PINS.OBSTACLE_DETECTION}&format=json`);
      
      if (!obstacleResponse.ok) {
        return;
      }
      
      const obstacleState = await obstacleResponse.json();
      
      if (obstacleState && obstacleState[0] === 1) {
        this.notifyListeners('obstacleDetected', {
          timestamp: new Date().toISOString(),
          type: 'obstacle'
        });
        
        await this.setPinValue(CONFIG.BLYNK.PINS.OBSTACLE_DETECTION, 0);
      }
      
      const distanceResponse = await fetch(`${this.server}/external/api/get?token=${this.authToken}&pin=${CONFIG.BLYNK.PINS.DISTANCE}&format=json`);
      
      if (distanceResponse.ok) {
        const distanceData = await distanceResponse.json();
        if (distanceData && distanceData[0] !== undefined) {
          const distance = distanceData[0];
          this.notifyListeners('distanceUpdate', {
            timestamp: new Date().toISOString(),
            distance: distance
          });
        }
      }
      
    } catch (error) {
    }
  }

  async setPinValue(pin, value) {
    if (!this.authToken) return;

    try {
      const response = await fetch(`${this.server}/external/api/update?token=${this.authToken}&${pin}=${value}&format=json`);
    } catch (error) {
    }
  }

  async sendNotification(message) {
    if (!this.authToken) return;

    try {
      const response = await fetch(`${this.server}/external/api/update?token=${this.authToken}&${CONFIG.BLYNK.PINS.NOTIFICATION}=${encodeURIComponent(message)}&format=json`);
    } catch (error) {
    }
  }

  addListener(event, callback) {
    this.listeners.push({ event, callback });
  }

  removeListener(event, callback) {
    this.listeners = this.listeners.filter(
      listener => !(listener.event === event && listener.callback === callback)
    );
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        listener.callback(data);
      }
    });
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isConnected = false;
    this.notifyListeners('disconnected', { status: 'disconnected' });
  }

  async loadAuthToken() {
    try {
      const token = await AsyncStorage.getItem('blynk_auth_token');
      return token;
    } catch (error) {
      return null;
    }
  }

  async saveAuthToken(token) {
    try {
      await AsyncStorage.setItem('blynk_auth_token', token);
    } catch (error) {
    }
  }

  async testAuthToken() {
    if (!this.authToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.server}/external/api/isHardwareConnected?token=${this.authToken}`);
      
      if (response.ok) {
        const data = await response.json();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  async testConnection() {
    if (!this.authToken) {
      return false;
    }

    try {
      const endpoints = [
        `${this.server}/external/api/isHardwareConnected?token=${this.authToken}`,
        `${this.server}/external/api/get?token=${this.authToken}&pin=V1`,
        `${this.server}/external/api/get?token=${this.authToken}&pin=V4`,
        `${this.server}/external/api/isHardwareConnected?token=${this.authToken}&format=json`,
        `${this.server}/external/api/get?token=${this.authToken}&pin=V1&format=json`,
        `${this.server}/external/api/isHardwareConnected?token=${this.authToken}`,
        `${this.server}/external/api/get?token=${this.authToken}&pin=1`,
        `${this.server}/external/api/get?token=${this.authToken}&pin=4`
      ];
      
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        
        try {
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data !== null && data !== undefined) {
              return true;
            }
          }
        } catch (endpointError) {
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
}

export default new BlynkService(); 