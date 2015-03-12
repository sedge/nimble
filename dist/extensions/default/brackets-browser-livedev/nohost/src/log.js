/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, appshell, $ */
define(function (require, exports, module) {
    "use strict";

    exports.error = function(msg) {
        console.error('[nohost error]: ' + msg);
    };
    exports.info = function(msg) {
        console.info('[nohost]: ' + msg);
    };

});
