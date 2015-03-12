/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets: true, $*/

define(function (require, exports, module) {
	"use strict";

	var Menus   = brackets.getModule("command/Menus"),
		Resizer = brackets.getModule("utils/Resizer");

	/**
	 * This function calls all the hide functions and listens
	 * for bramble to be loaded
	 */
	function hide() {
		removeMainToolBar();
		removeLeftSideToolBar();
		removeRightSideToolBar();
		removeTitleBar();
	}

	/**
	 * This function merely removes the left side tool bar
	 */
	function removeLeftSideToolBar() {
		Resizer.hide("#sidebar");
	}

	/**
	 * This function merely removes the title bar
	 * and the header of the first pane
	 */
	function removeTitleBar() {
		$("#titlebar").remove();
		$("#first-pane .pane-header").remove();
		//Alter the height of the affected elements
		$("#editor-holder").css({"height" : "96%"});
		$("#first-pane .pane-content, .cm-s-light-theme").css({"height": "100%"});
	}

	/**
	 * Used to remove the top tool bar
	 */
	function removeMainToolBar() {
		//remove the file menu
		Menus.removeMenu(Menus.AppMenuBar.FILE_MENU);

		//remove the edit menu
		Menus.removeMenu(Menus.AppMenuBar.EDIT_MENU);

		//remove the find menu
		Menus.removeMenu(Menus.AppMenuBar.FIND_MENU);

		//remove the view menu
		Menus.removeMenu(Menus.AppMenuBar.VIEW_MENU);

		//remove the navigate menu
		Menus.removeMenu(Menus.AppMenuBar.NAVIGATE_MENU);

		//remove the help menu
		Menus.removeMenu(Menus.AppMenuBar.HELP_MENU);
	}

	/**
	 * Used to remove the right side tool bar
	 */
	function removeRightSideToolBar() {
		Resizer.makeResizable("#main-toolbar");
		Resizer.hide("#main-toolbar");
		$(".content").css("right","0");
	}

	// Define public API
	exports.hide                   = hide;
	exports.removeLeftSideToolBar  = removeLeftSideToolBar;
	exports.removeMainToolBar      = removeMainToolBar;
	exports.removeRightSideToolBar = removeRightSideToolBar;
});
