/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets*/

define(function (require, exports, module) {
    "use strict";

    var CommandManager      = brackets.getModule("command/CommandManager"),
        Menus               = brackets.getModule("command/Menus"),
        AppInit             = brackets.getModule("utils/AppInit"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        BottomDisplay       = require("BottomDisplayPanal"),
        MarkErrors          = require("errorDisplay"),
        parser              = require("parser"),
        results             = [],
        showingErrors       = false,
        lastErrorIndex      = -1,
        BottomDisplayVar;

    ExtensionUtils.loadStyleSheet(module, "main.less");   
    
    function main(){
        var editor = EditorManager.getFocusedEditor();

        if(editor && editor.document.getLanguage()._name === "HTML"){
            var text   = editor.document.getText();
            var result = parser(text);
            
            if(result.length > 0){
                if(lastErrorIndex !== -1 && lastErrorIndex !== (result[3] - 1)){
                    clearAllErrors();
                }
                MarkErrors.showGutter(result[3] - 1);
                MarkErrors.markErrors(result[3] - 1, result[4] - 1, result[1], result[2]);
                lastErrorIndex = (result[3] - 1);
                results.push(result);
            }else{
                clearAllErrors();
            }
            BottomDisplayVar.update(text);
        }
    }

    //Function that clears all errors
    var clearAllErrors = function(){
        MarkErrors.clearErrors();
        MarkErrors.removeGutter();
        MarkErrors.removeWidget();
        results = [];
        lastErrorIndex = -1;
    };

    var toggleErrors = function(editor, line){
        if(results.length > 0 && !showingErrors && line === results[0][3] - 1){
            results.forEach(function (result) {
                MarkErrors.showWidget(result[0], result[3] - 1);
                showingErrors = true;     
            });
        }else if(results.length > 0 && showingErrors && line === results[0][3] - 1){
            MarkErrors.removeWidget();
            showingErrors = false;
        }else{
            main();
        }
    };

    //Document changed event handler
    var documentChanged = function (editor, object) {
        if(editor){
            main();
        }
    };

    //Switching editors
    var activeEditorChangeHandler = function ($event, focusedEditor, lostEditor) {
        if (lostEditor) {
            lostEditor._codeMirror.off("gutterClick", toggleErrors);
            lostEditor._codeMirror.off("change", documentChanged);
        }

        if (focusedEditor) {
            focusedEditor._codeMirror.on("gutterClick", toggleErrors);
            focusedEditor._codeMirror.on("change", documentChanged);           
        }

    };
    
    //Function that shows panel
    function showpan() {
        BottomDisplayVar.panelRender(true);
    }
    // First, register a command - a UI-less object associating an id to a handler
    var MY_COMMAND_ID = "Show_Slowparse_Panel"; // package-style naming to avoid collisions
    CommandManager.register("Show Parsed HTML Panel", MY_COMMAND_ID, showpan);

    // Then create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    var menu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
    menu.addMenuItem(MY_COMMAND_ID,  "Ctrl-Alt-U");
    
    AppInit.appReady(function(){
        BottomDisplayVar = new BottomDisplay();
        EditorManager.on("activeEditorChange", activeEditorChangeHandler);
    });
});

