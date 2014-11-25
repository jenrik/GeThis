var app = angular.module("gethis", [
	"btford.socket-io",
	"ui.bootstrap"
]);

app.factory("socket", function(socketFactory) {
	return socketFactory();
});

app.controller("DownloadListController", function(socket) {
	this.downloads = {};
	var downloads = this.downloads;
	var controller = this;
	this.connected = false;

	socket.on("in progress", function(data) {
		console.log("in progress:", data);
		downloads[data.name] = data;
	});

	socket.on("download status", function(data) {
		console.log("download status:", data);
		downloads[data.name].status = data.status;

		if (data.status === "finished") {
			downloads[data.name].progress = 100;
		}
	});

	socket.on("remove", function(data) {
		console.log("remove:", data);
		delete downloads[data];
	});

	socket.on("download progress", function(data) {
		console.log("download progress:" + JSON.stringify(data));
		downloads[data.name].progress = data.progress;
	});

	var disconnectListener = function(err) {
		controller.connected = false;
		controller.downloads = {};
	};

	socket.on("connect_error", disconnectListener);
	socket.on("connect_timeout", disconnectListener);

	socket.on("reconnect", function() {
		controller.connected = true;
	});

	socket.on("connect", function() {
		controller.connected = true;
	});
});

app.controller("DownloadButtonController", function(socket) {
	this.click = function(download) {
		if (download.status != "working") {
			socket.emit("download remove", download.name);
		} else {
			socket.emit("download abort", download.name);
		};
	};
});

app.directive("download", function() {
	return {
		restrict: "E",
		templateUrl: "template/download.html"
	}
});

app.controller("DownloadModalController", function($modal, socket) {
	this.open = function () {
		var modalInstance = $modal.open({
			templateUrl: 'template/downloadModal.html',
			controller: 'DownloadModalInstanceController',
			controllerAs: "modal"
		});

		modalInstance.result.then(function (data) {
			socket.emit("download", data);
		});
	};
});

app.controller("DownloadModalInstanceController", function($modalInstance, socket) {
	this.filename = "";
	this.url = "";
	this.exists = {
		exists: false,
		filename: null
	};
	var controller = this;

	this.download = function() {
		$modalInstance.close({
			"title": controller.filename,
			"url": controller.url
		});
	};

	this.cancel = function() {
		$modalInstance.dismiss();
	};

	this.checkExists = function() {
		socket.emit("exists", controller.filename);
	};

	socket.on("exists", function(data) {
		console.log("exists:", data);
		controller.exists.exists = data.exists
		controller.exists.filename = data.name;
	});

	this.extractFilename = function() {
		var match = controller.url.match(/[^\/?#]+(?=$|[?#])/);
		if (match) {
			controller.filename = match[0];
			controller.checkExists();
		}
	};
});
