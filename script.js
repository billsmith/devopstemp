var config = {
    databaseURL: "https://devops-temperature.firebaseio.com",
    storageBucket: "devops-temperature.appspot.com"
};

firebase.initializeApp(config);

// Get a reference to the database service
var database = firebase.database();

var values = [];

var dataRef = firebase.database().ref('rest')
 
var now = new Date().getTime() / 1000;
var twoHoursAgo = Math.round(now - (60*60*2));

var query = dataRef.orderByKey().startAt(twoHoursAgo.toString());
query.on('child_added', function(data) { 
    var unixTime = data.key * 1000
    values.push([ unixTime, data.val() ]);

    // max 120 data points
    if (values.length > 120) {
	values.shift();
    }

    var tMin = values[0][1];
    var tMax = values[0][1];
    for (i = 1; i<values.length; i++)  {
	tMin = Math.min(tMin,values[i][1]);
	tMax = Math.max(tMax,values[i][1]);
    }
    var deltaT = tMax - tMin;
    var zingConfig = { type: "line",
		       series: [{ values: values }],
		       scaleX: {
			   transform: {
			       type: 'date',
			       all: '%h:%i %A'
			   }
		       },
		       scaleY: {
			   "min-value": (tMin - deltaT/10),
			   "max-value": (tMax + deltaT/10)
		       }
		     };
    zingchart.render({id: "chart", data: zingConfig, height: 400 });
});
