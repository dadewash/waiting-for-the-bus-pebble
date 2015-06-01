#  WAITING FOR THE BUS

`waiting-for-the-bus` is an application for the Pebble smartwatch that finds buses near your location and shows the estimated time of arrival. It saves your most frequent buses and learns your habits. 
This [application](https://apps.getpebble.com/en_US/application/55670cbc1034b064db000005) uses the APIs provided by a  server  hosted by [Heroku](http://waiting-for-the-bus.herokuapp.com/doc/).

This application works only in Trento with the agency ***Trentino Trasporti Esercizio*** and is based on the [GTFS](http://dati.trentino.it/dataset/trasporti-pubblici-del-trentino-formato-gtfs) file format.

## Setup
You can install this  [application](https://apps.getpebble.com/en_US/application/55670cbc1034b064db000005) from the app Pebble installed on your smarthphone and search in **TOOLS & UTILITIES** `Waiting For The Bus`, click `ADD` and the watchapp will be installed on your Pebble. 

If you would like to develop and modify the application, you must to install the [Pebble SDK](http://developer.getpebble.com/sdk/install/), then inside the folder **waiting-for-the-bus-pebble** you can digit:

`pebble build` to build the project,

`pebble install` to run the application on the **QEMU** emulator.

`pebble install --phone <IP-of-your-phone>` if you would like to install the application on your Pebble.
 
