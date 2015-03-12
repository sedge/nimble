/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, appshell, $ */
define(function (require, exports, module) {
    "use strict";

    var Content = require("nohost/src/content");
    var Log = require("nohost/src/log");
    var Rewriter = require("nohost/src/rewriter");

    function handle404(url, callback) {
        var html = '<!DOCTYPE html>' +
                   '<html><head>' +
                   '<title>404 Not Found</title>' +
                   '</head><body>' +
                   '<h1>Not Found</h1>' +
                   '<p>The requested URL ' + url + ' was not found on this server.</p>' +
                   '<hr>' +
                   '<address>nohost/0.0.1 (Web) Server</address>' +
                   '</body></html>';
        callback(null, Content.toURL(html, 'text/html'));
    }

    function handleHTML(path, fs, callback) {
        fs.readFile(fs, path, 'utf8', function(err, html) {
            if(err) {
                Log.error('unable to read `' + path + '`');
                return handle404(path, callback);
            }

            Rewriter.rewriteHTML(html, path, fs, function(err, html) {
                if(err) {
                    Log.error('unable to read `' + path + '`');
                    // TODO: best way to deal with error here? 500?
                    return handle404(path, callback);
                }

                callback(null, html);
            });
        });
    }

    /**
     * Send the raw file, making it somewhat more readable
     */
    function handleFile(path, fs, callback) {
        fs.readFile(path, 'utf8', function(err, data) {
            if(err) {
                Log.error('unable to read `' + path + '`');
                return handle404(path, callback);
            }

            // Escape the file a bit for inclusion in <pre>...</pre>
            data = data.replace(/</gm, '&lt;')
                       .replace(/>/gm, '&gt;')
                       .replace(/&/gm, '&amp;');

            var syntheticDoc = '<!DOCTYPE html>' +
                               '<html><head></head>' +
                               '<body><pre>' + data + '</pre></body></html>';

            callback(null, Content.toURL(syntheticDoc, 'text/html'));
        });
    }

    exports.handle404 = handle404;
    exports.handleHTML = handleHTML;
    exports.handleFile = handleFile;
});
