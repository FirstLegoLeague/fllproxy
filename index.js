var express = require('express');
var proxyMiddleware = require('http-proxy-middleware');
var forever = require('forever-monitor'); 
var config = require('./config.json');
var path = require('path');
var appPath = config.appPath;

var children = spawnProcesses(config.contexts);
var proxies = createProxies(config.contexts);

function spawnProcesses(config) {
    Object.keys(config).map(function(context) {
        var port = config[context].port;
        var auth = config[context].auth;
        var child = new (forever.Monitor)(appPath, {
            max: 3,
            silent: false,
            args: ['-p',port,'-d',path.join('data',context)],
            cwd: path.dirname(appPath),
        });

        child.on('exit', function () {
            console.log('child for region',context,'has exited after 3 restarts. Port',port);
        });

        child.start();
        return child;
    });
}

function createProxies(config) {
    return Object.keys(config).map(function(context) {
        var port = config[context].port;
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