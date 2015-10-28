FllProxy
=======

Goal

- create a server that
	- takes a config with region names and port numbers
	- spawns processes for each of the region, with -p and -d cli parameters (using [forever-mnitor](https://github.com/foreverjs/forever-monitor))
	- proxies requests in a context `/region/` to `http://localhost:port/` (using [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware))
	- provides a gui to manage and reload the config (using [express](http://expressjs.com/))

Setup

- clone the repository
- `npm install`
- `cp config.example.json config.json`
- adjust configuration
	- add instances
	- adjust ports to your likings
	- setup basic authentication
	- check fllscoring path