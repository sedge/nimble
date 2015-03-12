/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, appshell */
define(function (require, exports, module) {
    "use strict";

    var BaseServer  = brackets.getModule("LiveDevelopment/Servers/BaseServer").BaseServer;

    var Content = require("nohost/src/content");
    var Handlers = require("nohost/src/handlers");
    var Rewriter = require("nohost/src/rewriter");
    var Log = require("nohost/src/log");

    var Filer = appshell.Filer;
    var Path = Filer.Path;

    function NoHostServer(config) {
        config = config || {};
        BaseServer.call(this, config);
    }

    NoHostServer.prototype = Object.create(BaseServer.prototype);
    NoHostServer.prototype.constructor = NoHostServer;

    // TODO: I *think* I want to return these unmodified...
    NoHostServer.prototype.pathToUrl = function(path) {
        return path;
    };
    NoHostServer.prototype.urlToPath = function(url) {
        return url;
    };

    NoHostServer.prototype.start = function() {
        this.fs = Filer.fs();
    };

    NoHostServer.prototype.stop = function() {
        this.fs = null;
    };

    /**
     * When a livedocument is added to the server cache, make sure live
     * instrumentation is enabled
     */
    NoHostServer.prototype.add = function (liveDocument) {
        if (liveDocument.setInstrumentationEnabled) {
            // enable instrumentation
            liveDocument.setInstrumentationEnabled(true);
        }
        BaseServer.prototype.add.call(this, liveDocument);
    };

    /**
     * Serve the contents of a path into the filesystem,
     * invoking the appropriate content handler, and rewriting any resources
     * in the local filesystem to Blob URLs.
     */
    NoHostServer.prototype.servePath = function(path, callback) {
        var fs = this.fs;

        fs.stat(path, function(err, stats) {
            if(err) {
                return callback(err);
            }

            // If this is a dir, error
            if(stats.isDirectory()) {
                return callback(new Error('expected file path'));
            }

            // This is a file, pick the right content handler based on extension
            var ext = Path.extname(path);

            if(Content.isHTML(ext)) {
                Handlers.handleHTML(path, fs, callback);
            } else {
                Handlers.handleFile(path, fs, callback);
            }
        });
    };

    /**
     * Serve an existing HTML fragment/file (i.e., one that has already been read
     * for a given path) from the local filesystem, rewriting any resources
     * in the local filesystem to Blob URLs. The original path of the file is needed
     * in order to locate other resources with paths relative to this file.
     */
    NoHostServer.prototype.serveHTML = function(html, path, callback) {
        var fs = this.fs;

        Rewriter.rewriteHTML(html, path, fs, function(err, rewrittenHTML) {
            if(err) {
                Log.error('unable to rewrite HTML for `' + path + '`');
                // TODO: best way to deal with error here? 500?
                return Handlers.handle404(path, callback);
            }

            callback(null, rewrittenHTML);
        });
    };

    /**
     * If a livedoc exists, serves the instrumented version of the file as as a blob URL.
     * Otherwise, it serves only the file's contents as a blob URL.
     */
    NoHostServer.prototype.maybeServeLiveDoc = function(path, callback) {
        var fs = this.fs;
        var liveDocument = this._liveDocuments[path];

        function toURL(err, html) {
            if (err) {
                callback(err);
                return;
            }

            // Convert rewritten HTML to a Blob URL Object
            var url = Content.toURL(html, 'text/html');
            callback(null, url);
        }

        // If we have a LiveDoc for this path, send instrumented response. Otherwise fallback to static file from fs
        if (liveDocument && liveDocument.getResponseData) {
            Rewriter.rewriteHTML(liveDocument.getResponseData().body, path, fs, toURL);
        } else {
            fs.readFile(path, 'utf8', toURL);
        }
    };

    exports.NoHostServer = NoHostServer;
});
