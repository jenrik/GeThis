function setStyle(e, s) {
	e.removeClass("panel-primary");
	e.removeClass("panel-success");
	e.removeClass("panel-info");
	e.removeClass("panel-warning");
	e.removeClass("panel-danger");
	e.addClass("panel-" + s);

	var p = getProgressBar(e);
	p.removeClass("progress-bar-success");
	p.removeClass("progress-bar-info");
	p.removeClass("progress-bar-warning");
	p.removeClass("progress-bar-danger");
	p.addClass("progress-bar-" + s);
}

function getDownload(s) {
	return $("#" + s);
}

function getProgressBar(e) {
	return e.find(".progress > .progress-bar");
}

function getRemoveButton(e) {
	return e.find(".remove > button");
}

function disableRemoveButton(e) {
	return getRemoveButton(e).attr("disabled", true);
}

$(document).ready(function() {
	var socket = io();
	var $downloads = $("#downloads");
	var $name = $("#name");
	var $url = $("#url");
	var download = Handlebars.compile($("#template-download").html());

	socket.on("connect", function() {
		console.log("Connected to server");
		$downloads.empty();
		$("#name").removeAttr("disabled");
		$("#url").removeAttr("disabled");
		$("#submit").removeAttr("disabled");
	});

	socket.on("in progress", function(data) {
		console.log("In progress: " + JSON.stringify(data));
		if (data.finished) {
			data.panel = "success";
			data.progressbar = "success";
		} else if (data.aborted) {
			data.panel = "warning";
			data.progressbar = "warning";
		} else {
			data.panel = "primary";
			data.progressbar = "info";
		}

		if (data.finished || data.aborted) {
			data.disabled = true;
		};
		var e = $(download(data));
		getRemoveButton(e).on("click", function() {
			console.log("aborting: " + data.title);
			socket.emit("download abort", data.name);
		});
		$downloads.append(e);
	});

	socket.on("download finished", function(data) {
		console.log("Download finished: " + JSON.stringify(data));
		var e = getDownload(data);
		getProgressBar(e).css("width", "100%");
		setStyle(e, "success");
		disableRemoveButton(e);
	});

	socket.on("download failed", function(data) {
		console.log("Download failed: " + JSON.stringify(data));
		var e = getDownload(data);
		setStyle(e, "danger");
	});

	socket.on("download progress", function(data) {
		console.log("Progress: " + JSON.stringify(data));
		getProgressBar(getDownload(data.name)).css("width", String(data.progress) + "%");
	});

	socket.on("download aborted", function(data) {
		console.log("Aborted: " + JSON.stringify(data));
		var e = getDownload(data);
		setStyle(e, "warning");
		disableRemoveButton(e)
	});

	$("#submit").on("click", function() {
		socket.emit("download", {
			"title": $name.val(),
			"url": $url.val()
		});
		$name.val("");
		$url.val("");
		$("#downloadModal").modal("hide");
	});

	$("#downloadModal").modal({
		"keyboard": true,
		"show": false
	});

	$("#openDownloadModal").on("click", function() {
		$("#downloadModal").modal("show");
	});
});