/**
 *
 * Multimedia Networking Project
 * Davide Merzi, Davide Salmaso
 *
 *    Waiting for the Bus
 *        Pebble App
 *         WatchApp
 */

var ajax = require('ajax');
var UI = require('ui');
var Settings = require('settings');
var UUID = require('uuid');

//------------------------------ Storage/Cards/Menu ----------------------------//

// -----------------------------------------------------------------------------//
// in this variable set the name of the agency specified on the GTFS
var agency = 'trentino-trasporti-esercizio-spa';
// -----------------------------------------------------------------------------//

var storage = Settings.data('storage');
// clear local storage... 
//Settings.data('storage', null);
var range = Settings.data('range');
if (range == null){
  range = 0.5;
  Settings.data('range', range);
}
var coords = {
  latitude: null,
  longitude: null
};

// if storage is empty, fill it with nothing
if (storage == null){
  storage = [];
  Settings.data('storage', storage);
}

// Loading Card
var splashWindow = new UI.Card({
  banner: 'images/loading_card.png'
});
splashWindow.on('click', 'back', function(){
  // do nothing
});
var smartStopsMenu = new UI.Menu();
var checkInListMenu = new UI.Menu();
var nearbyStopsMenu = new UI.Menu();
var noStopWindow = new UI.Card({
  title: 'No Bus stop found'
});

var checkInWindow = new UI.Card({
  banner: 'images/check_in_card.png'
});
var clearStorageWindow = new UI.Card({
  title: "Clear Storage..."
});
var storageEmpty = new UI.Card({
  title: "Storage is Empty!"
});

clearStorageWindow.on('click', 'back', function(){
  // do nothing
});

// main Menu
var mainMenu = new UI.Menu({
  sections: [{
    items: [{
      title: 'Stops Nearby',
      icon: 'images/pin2.png'
    },{
      title: 'Smart Stops',
      icon: 'images/lamp.png'
    },{
      title: 'Settings',
      icon: 'images/settings.png'
    }]
  }]
});

//------------------------------------------------------------------------------//

function updateMenuSections (menu, sections) {
  menu.sections([]);
  for (var i = 0; i < sections.length; i++){
    menu.section(i, sections[i]);
  }
} // end function udateMenuSections

function initApp (callback){
  splashWindow.show();
  // GPS coordinates acquisition
  navigator.geolocation.getCurrentPosition(function (pos) {
    coords.latitude = pos.coords.latitude.toString();
    coords.longitude = pos.coords.longitude.toString();
    splashWindow.hide();
  });
}

initApp();

//******************************************************************************//
//
//******************************************************************************//

// function that calculate the distance btw two coordinates
function distance(lat1, lon1, lat2, lon2) {
  var R = 6371; // km (change this constant to get miles)
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180 ) * Math.cos(lat2 * Math.PI / 180 ) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  if (d>1) return Math.round(d)+"km";
  else if (d<=1) return Math.round(d*1000) + "m";
  return d;
}// end function distance

//------------------------------------------------------------------------------//

