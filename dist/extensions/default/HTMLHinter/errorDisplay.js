/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, document, Mustache*/

define(function (require, exports, module) {
	"use strict";
	
	var EditorManager  = brackets.getModule("editor/EditorManager"),
		ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
		lineWidgetHTML = require("text!inlineWidget.html"),
		widgetsErrors  = [],
		gutters        = [];

	ExtensionUtils.loadStyleSheet(module, "main.less");
	require("tooltipsy.source");
	
	//Function that highlights the line(s) with errors
	function markErrors(lineStart, lineEnd, charStart, charEnd) {
		var editor   = EditorManager.getFocusedEditor();
		var allMarks = editor._codeMirror.getAllMarks();

		if(!allMarks.length) {
			editor._codeMirror.markText({line: lineStart, ch: charStart},
				{line: lineEnd, ch: charEnd},
				{className: "errorHighlight"});
		}
	}
	
	//Function that clears all the highlighted lines
	function clearErrors(){
		var editor   = EditorManager.getFocusedEditor();
		var allMarks = editor._codeMirror.getAllMarks();

		if(allMarks.length > 0){
			allMarks.forEach(function(element){
				element.clear();
			});
		}
	}
	
	//Function that creates a widget under the line where the error
	//is located and displays the error message.
	function showWidget(errorText, lineStart){
		var editor    = EditorManager.getActiveEditor();
		var lineStats = editor._codeMirror.lineInfo(lineStart);

		if(!lineStats.widgets && widgetsErrors.length === 0){
            var htmlNode = document.createElement("div");
            htmlNode.className = "errorPanel";
            var text = Mustache.render(lineWidgetHTML, { "error": errorText });
            htmlNode.innerHTML = text;

        
			var errrorWidget = editor._codeMirror.addLineWidget(lineStart, htmlNode,
				{coverGutter: false, noHScroll: false, above: false, showIfHidden: false});
			
			widgetsErrors.push(errrorWidget);
		}
	}

	//Function that removes the line widget (errors)
	function removeWidget(){
		//Remove displayed error messages
		widgetsErrors.forEach(function (lineWidget) {
			if (lineWidget) {
				lineWidget.clear();
			}
		});
		widgetsErrors = [];
	}

	//Function that adds a button on the gutter (on given line nubmer) next to the line numbers
	function showGutter(lineStart){
		if(gutters.length === 0){
			var editor = EditorManager.getFocusedEditor();
			var $errorDiv = $("<div class='error'/>");
			var $errorMarker = $("<span class='errorButton'/>");
			var foundGutters = ["errorButton"];

			$errorDiv.append($errorMarker);
			$errorMarker.addClass("errorText");
			$errorMarker.text("!");

			gutters.push(editor._codeMirror.setGutterMarker(lineStart, "errorButton", $errorDiv[0]));

			editor._codeMirror.setOption("gutters", foundGutters);
			//Show tooltips message
			$(".CodeMirror-linenumbers").tooltipsy({content : "Click button for information"}); 

			$(".CodeMirror-gutter").addClass("gutterCursor");
		}
	}

	//Function that removes gutter button
	function removeGutter(){
		var editor = EditorManager.getFocusedEditor();
		gutters = [];
		editor._codeMirror.clearGutter("errorButton");
		//Destroy tooltips instance
		$(".CodeMirror-linenumbers").data("tooltipsy").destroy();
		//Changes cursor back to default
		$(".CodeMirror-gutter").removeClass("gutterCursor");
	}
	
	exports.markErrors = markErrors;
	exports.clearErrors = clearErrors;
	exports.showWidget = showWidget;
	exports.showGutter = showGutter;
	exports.removeGutter = removeGutter;
	exports.removeWidget = removeWidget;
});