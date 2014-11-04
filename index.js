var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var serveStatic = require("serve-static");
var request = require("request");
var progress = require("request-progress");
var fs = require("fs");
var uuid = require('node-uuid');

var downloading = {};

io.on("connection", function(socket) {
	for (var i in downloading) {
		socket.emit("in progress", {
			"name": downloading[i].name,
			"title": downloading[i].title,
			"progress": (downloading[i].finished) ? 100 : downloading[i].state.percent,
			"finished": downloading[i].finished,
			"aborted": downloading[i].aborted
		});
	};

	socket.on("download", function(data) {
		var p = progress(request(data.url), {
		    throttle: 1000 // Throttle the progress event to 2000ms, defaults to 1000ms
		})
		p.name = uuid.v4();
		var temp = data.title.match(/[^\/?#]+(?=$|[?#])/);
		p.title = ((temp === null) ? "unnamed.bin" : temp[0]);
		p.aborted = false;
		p.finished = false;
		downloading[p.name] = p;
		p.on("progress", function (state) {
			io.emit("download progress", {
				"name": p.name,
				"progress": state.percent
			});
		})
		var f = fs.createWriteStream("download/" + data.title)
		f.on('close', function (err) {
			if (!p.aborted) {
				p.finished = true;
				socket.emit("download finished", p.name)
			};
		})
		p.pipe(f);
		p.on('error', function (err) {
		    socket.emit("download failed", p.name);
		})
		socket.emit("in progress", {
			"name": p.name,
			"title": p.title,
			"progress": 0,
			"finished": p.finished,
			"aborted": p.aborted
		});
	});

	socket.on("download abort", function(data) {
		if (!downloading[data].finished) {
			downloading[data].abort();
			downloading[data].aborted = true;
			io.emit("download aborted", data);
		};
	});
});

app.use("/", serveStatic("public"));

server.listen(8080);