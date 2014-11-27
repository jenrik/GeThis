var validation = module.exports = {};

validation.basic = function(foo) {
    return foo !== null && foo !== undefined;
}

validation.basicLossy = function(foo) {
    return foo != null;
}

validation.string = function(s, min, max) {
    if (!validation.basic(s))
        return false;

    if (typeof s !== "string")
        return false;

    if (min !== undefined) {
        if (s.length < min)
            return false;

        if (max !== undefined) {
            if (s.length > max)
                return false;
            else
                return true;
        } else
            return true;
    } else
        return true;
}

var validUrl = require("valid-url");
validation.url = function(url) {
    if(!validation.string(url, 1))
        return false;

    return validUrl.isWebUri(url) === url;
}

validation.filename = function(filename) {
    var match = filename.match("[a-zA-z0-9\\.\\-_]*");

    return match !== null && match[0] === filename;
}
