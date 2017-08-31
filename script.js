var config = {
    databaseURL: "https://devops-temperature.firebaseio.com",
    storageBucket: "devops-temperature.appspot.com"
};

firebase.initializeApp(config);

// Get a reference to the database service
var database = firebase.database();

var values = [];

var dataRef = firebase.database().ref('rest')
dataRef.on('child_added', function(data) { 
    var dataDiv = $("#data");
    var unixTime = data.key * 1000;
    var date = new Date(unixTime);
    var dateStr = date.toLocaleTimeString();
//    dataDiv.prepend("<div>" + dateStr+ ": " + data.val() + "</div>");

    values.push([ unixTime, data.val() ]);

    var zingConfig = { type: "line",
		       series: [{ values: values }],
		       scaleX: {
			   transform: {
			       type: 'date',
			       all: '%h:%i %A'
			   }
		       },
		       scaleY: {
			   values: "65:90:5"
		       }
		     };
    zingchart.render({id: "chart", data: zingConfig, height: 400 });
});
