const welcome = document.getElementById("welcomeMessage");
    db.collection("users").onSnapshot(function (querySnapshot) {
      console.log(firebase.auth().currentUser.displayName);
      welcome.innerHTML = "<i>Welcome, " + firebase.auth().currentUser.displayName + "</i>";
    });
    $("#welcomeMessage").css('color', 'white');

    //easter egg condition
    $('#picture').mousedown(function () {
      myTimeout = setTimeout(function () {
        window.location.href = "./play/easterEgg.html";
      }, 4000);
    });

    //stop counting for the easer egg condition
    $('#picture').mouseup(function () {
      clearTimeout(myTimeout);
    });

    //mobile version for the easter egg condition
    $('#picture').on('touchstart', show);

    //mobile version to stop the easter egg condition
    $('#picture').on('touchend', clear);

    function show() {
      setTimeout(function () {
        window.location.href = "./play/easterEgg.html";
      }, 4000);
    }

    //stop counting for the easter egg
    function clear() {
      clearTimeout(myTimeout);
    }

    //start a timer that tracks the users location
    $(document).on('click', '#startTrackingMe', function (event) {
      startTracking();

    });

    //stop tracking the user's location
    $(document).on('click', '#stopTrackingMe', function (event) {
      endTracking();
    });

    //extend the timer back to 30min for tracking the user
    $(document).on('click', '#extendTrackingMe', function (event) {
      timeCounter = 30 * 60 - 1;
    });


    //saves the current location and timestamp to the database
    function saveData() {
      var user = firebase.auth().currentUser;
      var curDate = new Date();
      var curTime = curDate.getTime();
      var userID = user.uid;

      var docData = {
        lat: latData,
        lon: lonData,
        timeStamp: curTime
      };

      db.collection(userID + ' tracking').doc(curTime.toString()).set(docData);
    }


    //read timestamp and location from the database
    $(document).on('click', '#readButton', function (event) {
      var user = firebase.auth().currentUser;
      var curDate = new Date();
      var curTime = curDate.getTime();
      var userID = user.uid;

      db.collection(userID + ' tracking').get().then(function (snap) {
        var i = 0;
        var dbReadDataLat = [];
        var dbReadDataLon = [];
        var dbReadDataTimeStamp = [];
        snap.forEach(function (doc) { // iterate thru collections
          dbReadDataLat[i] = doc.data().lat;
          dbReadDataLon[i] = doc.data().lon;
          dbReadDataTimeStamp[i] = doc.data().timeStamp;

          i += 1;
        });

        var newHtml = "<ul>";
        for (i = 0; i < dbReadDataLat.length; i++) {
          newHtml += "<li><b>lat:</b> " + dbReadDataLat[i] + " ";
          newHtml += "<b>lon:</b> " + dbReadDataLon[i] + " ";
          var s = new Date(dbReadDataTimeStamp[i]).toLocaleDateString("en-US") + " " + new Date(
            dbReadDataTimeStamp[i]).toLocaleTimeString("en-US");
          newHtml += "<b>time:</b> " + s + "</li>";
        }
        newHtml += "</ul>";
        $('#readDataTextBox').html(newHtml);
      });
    });


    //either the timer has ran out or the user has clicked the stop tracking button
    function endTracking() {
      tryingToTrack = false;
      timeCounter = 0;

      $("#stopTrackingMe").css({
        "display": "none"
      });
      $("#extendTrackingMe").css({
        "display": "none"
      });
      $("#extendTrackingMe").on('click', () => {
        alert("Timer set to 30 mins")
      });
      $("#startTrackingMe").css({
        "display": "inline-block"
      });
    }



    //timer
    timeCounter = 0;
    //this runs every second
    function updateTimer() {
      $('#timerText').html("Timer: " + timeCounter.toString());

      if ((timeCounter > 0) && (tryingToTrack) && (geoDataExists)) {
        //only save the user's position every 60 seconds
        if (timeCounter % 60 == 0) {
          saveData();
        }

        timeCounter--;
        if (timeCounter == 0) {
          endTracking();
        }
      }

      setTimeout(updateTimer, 1000);
    }
    updateTimer();



    //GPS Code
    var errorMessage = "";
    var latData = -1;
    var lonData = -1;
    var geoDataExists = false;
    var tryingToTrack = false;

    //ask the user if they allow the tracking
    function startTracking() {
      if (!geoDataExists) {
        if (navigator.geolocation) {
          navigator.geolocation.watchPosition(updateGEOPosition, showError, options);
        } else {
          tryingToTrack = false;
          errorMessage = "Geolocation is not supported by this browser.";
        }
      } else {
        startedTrackingSuccessful();
      }
    }

    options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };


    //this is called everytime our app gets location data on the user
    function updateGEOPosition(position) {
      latData = position.coords.latitude;
      lonData = position.coords.longitude;
      if (!geoDataExists) {
        geoDataExists = true;
        startedTrackingSuccessful();
      }
    }

    //this gets executed when the user allows tracking
    //it gets rid of the start tracking button and adds in the extend tracking and
    //stop tracking buttons
    function startedTrackingSuccessful() {
      tryingToTrack = true;
      timeCounter = 30 * 60;

      $("#startTrackingMe").css({
        "display": "none"
      });
      $("#stopTrackingMe").css({
        "display": "inline-block"
      });
      $("#extendTrackingMe").css({
        "display": "inline-block"
      });
      $("#extendTrackingMe").on('click', () => {
        alert("Timer set to 30 mins")
      })
    }

    //GEO tracking error
    //the error type is stored in errorMessage
    function showError(error) {
      tryingToTrack = false;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessages = "User denied the request for Geolocation."
          alert(errorMessages);
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable."
          alert(errorMessage);
          break;
        case error.TIMEOUT:
          errorMessage = "The request to get user location timed out."
          alert(errorMessage);
          break;
        case error.UNKNOWN_ERROR:
          errorMessage = "An unknown error occurred."
          alert(errorMessage);
          break;
      }
    }
    
  
    //2d arrays that keep track of the user's paths
    var timeLineLat;
    var timeLineLon;
    var timeLineTiS;
    //keep track of the view boundaries for HereMaps
    var minPositionLat;
    var maxPositionLat;
    var minPositionLon;
    var maxPositionLon;
    //an array that keep track of each routes size
    var timeGroupSize;
    //a list of time folders that need to get loaded from the database
    var infectionTimeList = [];
    //keeps track of how many infected folders have been loaded from the database
    var infectedStartCount;
    var infectedEndCount;
    //2d array for all of the infection points
    var infectedListLat = [];
    var infectedListLon = [];
    var infectedListTim = [];
    //2d array for all of the encounter points for each path
    var encountersLat;
    var encountersLon;
    var encountersTim;
    //wait for the user ID to be loaded
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        //user is logged in
        var curDate = new Date();
        var curTime = curDate.getTime();
        var userID = user.uid;

        //load the user's travel history
        db.collection(userID + ' tracking').get().then(function (snap) {
          var i = 0;
          var dbReadDataLat = [];
          var dbReadDataLon = [];
          var dbReadDataTimeStamp = [];
          snap.forEach(function (doc) { // iterate thru collections
            dbReadDataLat[i] = doc.data().lat;
            dbReadDataLon[i] = doc.data().lon;
            dbReadDataTimeStamp[i] = doc.data().timeStamp;

            i += 1;
          });

          //dbReadDataLat, dbReadDataLon, and dbReadDataTimeStamp are now filled up
          //first we will loop through dbReadDataTimeStamp and find out how many time groups there are
          var timeGroups = 0;
          var previousTime = 0;
          var currentTime = 0;
          timeGroupSize = [];
          var largestTimeGroup = 0;
          for (i = 0; i < dbReadDataTimeStamp.length; i++) {
            currentTime = dbReadDataTimeStamp[i];
            //check if there has been a 5min jump or more
            if (currentTime > previousTime + 1000 * 60 * 5) {
              timeGroups++;
              timeGroupSize[timeGroups - 1] = 0;
            }
            timeGroupSize[timeGroups - 1]++;

            if (timeGroupSize[timeGroups - 1] > largestTimeGroup) {
              largestTimeGroup = timeGroupSize[timeGroups - 1];
            }

            previousTime = currentTime;
          }

          //timeGroups holds how many disconnected timelines this user has
          //largestTimeGroup is size of the longest line
          //timeGroupSize is the size of each line
          timeLineLat = createArray(timeGroups, largestTimeGroup);
          timeLineLon = createArray(timeGroups, largestTimeGroup);
          timeLineTiS = createArray(timeGroups, largestTimeGroup);
          minPositionLat = [];
          maxPositionLat = [];
          minPositionLon = [];
          maxPositionLon = [];

          //calculate the view minX, minY, maxX, and maxY
          var loopCounter = 0;
          var f;
          for (i = 0; i < timeGroups; i++) {
            minPositionLat[i] = 1000.0;
            maxPositionLat[i] = -1000.0;
            minPositionLon[i] = 1000.0;
            maxPositionLon[i] = -1000.0;
            for (f = 0; f < timeGroupSize[i]; f++) {
              timeLineLat[i][f] = dbReadDataLat[loopCounter];
              timeLineLon[i][f] = dbReadDataLon[loopCounter];
              timeLineTiS[i][f] = dbReadDataTimeStamp[loopCounter];
              if (dbReadDataLat[loopCounter] < minPositionLat[i]) {
                minPositionLat[i] = dbReadDataLat[loopCounter];
              }
              if (dbReadDataLat[loopCounter] > maxPositionLat[i]) {
                maxPositionLat[i] = dbReadDataLat[loopCounter];
              }
              if (dbReadDataLon[loopCounter] < minPositionLon[i]) {
                minPositionLon[i] = dbReadDataLon[loopCounter];
              }
              if (dbReadDataLon[loopCounter] > maxPositionLon[i]) {
                maxPositionLon[i] = dbReadDataLon[loopCounter];
              }

              loopCounter++;
            }
          }

          //check for all of the travel path points
          for (i = 0; i < timeLineTiS.length; i++) {
            //check if the points on the map are too close together
            var tooCloseTogether = true;
            var f;
            for (f = 1; f < timeGroupSize[i]; f++) {
              var distanceBetween = Math.sqrt(Math.pow(timeLineLat[i][f] - timeLineLat[i][f - 1], 2) + Math.pow(
                timeLineLon[i][f] - timeLineLon[i][f - 1], 2));
              if (distanceBetween > 0.000001) {
                tooCloseTogether = false;
                break;
              }
            }

            //don't allow points that are too close together
            if (tooCloseTogether) {
              timeLineLat.splice(i, 1);
              timeLineLon.splice(i, 1);
              timeLineTiS.splice(i, 1);
              minPositionLat.splice(i, 1);
              maxPositionLat.splice(i, 1);
              minPositionLon.splice(i, 1);
              maxPositionLon.splice(i, 1);
              timeGroupSize.splice(i, 1);
              i--;
            }
          }


          //buttons have been made next get a list of all of the infection times that have to be loaded
          infectionTimeList = [];
          for (i = 0; i < timeLineTiS.length; i++) {
            var f;
            for (f = 0; f < timeGroupSize[i]; f++) {
              var inList = false;
              var currentRoundedTime = Math.floor(timeLineTiS[i][f] / 3600000.0) * 3600000
              var g;
              for (g = 0; g < infectionTimeList.length; g++) {
                if (currentRoundedTime == infectionTimeList[g]) {
                  inList = true;
                  break;
                }
              }
              //this time is not in the list so add it to the list
              if (!inList) {
                infectionTimeList.push(currentRoundedTime);
              }
            }
          }


          //currentRoundedTime is now full of all of the infected time collections we will need to read from the server
          infectedStartCount = 0;
          infectedEndCount = 0;
          infectedListLat = [];
          infectedListLon = [];
          infectedListTim = [];
          //load infected points from the database
          for (i = 0; i < infectionTimeList.length; i++) {
            db.collection('infected ' + infectionTimeList[i].toString()).get().then(function (snap) {
              var loadID = infectedStartCount++;
              snap.forEach(function (doc) { // iterate thru collections
                //UID CHECK HERE
                if(doc.data().uid != userID) {
                  infectedListLat.push(doc.data().lat);
                  infectedListLon.push(doc.data().lon);
                  infectedListTim.push(doc.data().tim);
                  //console.log(doc.data().uid);
                  //console.log(userID);
                }
              });


              //check if the infected arrays are full
              if (++infectedEndCount == infectionTimeList.length) {
                //the 3 infected arrays are full here:

                encountersLat = createArray(timeLineTiS.length, 0);
                encountersLon = createArray(timeLineTiS.length, 0);
                encountersTim = createArray(timeLineTiS.length, 0);
                //calculate the encounters
                var encounterFound = false;
                var a;
                for (a = 0; a < timeLineTiS.length; a++) {
                  var b;
                  for (b = 0; b < timeGroupSize[a]; b++) {
                    var c;
                    for (c = 0; c < infectedListTim.length; c++) {
                      //SETUP:  timeLineTiS[a][b] timeLineLat[a][b] timeLineLon[a][b] infectedListTim[c]  infectedListLat[c]  infectedListLon[c]
                      //encountersTim encountersLat encountersLon
                      //check for points that are within 100 meters and within 1min apart from each other
                      if ((measure(timeLineLat[a][b], timeLineLon[a][b], infectedListLat[c],
                          infectedListLon[c]) <= 100.0) &&
                        ((Math.abs(timeLineTiS[a][b] - infectedListTim[c])) <= 60 * 1000)) {
                        //encounter!!!
                        encountersLat[a].push(timeLineLat[a][b]);
                        encountersLon[a].push(timeLineLon[a][b]);
                        encountersTim[a].push(timeLineTiS[a][b]);
                        encounterFound=true;
                        break;
                      }
                    }
                  }
                }

                if(encounterFound){
                  //ADD IN YOUR NOTIFICATION CODE HERE

                  console.log("infected");
                  alertOn();
                  
                }
                
                
                
              }
            }).catch(function (error) {
              //console.log("Error getting document:", error);
            });
          }


        });
      } else {
        //user is not logged in
      }
    });
    
    
//No alerts
function alertOff() {
	document.getElementById("globe").src = "images/safe.png";
	document.getElementById("status").style.display = "none";
	document.getElementById("message").innerHTML = "<i>You are safe!</i>";
}

//Alerts
function alertOn() {
	document.getElementById("globe").src = "images/newWarning.png";
	document.getElementById("status").style.display = "block";
	document.getElementById("message").innerHTML = "<i>You are exposed!</i>";
}
    

    //measures the distance between two lats and longs in meters
    function measure(lat1, lon1, lat2, lon2) {
      var R = 6378.137; // Radius of earth in KM
      var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
      var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var d = R * c;
      return d * 1000; // meters
    }
    
    
    //Multi D Array Creation
    function createArray(length) {
      var arr = new Array(length || 0),
        i = length;

      if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
      }

      return arr;
    }
    
    //Logout function
    $("#logoutButton").on('click', function () {
      firebase.auth().signOut().then(function () {
        //console.log("Singout Successful");
        window.location.href = "index.html";
      }, function (error) {
        //console.log("Some error occured");
      });
    })