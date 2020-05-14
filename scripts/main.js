$('#picture').mousedown(function () {
    myTimeout = setTimeout(function () {
        window.location.href = "./play/easterEgg.html";
      }, 4000);
    });

    $('#picture').mouseup(function () {
      clearTimeout(myTimeout);
    });

    $('#picture').on('touchstart', show);

    $('#picture').on('touchend', clear);

    function show(){
    setTimeout(function () {
        window.location.href = "./play/easterEgg.html";
      }, 4000);
    }

    function clear(){
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
      enableHighAccuracy: false,
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


    //Logout function
    $("#logoutButton").on('click', function () {
      firebase.auth().signOut().then(function () {
        //console.log("Singout Successful");
        window.location.href = "index.html";
      }, function (error) {
        //console.log("Some error occured");
      });
    })