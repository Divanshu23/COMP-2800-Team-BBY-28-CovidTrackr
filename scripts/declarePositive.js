    //if the person's convid status has been loaded from the database
    var loadedStatus = false;
    //what the person's covid status is
    var covidStatus=false;
    var userID = null;
    //once the user has been loaded
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        // User is signed in.
        userID = user.uid;

        //get the user's covid19 status
        db.collection('positive').get().then(function (snap) {
          var foundUser = false;
          snap.forEach(function (doc) { // iterate thru collections
            if (doc.id === userID) {
              covidStatus = doc.data().isPositive;
              foundUser = true;
            }
          });
          
          //user covid-19 status is not in the database so let's add them
          if(!foundUser){
            var docData = {
              isPositive: false,
            };

            db.collection('positive').doc(userID).set(docData);
          }

          //update the text on the page
          loadedStatus = true;
          if (covidStatus) {
            $('#covidStatusDisplay').text("You are Covid-19 Positive");
          } else {
            $('#covidStatusDisplay').text("You are Covid-19 Negative");
          }

        });



      } else {
        // No user is signed in.
      }
    });


    //when the user clicks on the declare covid19 button
    $(document).on('click', '#declare', function (event) {
      if ((loadedStatus) && (!covidStatus)) {
        if (confirm("Are you sure you want to declare yourself Covid-19 Positive?")) {
          //user decided to declare covid positive
          covidStatus = true;
          var docData = {
            isPositive: true,
          };

          db.collection('positive').doc(userID).set(docData);
          $('#covidStatusDisplay').text("You are Covid-19 Positive");
          
          addPointsToInfectedFolder();
        } else {
          //user decided not to declare covid positive        
        }
      }

    })


    //user declared positive. Add their locations to the database
    function addPointsToInfectedFolder() {
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
        //we now need to loop through them and add the points into the database
        //3600000   = one hour in time stamps
        for (i = 0; i < dbReadDataTimeStamp.length; i++) {
          var docData = {
            lat: dbReadDataLat[i],
            lon: dbReadDataLon[i],
            tim: dbReadDataTimeStamp[i],
            uid: userID
          };
          //group points into the nearest hour
          var timeStampHour = Math.floor(dbReadDataTimeStamp[i] / 3600000.0) * 3600000;

          db.collection('infected ' + timeStampHour.toString()).doc(userID + dbReadDataTimeStamp[i]).set(docData);
        }
      });

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