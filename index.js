var express = require('express');
var proxyMiddleware = require('http-proxy-middleware');
var forever = require('forever-monitor'); 
var config = require('./config.json');
var path = require('path');
var appPath = config.appPath;

var children = spawnProcesses(config.contexts);
var proxies = createProxies(config.contexts);

function spawnProcesses(config) {
    return Object.keys(config).map(function(key) {
        var processConf = config[key];
        var port = processConf.port;
        var args = ['-p',port,'-d',path.join('data',key)];
        if (processConf.auth) {
            args.push('-u',processConf.auth);
        }
        var child = new (forever.Monitor)(appPath, {
            max: 3,
            silent: false,
            args: args,
            cwd: path.dirname(appPath),
            killTree: true
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
    app.get('/:context$',function(req,res) {
        res.redirect('/'+req.params.context+'/');
    });
    proxies.forEach(function(proxy) {
        app.use(proxy);
    });
    app.listen(config.port);

//exit handling, from http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
function exitHandler(options, err) {
    children.forEach(function(child) {
        child.kill(true);
    });
    if (err) console.log(err.stack);
    if (options && options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler);

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));