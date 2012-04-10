
/**
 * Module dependencies.
 */

var express	= require('express')
  , fs		= require('fs')
  , path	= require('path')
  , jstl	= require('jstl-wc')
  , routes	= require('./routes');

var app = module.exports = express.createServer();

// Configuration
var opts = {
	 'root'			: '/root'
	,'views'		: '/views'
	,'view engine'	: 'jstl-wc'
	,'view cache'	: true
	,'view options'	: {layout:false}
	,'static'		: '/resource'
	,'method'		: 'method'
};

app.configure(function(){
	app.set('views', __dirname + opts.root + opts.views);
	app.set('view engine', opts['view engine']);
	app.set('view options', opts['view options']);
	app.set('view cache', opts['view cache']);
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: "wc" }));
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(opts.static, express.static(__dirname + opts.root + opts.static));
	app.register('.wc', jstl);
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	app.use(express.errorHandler());
});

// Routes

app.all('*.html', function(request, response, next){
	fs.readFile(path.normalize('.' + opts.root + opts.views + request.path), 'utf8', function(err, text){
		response.send(text);
	});
});

app.all('*.js', function(request, response, next){
	if( request.path.indexOf(opts.static) == -1 ) {
		var method = request.param(opts.method);
		var exec = require('.' + opts.root + opts.views + request.path);
			exec = (exec[method]||exec.execute);
		if( typeof(exec) != 'function' ) {
			throw "can't find method:" + request.path + "#" + (request.method||'execute');
		}
		request.params = getParams(request);
		return exec.call(this, request, response, next);
	}
	next();
});


app.get('/', routes.index);

app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

var extend = function(target) {
	for(var i=1; i<arguments.length; i++) {
		var src = arguments[i];
		for(var attr in src) {
			target[attr] = src[attr];
		}
	}
	return target;
}
var getParams = function(request) {
	var params = extend({}, request.params||{}, request.query||{}, request.body || {});
	for(var attr in params) {
		if( typeof(params[attr]) != 'string' ) {
			delete params[attr];
		}
	}
	return params;
}