// create  the sections of the smart Stops Menu
function createSmartMenuSections(route_ids, stop_ids, callback) {
  var sections = [];
  var pendingRequests = 0;
  pendingRequests++;
  ajax(
    { // 'first ajax': find the stops (stop_id) around the range
      url: 'http://waiting-for-the-bus.herokuapp.com/api/stopsNearby/' + coords.latitude + '/' + coords.longitude + '/' + range,
      type: 'json'
    },
    function (data){
      pendingRequests--;
      if (data.stops.length === 0){
        return callback("stops", null);
      }
      var dataStopNearby = data.stops;

      // Remove stops which are not saved in the storage
      dataStopNearby = dataStopNearby.filter(function(stop){
        if (stop_ids.indexOf(stop.stop_id) == -1){
          return false;
        }
        return true;
      });

      if (dataStopNearby.length === 0){
        return callback(null, []);
      }

      // clicle over the stopsNearby - useful stop deleted 
      dataStopNearby.forEach (function (stop){
        var distFromStop = distance(coords.latitude, coords.longitude, stop.loc[1], stop.loc[0]);
        pendingRequests++;
        ajax(
          { // 'second ajax': find the stops (stop_id) around the range
            url: 'http://waiting-for-the-bus.herokuapp.com/api/times/' + agency + '/' + stop.stop_id + '?from_time=' + moment().format('HH:mm:ss'),
            type: 'json'
          },
          function (data){
            pendingRequests--;
            
            var items = [];
            var stopTimes = data.stopTimes.slice(0,2);

            stopTimes.forEach(function (stopTime){
              if (route_ids.indexOf(stopTime.trip.route.route_id) == -1){
                return;
              }
              var time = moment(stopTime.departure_time, 'HH:mm:ss');
              var item = {
                title: stopTime.trip.route.route_short_name + ' (ETA: ' + moment.duration(time.diff(moment())).humanize() + ')',
                subtitle: stopTime.trip.trip_headsign,
                busNumberRaw: stopTime.trip.route.route_short_name,
                routeLongName: stopTime.trip.route.route_long_name,
                trip_id: stopTime.trip.trip_id,
                stop_id: stopTime.stop_id,
                data: {
                  departureTime: moment.duration(time.diff(moment())),
                  departureTimeRaw: time
                },
              };
              items.push(item);
            }); // end forEach stopTimes 
            if (items.length > 0){
              sections.push({
                title: distFromStop + '-' + stop.stop_name,
                items: items,
                distance: parseInt(distFromStop)
              });
            }
            
            if (pendingRequests === 0){
              sections.sort(function (a, b){
                if (a.distance < b.distance) return -1;
                if (a.distance == b.distance) return 0;
                if (a.distance > b.distance) return 1;
              });
              return callback(null, sections);
            }
          }, // end callback inner ajax
          function(err) {
            pendingRequests--;
          }
        );// end 'second ajax' 
      });// end forEach dataStopNearby
    }, // end callback 'first ajax'
    function(err){
      pendingRequests--;
    }
  );// end 'first ajax'
}// end function createSmartMenuSections

// create smart Menu
function createSmartMenu(callback){
  if (storage.length === 0){
    storageEmpty.show();
    setTimeout(function(){
      storageEmpty.hide();
    }, 2000);
    return;
  }
  splashWindow.show();

  var route_ids = [];
  var stop_ids = [];
  storage.forEach(function (e){
    route_ids.push(e.route_id);
    stop_ids.push(e.stop_id);
  });
  var smartMenuSections = createSmartMenuSections(route_ids, stop_ids, function(err, sections) {
    splashWindow.hide();
    if (err){
      if (err === "noStops") {
        noStopWindow.show();
        setTimeout(function(){
          noStopWindow.hide();
        }, 2000);
        return;
      }
    }

    if (sections.length == 0){
      noStopWindow.show();
      setTimeout(function(){
        noStopWindow.hide();
      }, 2000);
      return;
    }

    updateMenuSections(smartStopsMenu, sections);
    smartStopsMenu.show();
  });
}// end function smartMenu

// select on mainMenu
mainMenu.on('select', function (e){
  if (e.item.title === 'Stops Nearby'){
    createStopsNearbyMenu(function (){
      nearbyStopsMenu.show();
    });
  }
  else if (e.item.title === 'Smart Stops'){
    createSmartMenu();
  }
  else if (e.item.title === 'Settings'){
    // Settings Menu
    var settingsMenu = new UI.Menu({
      sections: [{
        items: [{
          title: 'Clear Storage',
          icon: 'images/cestino.png'
        },{
          title: 'Set Range',
          icon: 'images/range.png'
        },{
          title: 'List Check-In',
          icon: 'images/lista.png'
        }]
      }]
    });
    // select on settings Menu
    settingsMenu.on('select', function (e){
      if (e.item.title === 'Clear Storage'){
        clearStorageWindow.show();
        Settings.data('storage', null);
        storage = [];
        setTimeout(function(){
          clearStorageWindow.hide();
        }, 2000);
      }
      else if(e.item.title === 'Set Range'){
        var sections = [{
            items: [{
              title: '100 m',
              icon: 'images/circle_vuoto.png',
              value: 0.1
            },{
              title: '200 m',
              icon: 'images/circle_vuoto.png',
              value: 0.2
            },{
              title: '300 m',
              icon: 'images/circle_vuoto.png',
              value: 0.3
            },{
              title: '400m',
              icon: 'images/circle_vuoto.png',
              value: 0.4
            },{
              title: '500 m',
              icon: 'images/circle_vuoto.png',
              value: 0.5
            },{
              title: '1 km',
              icon: 'images/circle_vuoto.png',
              value: 1
            }]
          }];

        sections[0].items.forEach(function (item){
          if (item.value === range){
            item.icon = 'images/circle_pieno.png';
          }
        });
        var rangeMenu = new UI.Menu({
          sections: sections
        }); // end rangeMenu
        rangeMenu.on('select', function (e){
          range = e.item.value;
          Settings.data('range', range);
          
          sections[0].items.forEach(function (item){
            if (item.value === range){
              item.icon = 'images/circle_pieno.png';
            } else {
              item.icon = 'images/circle_vuoto.png';
            }
          });
          updateMenuSections(rangeMenu, sections);
        }); // end function click rangeMenu
        rangeMenu.show();
      }// end elseif set Range
      else if (e.item.title === 'List Check-In'){ 
        if (storage.length === 0){
          storageEmpty.show();
          setTimeout(function(){
            storageEmpty.hide();
          }, 2000);
        } else {
          var items = [];
          storage.forEach(function (element){
            if (element.mainCheckIn === 0 ) return;
            items.push({
              title: element.busNumberRaw,
              subtitle: 'in: ' + element.stop_name,
              checkInIndex: element.checkInIndex
            });
          });

          var section = [{
            items: items
          }];

          updateMenuSections(checkInListMenu, section);
          checkInListMenu.show();
        }
      }
    });
    settingsMenu.show();
  } // end if Settings
}); // end mainMenu on click select
mainMenu.show();

