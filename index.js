var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var serveStatic = require("serve-static");
var request = require("request");
var progress = require("request-progress");
var fs = require("fs");
var uuid = require('node-uuid');

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
			"name": downloading[i].name,
			"title": downloading[i].title,
			"progress": (downloading[i].status == "finished") ? 100 : downloading[i].state.percent, // If the download has finished just sent 100
			"status": downloading[i].status
		});
	}

	// Trigged when a client request that a download is initialized
	socket.on("download", function(data) {
		// Start the download
		var p = progress(request(data.url));

		p.name = uuid.v4();		// Reference name
		p.title = data.title;	// Filename
		p.status = "working";	// Initial status
		downloading[p.name] = p;// List the download for further reference

		// Sends out progress status when we get them
		p.on("progress", function (state) {
			io.emit("download progress", {
				"name": p.name,
				"progress": state.percent
			});
		});

		// Open a write stream for writing the downloaded file to disk
		var f = fs.createWriteStream(downloadDir + data.title);

		// Triggerd when when the stream is closed
		f.on('close', function (err) {
			if (p.status !== "aborted") {
				p.status = "finished";
				socket.emit("download status", {
					"name": p.name,
					"status": p.status
				});
			}
		});

		// Write downloaded data to the stream
		p.pipe(f);

		// Incase the download fails
		p.on('error', function (err) {
			p.status = "failed";
			socket.emit("download status", {
				"name": p.name,
				"status": p.status
			});
		});

		// Info all clients that there is a new download
		io.emit("in progress", {
			"name": p.name,
			"title": p.title,
			"progress": 0,
			"status": p.status
		});
	});

	// Triggered when download is aborted
	socket.on("download abort", function(name) {
		if (downloading[name].status == "working") {
			downloading[name].abort();
			downloading[name].status = "aborted";
			io.emit("download status", {
				"name": name,
				"status": downloading[name].status
			});
		}
	});

	// Send from client to check if a file exists
	socket.on("exists", function(name) {
		fs.exists(downloadDir + name, function(exists) { //.replace("../", "")
			socket.emit("exists", {
				"exists": exists,
				"name": name
			});
		});
	});

	// Triggered when a client has request a download removed from the list of files
	socket.on("download remove", function(name) {
		var d = downloading[name];
		if (d.status != "working") {
			delete downloading[name];
			io.emit("remove", name);
		}
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
