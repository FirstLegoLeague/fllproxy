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
        var args = ['-s','-p',port,'-d',path.join('data',key)];
        if (processConf.auth) {
            args.push('-u',processConf.auth);
        }
        var child = new (forever.Monitor)(appPath, {
            max: 3,
            silent: false,
            args: args,
            cwd: path.dirname(appPath),
            killTree: true,
            killSignal: 'SIGTERM'
        });

        child.on('exit', function () {
            console.log('child for region',key,'has exited. Port',port);
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
    app.get('/:context$',function(req,res) {
        res.redirect('/'+req.params.context+'/');
    });
    app.get('/:context/admin/$',function(req,res) {
        res.redirect('/'+req.params.context+'/admin');
    });
    //create all proxies;
    proxies.forEach(function(proxy) {
        app.use(proxy);
    });
    app.listen(config.port);

//exit handling, from http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
function exitHandler(options, err) {
    console.log(options.sig);
    // Note: children are already started with "-s" option, so they will already
    // shut down when they detect their stdin is closed.
    children.forEach(function(child) {
        if (child.running) {
            child.kill(true);
        }
    });
    if (err) console.log(err.stack);
    if (options && options.exit) {
        // Slight delay to allow signals to be sent, before this process exits.
        // Again, no big deal if this fails.
        setTimeout(function() {
            process.exit();
        },100);
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {sig:'exit'}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true,sig:'SIGINT'}));

//catches sigterm
process.on('SIGTERM', exitHandler.bind(null, {exit:true,sig:'SIGTERM'}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true,sig:'exception'}));
