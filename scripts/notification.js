
var timeLineLat;
var timeLineLon;
var timeLineTiS;
var minPositionLat;
var maxPositionLat;
var minPositionLon;
var maxPositionLon;
var timeGroupSize;
var infectionTimeList = [];
var infectedStartCount;
var infectedEndCount;
var infectedListLat = [];
var infectedListLon = [];
var infectedListTim = [];
var encountersLat;
var encountersLon;
var encountersTim;
var encountersLoaded=false;
let personCheck = false;

firebase.auth().onAuthStateChanged(function (user) {
  if (user) {
	//user is logged in
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
	  for (i = 0; i < infectionTimeList.length; i++) {
		db.collection('infected ' + infectionTimeList[i].toString()).get().then(function (snap) {
		  var loadID = infectedStartCount++;
		  snap.forEach(function (doc) { // iterate thru collections
			//UID CHECK HERE
			//doc.data.uid != userID
			infectedListLat.push(doc.data().lat);
			infectedListLon.push(doc.data().lon);
			infectedListTim.push(doc.data().tim);
		  });


		  //check if the infected arrays are full
		  if (++infectedEndCount == infectionTimeList.length) {
			//the 3 infected arrays are full here:
			console.log(infectedListTim.length);

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
				  //check for points that are within 100 meters and within 1min apart from each other
				  if ((measure(timeLineLat[a][b], timeLineLon[a][b], infectedListLat[c],
					  infectedListLon[c]) <= 100.0) &&
					((Math.abs(timeLineTiS[a][b] - infectedListTim[c])) <= 60 * 1000)) {
					//encounter!!!
					encountersLat[a].push(timeLineLat[a][b]);
					encountersLon[a].push(timeLineLon[a][b]);
					encountersTim[a].push(timeLineTiS[a][b]);
					console.log(a.toString() + " " + b.toString() + " " + c.toString());
					break;
				  }
				}
			  }
			}
			encountersLoaded=true;

			var personEncountered=false;
			for(a=0;a<encountersTim.length;a++) {
			  if(encountersTim[a].length>0){
				personEncountered=true;
				break;
			  }
			}
			if(personEncountered){
				personCheck = true;
			}
			else{
				personCheck = false;
			}
			
		  }
		}).catch(function (error) {
		  console.log("Error getting document:", error);
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


//No alerts
function alertOff(){
	document.getElementById("globe").src = "images/safe.png";
	document.getElementById("status").style.display = "none";
	document.getElementById("message").innerHTML = "<i>You are safe!</i>";
}

//Alerts
function alertOn(){
	document.getElementById("globe").src = "images/warning.png";
	document.getElementById("status").style.display = "block";
	document.getElementById("message").innerHTML = "<i>You are exposed!</i>";
}

//Button modifier
function checker(){
	if (personCheck == false){
		alertOff();
	}
	else {
		alertOn();
	}
}

//Runs code on load
window.onload = function() {
	this.checker();
};
