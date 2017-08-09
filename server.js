// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

var url = require('url');
var mongodb = require('mongodb').MongoClient;
var https = require('https');

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/api/latest/imagesearch", (request, response) => {
  mongodb.connect('mongodb://martin:12345@ds013320.mlab.com:13320/freecodecamp', (error, db) => {
    var searches = db.collection("image-searches");

    searches.find().sort({_id:-1}).limit(10).toArray((error, docs) => {
      var result = docs.map((search) => {
        return {search: search.search, when: search.when}
      });

      db.close();

      response.setHeader("ContentType", "application/json");
      response.send(result);
    });
  });
});

app.get("/api/imagesearch/*", (request, response) => {
  var parsedUrl = url.parse(request.url);
    
  var searchString = request.params[0];
  var offset = parsedUrl.query ? parseInt(parsedUrl.query.split('=')[1]) : 0;

    var rangeString = "";

    if (offset > 0) {
      rangeString = `&start=${offset}`;
    }

    var options = {
      host: 'www.googleapis.com',
      port: 443,
      path: `/customsearch/v1?key=AIzaSyDPOube7jscHUnNxDYoDzCG7Uqx9Geee08&cx=016461837534488714308:wajsf7b1xou&num=10${rangeString}&fields=items(title,link,pagemap,snippet,formattedUrl)&q=${encodeURIComponent(searchString)}`,
      method: 'GET'
    };

    https.request(options, (res) => {
      var result = "";

      res.setEncoding('utf8');

      res.on('data', function (chunk) {
        result += chunk;
      });

      res.on('end', () => {
        var data = JSON.parse(result);

        if (data.items == null) {
          console.log(data);
          response.status(500).send(data);
        } else {
          var returnData = data.items.map((img) => {
            return {url: img.pagemap.imageobject[0].url || img.pagemap.cse_image[0].url, snippet: img.snippet, thumbnail: img.pagemap.cse_thumbnail ? img.pagemap.cse_thumbnail[0].src : null, context: img.formattedUrl};
          });

          response.setHeader("ContentType", "application/json");
          response.send(returnData);

          mongodb.connect('mongodb://martin:12345@ds013320.mlab.com:13320/freecodecamp', (error, db) => {
              var searches = db.collection("image-searches");
              searches.insert({search:searchString, when: new Date()});
              db.close();
          });                     
        } 
     });
  }).end();
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
