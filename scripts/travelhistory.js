const welcome = document.getElementById("welcomeMessage");
    db.collection("users").onSnapshot(function (querySnapshot) {
      welcome.innerHTML = "<i>" + firebase.auth().currentUser.displayName + ": Travel History </i>";
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
    var travelHistoryTimes = [];
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
            travelHistoryTimes.push(doc.data().timeStamp);

            i += 1;
          });

          //ONLY STORE 2 WEEKS WORTH OF TRAVEL HISTORY
          var curDate = new Date();
          var curTime = curDate.getTime();
          //look for old travel data to delete
          for (i = 0; i < travelHistoryTimes.length; i++) {
            //1000 * 60 * 60 * 24 * 7 * 2 = two weeks 
            if (travelHistoryTimes[i] + 1000 * 60 * 60 * 24 * 7 * 2 < curTime) {
              db.collection(userID + ' tracking').doc(travelHistoryTimes[i].toString()).delete().then(
              function () {
                //console.log("Document successfully deleted!");
              }).catch(function (error) {
                //console.error("Error removing document: ", error);
              });
            }
          }

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

          //find the min and max points for the map view
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


          //create the travel history buttons for different times
          var newHtml = "";
          for (i = 0; i < timeGroups; i++) {
            //check if the points on the map are too close together
            var tooCloseTogether = true;
            var f;
            for (f = 1; f < timeLineTiS[i].length; f++) {
              var distanceBetween = Math.sqrt(Math.pow(timeLineLat[i][f] - timeLineLat[i][f - 1], 2) + Math.pow(
                timeLineLon[i][f] - timeLineLon[i][f - 1], 2));
              if (distanceBetween > 0.000001) {
                tooCloseTogether = false;
                break;
              }
            }

            //look for points that are too close together
            if (!tooCloseTogether) {
              var s = new Date(timeLineTiS[i][0]).toLocaleDateString("en-US") + " " + new Date(timeLineTiS[i][
                0
              ]).toLocaleTimeString("en-US");
              newHtml += "<div class='btnContainer'>"
              newHtml += "<button type='button' class='travelHistoryButton' name='" + i.toString() + "'>" + s +
                "</button>";
              newHtml += "</div>"
            }
          }
          $('#routeButtonHolder').html(newHtml);

        });
      } else {
        //user is not logged in
      }
    });


    //when a user travel path button has been clicked on
    var currentPath;
    $(document).on('click', '.travelHistoryButton', function (event) {
      //alert($( this ).attr("name"));
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

      var bbox = new H.geo.Rect(newTop, newLeft, newBottom, newRight);
      map.getViewModel().setLookAtData({
        bounds: bbox
      });

      //create the travel path
      var i;
      var lineString = new H.geo.LineString();
      for (i = 0; i < timeGroupSize[routeNum]; i++) {
        lineString.pushPoint({
          lat: timeLineLat[routeNum][i].toString(),
          lng: timeLineLon[routeNum][i].toString()
        });
      }

      if (currentPath)
        map.removeObject(currentPath);
      currentPath = new H.map.Polyline(lineString, {
        style: {
          lineWidth: 4
        }
      });
      map.addObject(currentPath);

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