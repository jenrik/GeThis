module.exports = function(state) {
	var io = require("socket.io")(state.server);
	var downloading = state.downloads;
	var logger = state.logger;

	// Triggered when a client connects
	io.on("connection", function(socket) {
		// Inform connecting clients about all downloads in the system
		for (var i in downloading) {
			var d = downloading[i];

			socket.emit("in progress", {
				"name": d.id,
				"title": d.filename,
				"progress": (d.status == "finished") ? 100 : d.progress, // If the download has finished just sent 100
				"status": d.status
			});
		}

		// Trigged when a client request that a download is initialized
		socket.on("download", function(data) {
			state.funcs.download(data.title, data.url, {
				protocol: "websocket",
				ip: socket.handshake.address
			});
		});

		// Triggered when download is aborted
		socket.on("download abort", function(id) {
			state.funcs.abort(id, {
				protocol: "websocket",
				ip: socket.handshake.address
			});
		});

		// Send from client to check if a file exists
		socket.on("exists", function(filename) {
			state.funcs.exists(filename, function(exists) {
				socket.emit("exists", {
					"exists": exists,
					"name": filename
				});
			});
		});

		// Fired when a client has requested a download removed from the list of files
		socket.on("download remove", function(id) {
			state.funcs.remove(id, {
				protocol: "websocket",
				ip: socket.handshake.address
			});
		});

		state.emitter.on("download removed", function(d) {
			io.emit("remove", d.id)
		});

		state.emitter.on("progress", function(d) {
			io.emit("download progress", {
				"name": d.id,
				"progress": d.progress
			});
		});

		state.emitter.on("status changed", function(d) {
			socket.emit("download status", {
				"name": d.id,
				"status": d.status
			});
		});

		state.emitter.on("download started", function(d) {
			io.emit("in progress", {
				"name": d.id,
				"title": d.filename,
				"progress": d.progress,
				"status": d.status
			});
		});

		logger.log("info", "websocket client connected", {
			"clientIp": socket.handshake.address
		});
	});
}
