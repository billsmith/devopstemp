var config = {
    databaseURL: "https://devops-temperature.firebaseio.com",
    storageBucket: "devops-temperature.appspot.com"
};

firebase.initializeApp(config);

var TemperatureChart = (function() {
    var points = [];
    var dataRef = firebase.database().ref('rest')
    var updatingQuery = null;
    
    /*
     * Find the newest key that's not newer than tmax, then call something else to do something
     * with that number.
     */
    var findMaxKey = function(tmin, tmax) {
        // find newest key at least as old as tmax
        var query = dataRef.orderByKey().limitToLast(1);
        query.on('child_added', function(data) {
            query.off('child_added');
            loadPoints(tmin, data.key);
        });
    };


    /*
     * Load all points whose keys are between tminand keyMax, inclusive, then
     * call something else with that data.
     */
    var loadPoints = function(tmin, keyMax) {
        updatingQuery = dataRef
            .orderByKey()
            .startAt(tmin.toString())
            .endAt(keyMax.toString());
        points = [];
        updatingQuery.on('child_added', function(data) {
            var point = [ data.key * 1000, data.val() ];
            points.push(point);
            if (data.key >= keyMax) {
                updatingQuery.off('child_added');
                makeRefreshingChart(keyMax, points);
            }
        });
    };

    /*
     * Graph the points, then register a callback to update when more points show up
     */
    var makeRefreshingChart = function(keyMax) {
        makeChart(keyMax);

        var query = dataRef
            .orderByKey()
            .startAt(keyMax)
            .on("child_added", function(data) {
                if (data.key == keyMax) {
                    // avoid infinite loop
                    return;
                }

                points.push([data.key*1000, data.val()]);

                if (points.length > 120) {
                    points.shift();
                }

                makeChart(data.key);
            });
    };

    var makeChart = function(keyMax) {
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
                    all: '%h:%i %A'
                }
            },
            scaleY: {
                "min-value": (tempMin - deltaTemp/10),
                "max-value": (tempMax + deltaTemp/10)
            }
        };
        zingchart.render({id: "chart", data: zingConfig, height: 400 });
    }

    var updateTimeRange = function(type) {
        if (updatingQuery) {
            updatingQuery.off('child_added');
        }
        var now = new Date().getTime() / 1000;
        switch (type) {
        case "1hour":
            var oneHourAgo = Math.round(now - (60*60));
            findMaxKey(oneHourAgo, now);
            break;
        case "2hours":
            var twoHoursAgo = Math.round(now - (2*60*60));
            findMaxKey(twoHoursAgo, now);
            break;
        case "4hours":
            var fourHoursAgo = Math.round(now - (4*60*60));
            findMaxKey(fourHoursAgo, now);
            break;
        case "1day":
            var oneDayAgo = Math.round(now - (24*60*60));
            findMaxKey(oneDayAgo, now);
            break;
        case "2days":
            var twoDaysAgo = Math.round(now - (2*24*60*60));
            findMaxKey(twoDaysAgo, now);
            break;
        case "1week":
            var oneWeekAgo = Math.round(now - (7*24*60*60));
            findMaxKey(oneWeekAgo, now);
            break;
        }
    };

    return {
        updateTimeRange: updateTimeRange
    };
})();

$("#t-range-select").on("change", function() {
    var optionSelected = $("#t-range-select").find("option:selected");
    var rangeType = optionSelected.val();
    TemperatureChart.updateTimeRange(rangeType);
});

TemperatureChart.updateTimeRange("1hour");


