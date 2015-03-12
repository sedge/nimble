/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, browser: true */
/*global define, brackets, appshell */

/**
 * This extension provides in-editor livepreview through an iframe,
 * and leverages the experimental Multi Browser implementation of brackets
 * (see https://github.com/adobe/brackets/tree/master/src/LiveDevelopment/MultiBrowserImpl)
 */
define(function (require, exports, module) {
    "use strict";

    // Load dependencies
    var AppInit              = brackets.getModule("utils/AppInit"),
        CommandManager       = brackets.getModule("command/CommandManager"),
        Commands             = brackets.getModule("command/Commands"),
        EditorManager        = brackets.getModule("editor/EditorManager"),
        LiveDevServerManager = brackets.getModule("LiveDevelopment/LiveDevServerManager"),
        PreferencesManager   = brackets.getModule("preferences/PreferencesManager"),
        ProjectManager       = brackets.getModule("project/ProjectManager"),
        LiveDevelopment      = brackets.getModule("LiveDevelopment/LiveDevMultiBrowser"),
        UrlParams            = brackets.getModule("utils/UrlParams").UrlParams,
        ViewCommand          = brackets.getModule("view/ViewCommandHandlers"),
        // Load nohost dependencies
        Browser              = require("lib/iframe-browser"),
        HideUI               = require("lib/hideUI"),
        Launcher             = require("lib/launcher").Launcher,
        NoHostServer         = require("nohost/src/NoHostServer").NoHostServer,
        ExtensionUtils       = brackets.getModule("utils/ExtensionUtils"),
        PostMessageTransport = require("lib/PostMessageTransport");

    var _server,
        codeMirror,
        fs           = appshell.Filer.fs(),
        parentWindow = window.parent,
        params       = new UrlParams();

    // Load initial document
    var defaultHTML = require("text!lib/default.html");

    // Force entry to if statments on line 262 of brackets.js to create
    // a new project
    PreferencesManager.setViewState("afterFirstLaunch", false);
    params.remove("skipSampleProjectLoad");

    function _getServer() {
        if (!_server) {
            _server = new NoHostServer({
                pathResolver    : ProjectManager.makeProjectRelativeIfPossible,
                root            : ProjectManager.getProjectRoot()
            });
        }
        return _server;
    }

    function parseData(data, deferred) {
        var dataReceived = data;

        try {
            data = dataReceived || null;
            data = JSON.parse(data);
            data = data || {};
        } catch(err) {
            // Quick fix: Ignore the 'process-tick' message being sent
            if(dataReceived === 'process-tick') {
                return false;
            }

            console.error("Parsing message from thimble failed: ", err);

            if(deferred) {
                deferred.reject();
            }

            return false;
        }

        return data;
    }

    // We wait until the LiveDevelopment module is initialized and the project loaded
    // so we can safely swap our transport and launcher modules for
    // the defaults and start LiveDev.
    function _configureLiveDev() {
        // Turn preview iFrame On
        Browser.init();

        function _configureModules() {
            // Set up our transport and plug it into live-dev
            PostMessageTransport.setIframe(Browser.getBrowserIframe());
            LiveDevelopment.setTransport(PostMessageTransport);

            // Set up our launcher in a similar manner
            // XXXhumph - this depends on setLauncher() from https://github.com/adobe/brackets/pull/10558
            LiveDevelopment.setLauncher(new Launcher({
                browser: Browser,
                server: _getServer()
            }));

            LiveDevelopment.open();
        }
        LiveDevelopment.one("statusChange", _configureModules);
    }
    ProjectManager.one("projectOpen", _configureLiveDev);

    /*
     * This function is attached to the window as an event listener
     * Its purpose is to intercept post messages from bramble proxy in thimble
     * some of these being:
     * undo, redo, size changer, or any other buttons relating to menu or view
     * within event we expect to receive a JSONable object that contains a commandCategory:
     * menuCommand: "Menu Command" relating to menu commands runable, and
     * viewCommand: "View Command" relating to functions in viewcommand
     * also contains a variable of "params" which can be used to send further information needed
     */
    function _buttonListener(event) {
        var msgObj;

        try {
            msgObj = JSON.parse(event.data);
        } catch (e) {
            return;
        }

        if(msgObj.commandCategory === "menuCommand"){
            codeMirror.focus();
            CommandManager.execute(Commands[msgObj.command]);
        }
        else if (msgObj.commandCategory === "viewCommand") {
            ViewCommand[msgObj.command](msgObj.params);
        }
    }

    // We configure Brackets to run the experimental live dev
    // with our nohost server and iframe combination. This has to
    // occur before the project is loaded, triggering the start of
    // the live preview.
    AppInit.extensionsLoaded(function () {
        // Flip livedev.multibrowser to true
        var prefs = PreferencesManager.getExtensionPrefs("livedev");
        prefs.set("multibrowser", true);

        ExtensionUtils.loadStyleSheet(module, "stylesheets/tutorials.css");

        // Register nohost server with highest priority
        LiveDevServerManager.registerServer({ create: _getServer }, 9001);
    });

    AppInit.appReady(function (){
        // When the app is loaded and ready, hide the menus/toolbars
        HideUI.hide();

        parentWindow.postMessage(JSON.stringify({
            type: "bramble:loaded"
        }), "*");

        // Once the app has loaded our file,
        // and we can be confident the editor is open,
        // get a reference to it and attach our "onchange"
        // listener to codemirror
        codeMirror = EditorManager.getActiveEditor()._codeMirror;

        parentWindow.postMessage(JSON.stringify({
            type: "bramble:change",
            sourceCode: codeMirror.getValue(),
            lastLine: codeMirror.lastLine(),
            scrollInfo: codeMirror.getScrollInfo()
        }), "*");

        codeMirror.on("change", function(){
            parentWindow.postMessage(JSON.stringify({
                type: "bramble:change",
                sourceCode: codeMirror.getValue(),
                lastLine: codeMirror.lastLine()
            }), "*");
        });

        codeMirror.on("viewportChange", function() {
            parentWindow.postMessage(JSON.stringify({
                type: "bramble:viewportChange",
                scrollInfo: codeMirror.getScrollInfo()
            }), "*");
        });

        window.addEventListener("message", function(e) {
            var data = parseData(e.data);
            var value;
            var mark;

            if(!data) {
                return;
            }

            if(data.type !== "bramble:edit") {
                return;
            }

            if(!data.fn) {
                console.error("No edit function sent from thimble to call on code mirror");
                return;
            }


            // QuickFix: Hack to create a DOM element as a marker since it cannot
            // be passed in through postMessage as JSON's stringify cannot work for
            // DOM elements (because it has circular references)
            if(data.fn === "setGutterMarker" && data.params[2]) {
                mark = document.createElement(data.params[2].name);
                var attributes = data.params[2].attributes;
                Object.keys(attributes).forEach(function(attrName) {
                    $(mark).attr(attrName, attributes[attrName]);
                });
                mark.innerHTML = data.params[2].innerHTML;
                data.params[2] = mark;
            }

            if(data.fn === "getLineHeight") {
                var codeMirrorLine = document.querySelector(data.params[0]);
                value = parseFloat(window.getComputedStyle(codeMirrorLine).height);
            } else {
                value = codeMirror[data.fn].apply(codeMirror, data.params);
            }

            if(value === undefined || value === null) {
                return;
            }

            parentWindow.postMessage(JSON.stringify({
                type: "bramble:edit",
                fn: data.fn,
                value: typeof value !== "object" ? value : undefined
            }), "*");
        });
    });

    // We listen for a message from Thimble containing
    // the make's initial code.
    // For now, we have a default html make for testing
    // with just Brackets.
    exports.initExtension = function() {
        var deferred = new $.Deferred();

        function _getInitialDocument(e) {
            var data = parseData(e.data, deferred);

            // Remove the listener after we confirm the event is the
            // one we're waiting for
            if (!data || data.type !== "bramble:init") {
                return;
            }

            window.removeEventListener("message", _getInitialDocument);

            window.addEventListener("message", _buttonListener);

            fs.writeFile(
                '/index.html',
                data.source ? data.source : defaultHTML,
                function(err) {
                    if (err) {
                        deferred.reject();
                        return;
                    }

                    deferred.resolve();
                }
            );
        }

        window.addEventListener("message", _getInitialDocument);

        // Signal to thimble that we're waiting for the
        // initial make source code
        window.parent.postMessage(JSON.stringify({
            type: "bramble:init"
        }), "*");

        return deferred.promise();
    };
});