//------------------------------------------------------------------------------//

// function that create the stops nearby
function createStopsNearbySections(callback){
  var sections = [];
  var pendingRequests = 0;
  pendingRequests++;
  ajax(
    { // 'first ajax': find the stops (stop_id) around the range
      url: 'http://waiting-for-the-bus.herokuapp.com/api/stopsNearby/' + coords.latitude + '/' + coords.longitude + '/' + range,
      type: 'json'
    },
    function (data){
      pendingRequests--;
      if (data.stops.length === 0){
        noStopWindow.show();
        setTimeout(function(){
          noStopWindow.hide();
        }, 2000);
        return callback('noStops');
      }
      var dataStopNearby = data.stops;
      dataStopNearby.forEach (function (stop) {
        var distFromStop = distance(coords.latitude, coords.longitude, stop.loc[1], stop.loc[0]);
        var items = [];

        pendingRequests++;
        ajax(
          { // 'second': find the stops (stop_id) around the range
            url: 'http://waiting-for-the-bus.herokuapp.com/api/times/' + agency + '/' + stop.stop_id + '?from_time=' + moment().format('HH:mm:ss'),
            type: 'json'
          },
          function (data){
            pendingRequests--;
            var dataStopTime = data.stopTimes.slice(0,2);

            dataStopTime.forEach (function (bus){
              var item = {
                title: bus.trip.route.route_short_name,
                subtitle: '',
                busNumberRaw: bus.trip.route.route_short_name,
                routeLongName: bus.trip.route.route_long_name,
                route_id: bus.trip.route.route_id,
                trip_id: bus.trip.trip_id,
                stop_sequence: bus.stop_sequence,
                stop_id: bus.stop_id,
                stop_name: stop.stop_name
                };

              var time = moment(bus.arrival_time, 'HH:mm:ss');

              item.title += ' (ETA: ' + moment.duration(time.diff(moment())).humanize() + ')';
              item.subtitle += bus.trip.trip_headsign;

              item.data = {
                departureTime: moment.duration(time.diff(moment())),
                departureTimeRaw: time,
              };
              items.push(item);
            });// end foreach

            if (items.length > 0){
              sections.push({
                title: distFromStop + '-' + stop.stop_name,
                items: items,
                distance: parseInt(distFromStop)
              });
            }
            // if there aren't no busses return error
            if (sections.length === 0) return callback('noStops');
            
            if (pendingRequests === 0){
              sections.sort(function (a, b){
                if (a.distance < b.distance) return -1;
                if (a.distance == b.distance) return 0;
                if (a.distance > b.distance) return 1;
              });
              return callback(null, sections);
            }
          },
          function(err){
            pendingRequests--;
          }
        ); // end inner ajax
      });
    },
    function(err){
      pendingRequests--;
    } // end callback 'first ajax'
  );// end 'first ajax'
}// end createStopNearbySections

function createStopsNearbyMenu(callback){
  splashWindow.show();
  var MenuSections = createStopsNearbySections(function(err, sections) {
    splashWindow.hide();
    if (err){
      if (err === "noStops") {
        noStopWindow.show();
        setTimeout(function(){
          noStopWindow.hide();
        }, 2000);
        return;
      }
    }
    updateMenuSections(nearbyStopsMenu, sections);
    callback();
  });
}// end createStopNearbySections

