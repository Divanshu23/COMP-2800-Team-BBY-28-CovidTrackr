const welcome = document.getElementById("welcomeMessage");
    db.collection("users").onSnapshot(function (querySnapshot) {
      welcome.innerHTML = "<i>" + firebase.auth().currentUser.displayName + ": Encounters </i>";
    });
    $("#welcomeMessage").css('color', 'white');

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

          //create the enounters buttons
          var newHtml = "";
          for (i = 0; i < timeLineTiS.length; i++) {
            var s = new Date(timeLineTiS[i][0]).toLocaleDateString("en-US") + " " + new Date(timeLineTiS[i][0])
              .toLocaleTimeString("en-US");
            newHtml += "<div class='btnContainer'>"
            newHtml += "<button type='button' class='travelHistoryButton' name='" + i.toString() + "'>" + s +
              "</button>";
            newHtml += "</div>"
          }

          $('#routeButtonHolder').html(newHtml);


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


                var a;
                for (a = 0; a < timeLineTiS.length; a++) {
                  var b;
                  for (b = 0; b < timeGroupSize[a]; b++) {
                    var c;
                    for (c = 0; c < infectedListTim.length; c++) {
                      //SETUP:  timeLineTiS[a][b] timeLineLat[a][b] timeLineLon[a][b] infectedListTim[c]  infectedListLat[c]  infectedListLon[c]
                      //encountersTim encountersLat encountersLon
                      //check for points that are within 40 meters and within 1min apart from each other
                      if ((measure(timeLineLat[a][b], timeLineLon[a][b], infectedListLat[c],
                          infectedListLon[c]) <= 40.0) &&
                        ((Math.abs(timeLineTiS[a][b] - infectedListTim[c])) <= 60 * 1000)) {
                        //encounter!!!
                        encountersLat[a].push(timeLineLat[a][b]);
                        encountersLon[a].push(timeLineLon[a][b]);
                        encountersTim[a].push(timeLineTiS[a][b]);
                        break;
                      }
                    }
                  }
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


    //when a user travel path button has been clicked on
    var objectOnMap = [];
    $(document).on('click', '.travelHistoryButton', function (event) {
      //clear everything on the map
      if (objectOnMap.length > 0) {
        map.removeObjects(objectOnMap);
        objectOnMap = [];
      }

      //get the number of the button being pressed
      var routeNum = parseInt($(this).attr("name"));

      var newTop = minPositionLat[routeNum];
      var newLeft = minPositionLon[routeNum];
      var newBottom = maxPositionLat[routeNum];
      var newRight = maxPositionLon[routeNum];
      //expand the view so the path is in view
      newTop += (newTop - newBottom) / 4.0;
      newLeft += (newLeft - newRight) / 4.0;
      newBottom += (newBottom - newTop) / 4.0;
      newRight += (newRight - newLeft) / 4.0;
      //move the view of the map
      var bbox = new H.geo.Rect(newTop, newLeft, newBottom, newRight);
      map.getViewModel().setLookAtData({
        bounds: bbox
      });

      //connect the user's path together
      var i;
      var lineString = new H.geo.LineString();
      for (i = 0; i < timeGroupSize[routeNum]; i++) {
        lineString.pushPoint({
          lat: timeLineLat[routeNum][i].toString(),
          lng: timeLineLon[routeNum][i].toString()
        });
      }

      //add the user's path to the map buffer
      objectOnMap.push(new H.map.Polyline(lineString, {
        style: {
          lineWidth: 4
        }
      }));


      //add the circles of encounter to the map
      //encountersLat[a][b];
      //encountersLon[a][b]);
      for (i = 0; i < encountersTim[routeNum].length; i++) {
        objectOnMap.push(new H.map.Circle({
            lat: encountersLat[routeNum][i],
            lng: encountersLon[routeNum][i]
          },
          // The radius of the circle in meters
          40, {
            style: {
              strokeColor: 'rgba(0, 0, 0, 0.6)', // Color of the perimeter
              lineWidth: 2,
              fillColor: 'rgba(128, 0, 0, 0.4)' // Color of the circle
            }
          }
        ));
      }


      //add the objects in the buffer onto the map
      for (i = 0; i < objectOnMap.length; i++)
        map.addObject(objectOnMap[i]);


    });



    //Logout function
    $("#logoutButton").on('click', function () {
      firebase.auth().signOut().then(function () {
        //console.log("Singout Successful");
        window.location.href = "index.html";
      }, function (error) {
        //console.log("Some error occured");
      });
    })


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



    /**
     * Boilerplate map initialization code starts below:
     */

    //Step 1: initialize communication with the platform
    // In your own code, replace variable window.apikey with your own apikey
    var platform = new H.service.Platform({
      apikey: 'uw2JIIk15Ly80GW4DZEwS5mMIAs8k3nzfrAo70doJlw'
    });
    var defaultLayers = platform.createDefaultLayers();

    //Step 2: initialize a map - this map is centered over Europe
    var map = new H.Map(document.getElementById('map'),
      defaultLayers.vector.normal.map, {
        center: {
          lat: 52,
          lng: 5
        },
        zoom: 5,
        pixelRatio: window.devicePixelRatio || 1
      });
    // add a resize listener to make sure that the map occupies the whole container
    window.addEventListener('resize', () => map.getViewPort().resize());

    //Step 3: make the map interactive
    // MapEvents enables the event system
    // Behavior implements default interactions for pan/zoom (also on mobile touch environments)
    var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

    // Create the default UI components
    var ui = H.ui.UI.createDefault(map, defaultLayers);