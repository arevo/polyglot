// *******************************************
// DATABASE STUFF ****************************
// *******************************************
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
mongoose.Promise = global.Promise;

var quoteSchema = mongoose.Schema({
        content: String,
        author: String,
        index: Number
});

var quotecount;
var Quote = mongoose.model('Quote', quoteSchema)
// Find the highest quote number for creating new index
Quote.findOne().sort({"index": -1}).exec(function(err, quote){
   quotecount = quote.index;
});

// *******************************************
// EXPRESS STUFF  ****************************
// *******************************************

var express = require('express');
var app = express();
var router = express.Router();    
var path = require('path');
var bodyParser = require('body-parser');

// Register static path
app.use('/demo', express.static(path.join(__dirname, '..', 'static')));
app.use(bodyParser.json());
app.set('json spaces', 2);

// Base URI for the REST api routes
app.use('/api', router);

// Quote list
router.route('/quotes')
// Get last 10 quotes
.get(function(request, reply) {
   var result = Quote.find().sort({'index': -1}).limit(10);
   result.exec(function(err, quotes) {
	   reply.send(quotes);
   });
})
// Create new quote
.post(function(request, reply) {
  if(!request.body.hasOwnProperty('content')) {
    return reply.status(400).send('Error 400: Post syntax incorrect.');
  }
  // Simple way to create a new quote index for this demo
  quotecount = quotecount+1; 
  var newQuote;
  if (request.body.hasOwnProperty('author')) {
    newQuote = new Quote({'content': request.body.content, 'author': request.body.author, 'index': quotecount});
  } else {
    newQuote = new Quote({'content': request.body.content, 'index':quotecount});
  }
  newQuote.save(function (err, newQuote) {
    if (err) return console.error(err);
    return reply.status(201).send(newQuote);
  });
});

// Random quote
// /api/quotes/random
router.route('/quotes/random')
.get(function(request, reply) {
    var random = Math.floor(Math.random() * quotecount);
    var result = Quote.findOne({"index":random});
    result.exec(function(err, quote) {
      reply.send(quote);
    });
});

// /api/quotes/1
router.route('/quotes/:index')
// get existing quote
.get(function(request, reply) {
    var result = Quote.findOne({"index":request.params.index});
    result.exec(function(err, quote) {
      reply.send(quote);
    });
})
// update existing quote
.put(function(request, reply) {
  if(!request.body.hasOwnProperty('content') && (!request.body.hasOwnProperty('author'))) {
    return reply.status(400).send('Error 400: Put syntax incorrect.');
  }
  var query = {'index':request.params.index};
  var newQuote = new Quote();
  if (request.body.hasOwnProperty('author')) {
        newQuote.author = request.body.author;
  };
  if (request.body.hasOwnProperty('content')) {
        newQuote.content = request.body.content;
  };
  var upsertData = newQuote.toObject();
  delete upsertData._id;
  Quote.findOneAndUpdate(query, upsertData, {upsert:true}, function(err, doc){
    if (err) return reply.send(500, { error: err });
    return reply.status(202).send(upsertData);
  });
})
// delete existing quote
.delete(function(request, reply) {
   result = Quote.findOneAndRemove({"index":request.params.index});
   result.exec(function (err, result) {
        reply.status(204).send();
    });
});

// index with helpful message
app.get('/', function(req, res) {
  res.send('Hello world from express');
});

var server = app.listen(8080, "0.0.0.0", function() {
  console.log('Express is listening to http://localhost:8080');
});

