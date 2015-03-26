// Wire Master Reader
// by Nicholas Zambetti <http://www.zambetti.com>

// Demonstrates use of the Wire library
// Reads data from an I2C/TWI slave device
// Refer to the "Wire Slave Sender" example for use with this

// Created 29 March 2006

// This example code is in the public domain.


#include <Wire.h>
#include <stdlib.h>

void setup()
{
  Wire.begin();        // join i2c bus (address optional for master)
  Serial.begin(9600);  // start serial for output
}

void readI2C()
{
 
    Wire.requestFrom(2, 1);    // request 6 bytes from slave device #2
    byte x;
    while(Wire.available())    // slave may send less than requested
    {
        x = Wire.read(); // receive a byte as character
        Serial.print(x);   // print the character
         Serial.println("");
    }
}




void loop()
{
  readI2C();
}
