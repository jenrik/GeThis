var request = require("request");
var progress = require("request-progress");
var fs = require("fs");
var uuid = require("node-uuid");
var winston = require("winston");

var app = require("express")();
var serveStatic = require("serve-static");
var server = require("http").createServer(app);

var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)()
	],
	levels: {
		"info": 0,
		"notable": 1,
		"warning": 2,
		"error": 3
	}
});

var state = {
	"logger": logger,
	"downloads": {},
	"config": {
		"downloadDir": "./download/", // The directorie to download files to
		"port": process.env.PORT || 8080 // Port to serve on
	},
	"server": server,
	"app": app,
	"emitter": new (require('events').EventEmitter),
	"funcs": {},
	"validation": require(__dirname + "/libs/validation.js")
}

// Make sure the download directorie exists
if(!fs.existsSync(state.config.downloadDir)) {
	fs.mkdirSync(state.config.downloadDir);
	logger.log("info", "created download directorie", state.config.downloadDir);
}

/**
 * Functions
 */
state.funcs.getAFilename = function(url) {
	var match = url.match(/[^\/?#]+(?=$|[?#])/);
	var name = "unnamed";
	if (match !== null)
		name = match[0];

	if (!fs.existsSync(state.config.downloadDir + name)) {
		return name;
	}

	var running = true;
	var num = 0;
	while(running) {
		num++;
		running = fs.existsSync(state.config.downloadDir + name + "." + num);
	}

	return name + "." + num;
}

state.funcs.download = function(filename, url, executor) {
	if (!state.validation.url(url)) {
		logger.log("warning", "invalid url given to download", {
			"connectionMethod": executor.protocol,
			"clientIp": executor.ip,
			"filename": filename,
			"url": url
		});

		if (executor.callback)
			executor.callback(false, {
				"error": "invalid url"
			});

		return;
	}

	if (!state.validation.filename(filename)) {
		logger.log("warning", "invalid filename given to download", {
			"connectionMethod": executor.protocol,
			"clientIp": executor.ip,
			"filename": filename,
			"url": url
		});

		if (executor.callback)
			executor.callback(false, {
				"error": "invalid filename"
			});

		return;
	}

	// Start the download
	var d = {
		request: progress(request(url)),		// The Request object
		id: uuid.v4(),							// ID
		filename: filename,						// Filename
		url: url,								// Url downloaded from
		status: "working",						// Initial status
		progress: 0,							// Percent downloaded
		startedBy: executor.ip,					// The ip who initiated the download
		startedWith: executor.protocol			// The protocol the download was started with
	}

	state.downloads[d.id] = d;// List the download for further reference

	// Sends out progress status when we get them
	d.request.on("progress", function (download) {
		d.progress = (download.percent == null) ? 0 : download.percent;
		state.emitter.emit("progress", d);
	});

	// Open a write stream for writing the downloaded file to disk
	var f = fs.createWriteStream(state.config.downloadDir + filename);

	// Triggerd when when the stream is closed
	f.on("close", function (err) {
		if (d.status !== "aborted") {
			d.status = "finished";
			state.emitter.emit("status changed", d);
		}
	});

	// Write downloaded data to the stream
	d.request.pipe(f);

	// Incase the download fails
	d.request.on("error", function (err) {
		d.status = "failed";
		state.emitter.emit("status changed", d);

		logger.log("error", "download failed", {
			"filename": d.filename,
			"url": d.url,
			"startedBy": d.startedBy,
			"error": err
		});
	});

	// Info all clients that there is a new download
	state.emitter.emit("download started", d);

	logger.log("notable", "download started", {
		"connectionMethod": executor.protocol,
		"clientIp": executor.ip,
		"filename": filename,
		"url": url
	});

	if (executor.callback)
		executor.callback(true, {
			"filename": filename,
			"url": url,
			"id": d.id
		});
}

state.funcs.abort = function(id, executor) {
	var d = state.downloads[id];
	if (d === null || d == undefined) {
		logger.log("warning", "invalid id given to abort", {
			"connectionMethod": executor.protocol,
			"clientIp": executor.ip,
			"undefined": id === undefined,
			"null": id === null
		});

		if (executor.callback)
			executor.callback(false, {
				"error": "invalid id"
			});

		return;
	}
	if (d.status == "working") {
		d.request.abort();
		d.status = "aborted";

		state.emitter.emit("status changed", d);

		logger.log("notable", "download aborted", {
			"connectionMethod": executor.protocol,
			"clientIp": executor.ip,
			"filename": d.filename
		});

		if (executor.callback)
			executor.callback(true, {});
	} else {
		logger.log("warning", "attempted to abort non-working download", {
			"connectionMethod": executor.protocol,
			"clientIp": executor.ip,
			"filename": d.filename,
			"status": d.status
		});

		if (executor.callback)
			executor.callback(false, {
				"error": "specified download is not in the process of downloading"
			});
	}
}

state.funcs.exists = function(filename, cb) {
	fs.exists(state.config.downloadDir + filename, function(exists) {
		cb(exists);
	});
}

state.funcs.remove = function(id, executor) {
	var d = state.downloads[id];
	if (d === null || d == undefined) {
		logger.log("warning", "invalid id given to remove", {
			"connectionMethod": executor.protocol,
			"clientIp": executor.ip,
			"undefined": id === undefined,
			"null": id === null
		});

		if (executor.callback)
			executor.callback(false, {
				"error": "invalid id"
			});

		return;
	}
	if (d.status != "working") {
		delete state.downloads[id];

		state.emitter.emit("download removed", d);

		logger.log("info", "download removed", {
			"connectionMethod": executor.protocol,
			"clientIp": executor.ip,
			"filename": d.filename
		});

		if (executor.callback)
			executor.callback(true, {});
	} else {
		logger.log("warning", "attempted to remove working download", {
			"connectionMethod": executor.protocol,
			"clientIp": executor.ip,
			"filename": d.filename,
			"status": d.status
		});

		if (executor.callback)
			executor.callback(false, {
				"error": "the specified id is in the process of downloading"
			});
	}
}

// Setup websocket
require(__dirname + "/libs/websocket.js")(state);

// Setup HTTP
require(__dirname + "/libs/http.js")(state);

// Serves static files that a system specific
app.use("/", serveStatic(__dirname + "/public", {
	extension: ["html"],
	lastModified: true,
	dotfiles: "ignore"
}));

// Serves bower components
app.use("/bower_components", serveStatic(__dirname + "/bower_components", {
	extension: ["html"],
	lastModified: true,
	dotfiles: "ignore"
}));

//Start the server
server.listen(state.config.port);