//******************************************************************************//
//
//******************************************************************************//
// On select shows details in stops nearby
nearbyStopsMenu.on('select', function (e){
  var detailCard = new UI.Card({
    title:'Bus : ' + e.item.busNumberRaw,
    subtitle: e.item.data.departureTimeRaw.format('HH:mm'),
    body: 'to:\n' + e.item.subtitle + '\nRoute:\n' + e.item.routeLongName,
    scrollable: true
  });
detailCard.show();
});

//On select show details in smart stop
smartStopsMenu.on('select', function (e){
  var detailCard = new UI.Card({
    title:'Bus : ' + e.item.busNumberRaw,
    subtitle: e.item.data.departureTimeRaw.format('HH:mm'),
    body: 'to:\n' + e.item.subtitle + '\nRoute:\n' + e.item.routeLongName,
    scrollable: true
  });
detailCard.show();
});

// Check In 
nearbyStopsMenu.on('longSelect', function (e){
  var index = UUID.v4();
  ajax(// stopsByTrip
    {
      url: 'http://waiting-for-the-bus.herokuapp.com/api/stopsByTrip/' + agency + '/' + e.item.trip_id,
      type: 'json'
    },
    function (data) {
      var stops = data.stops;
      var prev, succ;
      // save my stop the successive and the previous
      stops.forEach(function (stop){
        if (stop.stop_sequence == e.item.stop_sequence - 1 ){
          storage.push({
            route_id: e.item.route_id,
            trip_id: e.item.trip_id,
            stop_sequence: stop.stop_sequence,
            stop_id: stop.stop_id,
            stop_name: stop.stop.stop_name,
            busNumberRaw: e.item.busNumberRaw,
            subtitle: e.item.subtitle,
            mainCheckIn: 0,
            checkInIndex: index
          });
        }
        if (stop.stop_sequence == e.item.stop_sequence + 1 ){
          storage.push({
            route_id: e.item.route_id,
            trip_id: e.item.trip_id,
            stop_sequence: stop.stop_sequence,
            stop_id: stop.stop_id,
            stop_name: stop.stop.stop_name,
            busNumberRaw: e.item.busNumberRaw,
            subtitle: e.item.subtitle,
            mainCheckIn: 0,
            checkInIndex: index
          });
        }
      });
      // current position
      storage.push({
        route_id: e.item.route_id, 
        trip_id: e.item.trip_id,
        stop_sequence: e.item.stop_sequence,
        stop_id: e.item.stop_id,
        stop_name: e.item.stop_name,
        busNumberRaw: e.item.busNumberRaw,
        subtitle: e.item.subtitle,
        mainCheckIn: 1,
        checkInIndex: index
      });
      Settings.data('storage', storage);
      checkInWindow.show();
      setTimeout(function(){
        checkInWindow.hide();
      }, 2000);
    },
    function(err) {
      var commError = new UI.Card({
        title: 'Communication Error, Try Again'
      });
      commError.show();
      setTimeout(function (){
        commError.hide();
      }, 2000);
    }
  );
});

// Delete the undesired checkIn
checkInListMenu.on('select', function (e){
  storage = Settings.data('storage');
  var tmpStorage = [];
  var items = [];
  var checkInIndex = e.item.checkInIndex;
  var sections = [];

  // delete selected checkin
  storage.forEach(function (element){
    if (element.checkInIndex != checkInIndex){
      tmpStorage.push(element);
      if (element.mainCheckIn == 1){
        items.push({
          title: element.busNumberRaw,
          subtitle: 'in: ' + element.stop_name,
          checkInIndex: element.checkInIndex
        });
      }
    }
  });

  var deleteCheckInCard = new UI.Card({
    title: 'Check-In Removed'
  });
  deleteCheckInCard.show();
  var timer = setTimeout(function(){
    deleteCheckInCard.hide();
  }, 2000);

  storage = [];
  Settings.data('storage', tmpStorage);
  storage = Settings.data('storage');
  
  var newSection = [{
    items: items
  }];
  
  updateMenuSections(checkInListMenu, newSection);

  if (storage.length === 0){
    clearTimeout(timer);
    timer = setTimeout(function(){
      deleteCheckInCard.hide();
      storageEmpty.show();
        setTimeout(function(){
        storageEmpty.hide();
        checkInListMenu.hide();
      }, 2000);
     }, 2000);
  }
}); // end delete checkin