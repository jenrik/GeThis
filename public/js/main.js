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

$(document).ready(function() {
	var socket = io();
	var $downloads = $("#downloads");
	var $name = $("#name");
	var $url = $("#url");
	var download = Handlebars.compile($("#template-download").html());

	socket.on("connect", function() {
		console.log("Connected to server");
		$downloads.empty();
	});

	socket.on("in progress", function(data) {
		console.log("In progress: " + JSON.stringify(data));
		if (data.finished) {
			data.panel = "success";
			data.progressbar = "success";
		} else if (data.aborted) {
			data.panel = "warning";
			data.progressbar = "warning";
		} else if (data.failed) {
			data.panel = "danger";
			data.progressbar = "danger";
		} else {
			data.panel = "primary";
			data.progressbar = "info";
		}

		if (data.finished || data.failed || data.aborted) {
			data.remove = "Remove from list";
			data.done = true;
		} else {
			data.remove = "Abort download";
			data.done = false;
		};
		var e = $(download(data));
		getRemoveButton(e).on("click", function() {
			console.log("aborting: " + data.title);
			//change functionality when aborted, failed or successed to removing the item
			var d = getDownload(data.name);
			if (d.attr("data-done") == "true") {
				socket.emit("download remove", data.name);
			} else {
				socket.emit("download abort", data.name);
			};
		});
		$downloads.append(e);
	});

	socket.on("download finished", function(data) {
		console.log("Download finished: " + JSON.stringify(data));
		var e = getDownload(data);
		getRemoveButton(e).attr("title", "Remove form list");
		getProgressBar(e).css("width", "100%");
		setStyle(e, "success");
		e.attr("data-done", true);
	});

	socket.on("download failed", function(data) {
		console.log("Download failed: " + JSON.stringify(data));
		var e = getDownload(data);
		setStyle(e, "danger");
		e.attr("data-done", true);
	});

	socket.on("download progress", function(data) {
		console.log("Progress: " + JSON.stringify(data));
		getProgressBar(getDownload(data.name)).css("width", String(data.progress) + "%");
	});

	socket.on("download aborted", function(data) {
		console.log("Aborted: " + JSON.stringify(data));
		var e = getDownload(data);
		setStyle(e, "warning");
		e.attr("data-done", true);
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

	var urlChangeListener = function() {
		console.log("url change");
		var match = $url.val().match(/[^\/?#]+(?=$|[?#])/);
		if (($name.val() === "" || $name.attr("auto-set") == "true") && match != null) {
			$name.attr("auto-set", true);
			$name.val(match[0]);
		};
	};
	$url.on("keyup", urlChangeListener);
	$url.on("change", urlChangeListener);
	$url.on("input", urlChangeListener);

	var nameChangeListener = function() {
		var match = $url.val().match(/[^\/?#]+(?=$|[?#])/);
		var temp = null;
		if (match != null) temp = match[0];
		if ($name.val() !== "" && temp !== $name.val()) {
			$name.attr("auto-set", false);
		} else {
			$name.attr("auto-set", true);
		}
	};
	$name.on("keyup", nameChangeListener);
	$name.on("change", nameChangeListener);
	$name.on("input", nameChangeListener);
	$url.on("keyup", nameChangeListener);
	$url.on("change", nameChangeListener);
	$url.on("input", nameChangeListener);

	var fileExistsListener = function() {
		socket.emit("exists", $name.val());
	};
	$name.on("keyup", fileExistsListener);
	$name.on("change", fileExistsListener);
	$name.on("input", fileExistsListener);
	$url.on("keyup", fileExistsListener);
	$url.on("change", fileExistsListener);
	$url.on("input", fileExistsListener);

	socket.on("exists", function(data) {
		console.log("exists: " + JSON.stringify(data));
		if ($name.val() == data.name && data.exists) {
			if (!$("#nameExists").length) {
				$name.parent().append('<span class="input-group-addon" id="nameExists">exists</span>');
			} else {
				console.log("nameExists exists");
			};
		} else {
			$("#nameExists").remove();
		}
	});

	socket.on("remove", function(name) {
		getDownload(name).remove();
	});
});