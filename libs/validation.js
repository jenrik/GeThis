var validation = module.exports = {};

validation.basic = function(foo) {
    return foo !== null && foo !== undefined;
}

validation.basicLossy = function(foo) {
    return foo != null;
}

validation.string = function(s, min, max) {
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

var validUrl = require("valid-url")
validation.url = function(url) {
    if(!validation.string(url, 1))
        return false;

    return validUrl.isWebUri(url) === url;
}
