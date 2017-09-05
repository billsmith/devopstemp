var config = {
    databaseURL: "https://devops-temperature.firebaseio.com",
    storageBucket: "devops-temperature.appspot.com"
};

firebase.initializeApp(config);


// Reminder:
// * Firebase keys are in unixtime, i.e. seconds since epoch.
// * zingChart wants time in milliseconds since epoch.
//
var TemperatureChart = (function() {
    var points = [];
    var dataRef = firebase.database().ref('rest')
    var updatingQuery = null;
    var timeInterval = null;
    var HOUR = 60*60;
    var DAY = 24*HOUR;
    var autoUpdate = null;
    var CHILD_ADDED = 'child_added';
    
    /*
     * Find the newest key that's not newer than tmax, then call something else to do something
     * with that number.
     */
    var findMaxKey = function(tMin, tMax) {
        var query = dataRef
            .orderByKey()
            .endAt(tMax.toString())
            .limitToLast(1);
        query.on(CHILD_ADDED, function(data) {
            query.off(CHILD_ADDED);
            loadPoints(tMin, data.key);
        });
    };


    /*
     * Load all points whose keys are between tmin and maxKey, inclusive, then
     * call something else with that data.
     */
    var loadPoints = function(tmin, maxKey) {
        var query = dataRef
            .orderByKey()
            .startAt(tmin.toString())
            .endAt(maxKey.toString());
        points = [];
        query.on(CHILD_ADDED, function(data) {
            var point = [ data.key * 1000, data.val() ];
            points.push(point);
            if (data.key >= maxKey) {
                query.off(CHILD_ADDED);
                makeRefreshingChart(maxKey, points);
            }
        });
    };

    /*
     * Graph the points, then register a callback to update when more points show up
     */
    var makeRefreshingChart = function(maxKey) {
        makeChart(maxKey);

        if (autoUpdate){
            updatingQuery = dataRef
                .orderByKey()
                .startAt(maxKey);
            updatingQuery.on("child_added", function(data) {
                if (data.key == maxKey) {
                    // avoid infinite loop
                    return;
                }

                points.push([data.key*1000, data.val()]);

                if (points.length > 120) {
                    points.shift();
                }

                makeChart(data.key);
            });
        }
    };

    var makeChart = function(maxKey) {
        var tempMin = points[0][1];
        var tempMax = points[0][1];
        for (i = 1; i<points.length; i++)  {
            var temp = points[i][1];
            tempMin = Math.min(tempMin,temp);
            tempMax = Math.max(tempMax,temp);
        }
        var deltaTemp = tempMax - tempMin;
        var zingConfig = {
            type: "line",
            series: [{ values: points }],
            scaleX: {
                transform: {
                    type: 'date',
                    all: '%m/%d\n%H:%i'
                },
                zooming: true
            },
            scaleY: {
                "min-value": (tempMin - deltaTemp/10),
                "max-value": (tempMax + deltaTemp/10)
            }
        };
        zingchart.render({id: "chart", data: zingConfig, height: 400 });

        zingchart.bind('chart', 'zoom', function(e) {
	    zoomVisibility();
            disableUpdatingQuery();
            unselectRangeType();
        });

    }

    var updateTimeRange = function(intervalStr) { // more flexible parameter, e.g. hash
        if (updatingQuery) {
            updatingQuery.off(CHILD_ADDED);
            updatingQuery = null;
        }
        var now = Math.round(new Date().getTime() / 1000);
        
        var unitCode = intervalStr.slice(-1);
        var unit;
        switch (unitCode) {
            case "h":
                unit = HOUR;
                break;
            case "d":
                unit = DAY;
                break;
            case "w":
                unit = 7*DAY;
                break;
            default:
                return;
        }

        var quantityStr = intervalStr.slice(0, -1);
        var quantity = Number.parseInt(quantityStr, 10);

        timeInterval = quantity * unit;

        var tMin = now - timeInterval;
        autoUpdate = true;
        findMaxKey(tMin, now);
    };

    var moveEarlier = function(tMin, tMax) {
        disableUpdatingQuery();
        unselectRangeType();
        var tMin = Math.round(points[0][0]/1000);
        autoUpdate = false;
        findMaxKey(tMin-timeInterval, tMin);
    };

    var moveLater = function(tMin, tMax) {
        disableUpdatingQuery();
        unselectRangeType();
        var tMax = Math.round(points[points.length-1][0]/1000);
        autoUpdate = false;
        findMaxKey(tMax, tMax + timeInterval);
    };

    var disableUpdatingQuery = function() {
        if (updatingQuery) {
            updatingQuery.off(CHILD_ADDED);
            updatingQuery = null;
        }
    };  

    var unselectRangeType = function() {
        $("#t-range-select").val([]);
    };

    var unzoom = function() {
        zingchart.exec('chart', 'viewall');
	$("#earlier").css("visibility", "visible");
	$("#t-range-select").css("visibility", "visible");
	$("#later").css("visibility", "visible");
        $("#unzoom").css("visibility", "hidden");
    };

    var zoomVisibility = function() {
	$("#earlier").css("visibility", "hidden");
	$("#t-range-select").css("visibility", "hidden");
	$("#later").css("visibility", "hidden");
        $("#unzoom").css("visibility", "visible");
    };
    
    return {
        updateTimeRange: updateTimeRange,
        moveEarlier: moveEarlier,
        moveLater: moveLater,
        unzoom: unzoom
    };
})();


$("#t-range-select").on("change", function() {
    var optionSelected = $("#t-range-select").find("option:selected");
    var rangeType = optionSelected.val();
    TemperatureChart.updateTimeRange(rangeType);
});

$("#earlier").click(function() {
    TemperatureChart.moveEarlier();
});

$("#later").click(function() {
    TemperatureChart.moveLater();
});

$("#unzoom").click(function() {
    TemperatureChart.unzoom();
});

$("#past2Hours").prop("selected", true);
TemperatureChart.updateTimeRange("2h");


