var http = require("http");
var utils = require("../common/utils");
var networkData = require("../common/data");

function APIRequest(config) {
  this.config = config;
}

APIRequest.prototype.for = function(line, station) {
  this.line = line;
  this.station = station;
  return this;
};

APIRequest.prototype.get = function(callback) {
  if (!utils.isStationOnLine(this.line, this.station, networkData)) {
    callback(null, null);
  }

  var formatCallback = this.format.bind(this);
  var path = "/Line/" + this.line + "/Arrivals/" + this.station;
  var queryString = "?app_id=" + this.config.APP_ID + "&app_key=" + this.config.APP_KEY;

  var options = {
    path: path + queryString,
    hostname: "api.beta.tfl.gov.uk",
    headers: { "Content-Type": "application/json" }
  };

  var request = http.request(options, function(response) {
    var str = "";

    response.setEncoding("utf8");

    response.on("data", function(chunk) {
      str+= chunk;
    });

    response.on("end", function() {
      callback(null, formatCallback(str));
    });
  });

  request.on("error", function(err) {
    callback(err);
  });

  request.end();
};

APIRequest.prototype.format = function(responseText) {
  return {
    request: {
      lineCode: this.line,
      stationCode: this.station
    },
    station: {
      lineName: networkData.lines[this.line],
      stationName: networkData.stations[this.station]
    },
    platforms: formatData(parseResponse(responseText))
  };
};

function parseResponse(responseText) {
  var jsonData;

  try {
    jsonData = JSON.parse(responseText);
  }
  catch(e) {
    return new Error("Data could not be parsed");
  }

  return jsonData;
};

function formatData(responseData) {
  var formattedData = {};

  var sortedData = responseData.sort(function(a, b) {
    return a.timeToStation - b.timeToStation;
  });

  sortedData.forEach(function(record) {
    formattedData[record.platformName] = formattedData[record.platformName] || [];
    formattedData[record.platformName].push(record);
  });

  return formattedData;
};

module.exports = APIRequest;