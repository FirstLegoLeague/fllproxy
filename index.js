var express = require('express');
var proxyMiddleware = require('http-proxy-middleware');
var forever = require('forever-monitor'); 
var config = require('./config.json');

var proxies = createProxies(config.contexts);

function createProxies(config) {
    return Object.keys(config).map(function(context) {
        var port = config[context];
        var pathRewrite = {};
        pathRewrite['^/'+context] = '';
        return proxyMiddleware('/'+context, {
            target: 'http://localhost:'+port,
            changeOrigin: true,
            pathRewrite: pathRewrite
        });
    });
}

var app = express();
    //create all proxies;
    proxies.forEach(function(proxy) {
        app.use(proxy);
    });
    app.listen(config.port);