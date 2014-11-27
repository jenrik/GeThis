var express = require("express");
var bodyParser = require("body-parser");

module.exports = function(state) {
    var logger = state.logger;
    var router = express.Router();
    state.app.use("/api", router);

    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(bodyParser.json());

    router.get("/list", function(req, resp) {
        var list = {};

        for (var key in state.downloads) {
            var d = state.downloads[key];
            if (req.query.status === d.status || req.query.status === undefined) {
                list[key] = {
                    "id": d.id,
                    "filename": d.filename,
                    "status": d.status,
                    "progress": d.progress
                };
            }
        }

        resp.send(list);
        resp.end();
    });

    router.post("/download", function(req, resp) {
        state.funcs.download(
            (req.body.filename === undefined) ? state.funcs.getAFilename(req.body.url) : req.body.filename,
            req.body.url,
            {
                "protocol": "http",
                "ip": req.connection.remoteAddress,
                "callback": function(success, data) {
                    resp.status(success ? 200: 400).send(data);
                }
            });
    });

    router.post("/abort", function(req, resp) {
        state.funcs.abort(req.body.id, {
            "protocol": "http",
            "ip": req.connection.remoteAddress,
            "callback": function(success, data) {
                resp.status(success ? 200: 400).send(data);
            }
        });
    });

    router.post("/remove", function(req, resp) {
        state.funcs.remove(req.body.id, {
            "protocol": "http",
            "ip": req.connection.remoteAddress,
            "callback": function(success, data) {
                resp.status(success ? 200: 400).send(data);
            }
        });
    });
}
