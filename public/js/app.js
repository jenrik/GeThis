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

	socket.on("in progress", function(data) {
		console.log("in progress: ", data);
		downloads[data.name] = data;
	});

	socket.on("download finished", function(data) {
		downloads[data].status = "finished";
	});

	socket.on("download failed", function(data) {
		downloads[data].status = "failed";
	});

	socket.on("download aborted", function(data) {
		downloads[data].status = "aborted";
	});

	socket.on("remove", function(data) {
		delete downloads[data];
	});

	socket.on("download progress", function(data) {
		console.log("Progress: " + JSON.stringify(data));
		downloads[data.name].progress = data.progress;
	});
});

app.controller("DownloadButtonController", function(socket) {
	this.click = function(download) {
		if (download.finished) {
			socket.emit("download remove", download.name);
		} else if(!download.abort) {
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

app.controller("DownloadModalController", function($scope, $modal, socket) {
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

	this.download = function(modal) {
		$modalInstance.close({
			"title": modal.filename,
			"url": modal.url
		});
	};

	this.cancel = function() {
		$modalInstance.dismiss();
	};

	this.checkExists = function(modal) {
		socket.emit("exists", modal.filename);
	};

	socket.on("exists", function(data) {
		controller.exists.exists = data.exists
		controller.exists.filename = data.name;
	});
});