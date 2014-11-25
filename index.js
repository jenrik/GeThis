var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var serveStatic = require("serve-static");
var request = require("request");
var progress = require("request-progress");
var fs = require("fs");
var uuid = require("node-uuid");
var winston = require("winston");

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

var downloading = {};				// The list of downloads
var downloadDir = "./download/";	// The directorie to download files to

// Make sure the download directorie exists
if(!fs.existsSync(downloadDir))
	fs.mkdirSync(downloadDir);

// Triggered when a client connects
io.on("connection", function(socket) {
	// Inform connecting clients about all downloads in the system
	for (var i in downloading) {
		socket.emit("in progress", {
			"name": downloading[i].id,
			"title": downloading[i].filename,
			"progress": (downloading[i].status == "finished") ? 100 : downloading[i].progress, // If the download has finished just sent 100
			"status": downloading[i].status
		});
	}

	// Trigged when a client request that a download is initialized
	socket.on("download", function(data) {
		if (data == null || data.title == null || typeof data.title !== "string" || data.title.length <= 0 || data.url == null || typeof data.url !== "string" || data.url.length <= 0) {
			logger.log("warning", "invalid data was send with download request", {
				"connectionMethod": "socket.io",
				"clientIp": socket.handshake.address,
				"data": data
			});
			return;
		}

		// Start the download
		var d = {
			request: progress(request(data.url)),	// The Request object
			id: uuid.v4(),							// ID
			filename: data.title,					// Filename
			url: data.url,							// Url downloaded from
			status: "working",						// Initial status
			progress: 0,							// Percent downloaded
			startedBy: socket.handshake.address		// The ip who initiated the download
		}

		downloading[data.id] = d;// List the download for further reference

		// Sends out progress status when we get them
		d.request.on("progress", function (state) {
			d.progress = state.percent;
			io.emit("download progress", {
				"name": d.id,
				"progress": d.progress
			});
		});

		// Open a write stream for writing the downloaded file to disk
		var f = fs.createWriteStream(downloadDir + data.filename);

		// Triggerd when when the stream is closed
		f.on("close", function (err) {
			if (d.status !== "aborted") {
				d.status = "finished";
				socket.emit("download status", {
					"name": d.id,
					"status": d.status
				});
			}
		});

		// Write downloaded data to the stream
		d.request.pipe(f);

		// Incase the download fails
		d.request.on("error", function (err) {
			d.status = "failed";
			socket.emit("download status", {
				"name": d.id,
				"status": d.status
			});
			logger.log("error", "download failed", {
				"filename": d.filename,
				"url": d.url,
				"startedBy": d.startedBy,
				"error": err
			});
		});

		// Info all clients that there is a new download
		io.emit("in progress", {
			"name": d.id,
			"title": d.filename,
			"progress": d.progress,
			"status": d.status
		});

		logger.log("notable", "download started", {
			"connectionMethod": "socket.io",
			"clientIp": socket.handshake.address,
			"receivedData": data
		});
	});

	// Triggered when download is aborted
	socket.on("download abort", function(id) {
		var d = downloading[id];
		if (d === null || d == undefined) {
			logger.log("warning", "invalid name was send with abort request", {
				"connectionMethod": "socket.io",
				"clientIp": socket.handshake.address,
				"undefined": id === undefined,
				"null": id === null
			});
			return;
		}
		if (d.status == "working") {
			d.request.abort();
			d.status = "aborted";
			io.emit("download status", {
				"name": id,
				"status": d.status
			});
			logger.log("notable", "download aborted", {
				"connectionMethod": "socket.io",
				"clientIp": socket.handshake.address,
				"filename": d.filename
			});
		} else {
			logger.log("warning", "attempted to abort non-working download", {
				"connectionMethod": "socket.io",
				"clientIp": socket.handshake.address,
				"filename": d.filename,
				"status": d.status
			});
		}
	});

	// Send from client to check if a file exists
	socket.on("exists", function(filename) {
		fs.exists(downloadDir + filename, function(exists) { //.replace("../", "")
			socket.emit("exists", {
				"exists": exists,
				"name": filename
			});
		});
	});

	// Triggered when a client has requested a download removed from the list of files
	socket.on("download remove", function(id) {
		var d = downloading[id];
		if (d === null || d == undefined) {
			logger.log("warning", "invalid name was send with remove request", {
				"connectionMethod": "socket.io",
				"clientIp": socket.handshake.address,
				"undefined": name === undefined,
				"null": name === null
			});
			return;
		}
		if (d.status != "working") {
			delete downloading[id];
			io.emit("remove", id);
			logger.log("info", "download removed", {
				"connectionMethod": "socket.io",
				"clientIp": socket.handshake.address,
				"filename": d.filename
			});
		} else {
			logger.log("warning", "attempted to remove working download", {
				"connectionMethod": "socket.io",
				"clientIp": socket.handshake.address,
				"filename": d.filename,
				"status": d.status
			});
		}
	});

	logger.log("info", "socket client connected", {
		"clientIp": socket.handshake.address
	});
});

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
server.listen(8080);
