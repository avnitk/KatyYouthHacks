#include <SPI.h>
#include <WiFiS3.h>
#include <BlynkSimpleWifi.h>

char ssid[] = "myusername";
char pass[] = "mypassword";

#include <LiquidCrystal.h>

#define trigPin 13
#define echoPin 12
#define buzzer 7
#define button 8
#define LED 6
bool state;

const int rs = 11, en = 10, d4 = 5, d5 = 4, d6 = 3, d7 = 2;
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);
void setup () {
  Serial.begin (9600);
  delay(500);
  lcd.begin(16, 2);
  lcd.clear();
  lcd.setCursor(0, 0);
  pinMode (trigPin, OUTPUT);
  pinMode (echoPin, INPUT);
  pinMode (buzzer, OUTPUT);
  pinMode (button, INPUT);
  pinMode (LED, OUTPUT);
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

}

void loop () {
  Blynk.run();
  long duration , distance;
  digitalWrite (trigPin , LOW );
  delayMicroseconds (2);
  digitalWrite (trigPin , HIGH );
  delayMicroseconds (10);
  digitalWrite (trigPin , LOW );
  duration = pulseIn (echoPin , HIGH );
  distance = (duration / 2) / 29.1;
  state = digitalRead(button);
  if (state == HIGH) {
    Blynk.virtualWrite(V0, 1);
    delay(500);
    Blynk.virtualWrite(V0, 0);
    Serial.println("Pressed");
    digitalWrite(LED, HIGH);
    lcd.setCursor(0, 0);
    lcd.print("Alerting carer");
    delay(1000);
    lcd.clear(); 
    digitalWrite(LED, LOW); 
  }
  if(distance < 5) {
    tone(buzzer, 1500, 1000);
    lcd.setCursor(0, 0);
    lcd.print("Really Close");
    delay(1000);
    lcd.clear();
  }
  if(distance >= 5 && distance < 30) {
    tone(buzzer, 1000, 1000);
    lcd.setCursor(0, 0);
    lcd.print("Close");
    delay(1000);
    lcd.clear();
  }
  if(distance >= 30 && distance < 50) {
    tone(buzzer, 500, 1000);
    lcd.setCursor(0, 0);
    lcd.print("Approaching");
    delay(1000);
    lcd.clear();
  }
  Serial.print("distance:");
  Serial.println(distance);
  delay(500);
}
