//Pull user and location data from firebase

//Checks for matches

//No alerts
function alertOff(){
	document.getElementById("globe").src = "images/safe.png";
	document.getElementById("status").css.display = "none";
	document.getElementById("message").innerHTML = "<i>You are safe!</i>";
}

//Alerts
function alertOn(){
	document.getElementById("globe").src = "images/warning.png";
	document.getElementById("status").css.display = "block";
	document.getElementById("message").innerHTML = "<i>You are exposed!</i>";
}