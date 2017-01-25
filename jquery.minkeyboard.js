/**
 * Custom jQuery UI Widget to provide for a customizable keyboard.
 * The documentation is contained in comments.
 * Additional "INFO" comments takes the form of jquery ui tutorial and remarks.
 * @author Lanoux Fabien
 */
(function( factory ) {
	if ( typeof define === "function" && define.amd ) {
		// AMD. Register as an anonymous module.
		define([
			"jquery",
			"jquery-ui/core",
			"jquery-ui/position",
			"jquery-ui/widget",
            "string.fromcodepoint",
            "unorm"
		], factory );
	} else if(typeof module === 'object' && module.exports) {
		// Node/CommonJS
		require("jquery-ui/core"); // utilisé pour keyCode TAB et :tabbable selector
        require("jquery-ui/position"); // smart keyboard positioning next to the input field in floated mode
		require("jquery-ui/widget"); // required for jquery ui widget
        require('string.fromcodepoint'); // polyfill for IE (installed as dependency in package.json)
        require('unorm'); // polyfill for ES6 normalize() + can be used standalone
		module.exports = factory(require("jquery"));
	} else {
		// Browser globals
		factory( jQuery );
	}
}(function( $ ) {
    // inline svg icon for the backspace key
    var backspaceIcon = '<svg fill="#000000" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M0 0h24v24H0z" fill="none"/>' +
        '<path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"/>' +
        '</svg>';

    // inline svg icon for the check key
    var checkIcon = '<svg fill="#000000" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M0 0h24v24H0z" fill="none"/>' +
                    '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' +
                    '</svg>';

    // plain object to use as the prototype for the widget (last arg to $.widget())
    // INFO:
    //   Every attribute starting by '_' is automatically ignored and not accessible from $.wiget('minkeyboard', 'mymethod')
    //   (but still callable directly from data() or instance(): ci below)
    //   All methods inherited here actually come from a base prototype $.Widget.prototype.
    //   Default values of a widget can be accessed/modified from:
    //     - jquery ui doc tells: $.ui.somewidgetname.prototype.options
    //     - but we can reach the internal jquery plugin directly with: $.somenamespace.somewidgetname.prototype.options
    //       Ex: $.fab.minkeyboard.prototype.options
    var minkeyboardOverrides = {
        // default options
        // INFO:
        //    At creation, wiget framework will copy the widget option atributes into jquery plugin options instance (accessible via 'this' directly)
        //    Widget factory also map default options to the widget's prototype, e.g:
        //      $.fab.minkeyboard.prototype.options
        //    Thus, a client can override the default options for all widgets with:
        //      $.extend($.fab.minkeyboard.prototype.options, {someprop: someval...});
        //    Sometimes we will see instead:
        //      $.extend($.fab.minkeyboard.options, {...})
        //    => this is possible if we decide to copy the default options into the widget directly:
        //      $.fab.minkeyboard.options = $.fab.minkeyboard.prototype.options;

        options: {
            appendTo: null, // jquery selector targetting where to show the keyboard, null for floated mode (next to the input)
                            // This option should not be reset dynamically ! (this is expected, see jquery ui dialog widget for another example)

            keypress: null, // callback when a keyboard key is pressed.
                            // Callback param: the current patternMismatch state
                            // INFO:
                            //   The name "keypress" is the event name that will be triggered via _trigger('keypress')
                            //   Internally, jquery will create an event with the name of the widget prepended, i.e. the user will listen for
                            //     $(el).on('minkeyboardkeypress',...)
                            //   "All widgets have a create event which is triggered upon instantiation"

            openevent: "focus", // event to listen indicating the keyboard should be opened

            // built-in options for basic animation when the widget is shown/hidden
            show: false, // true for classic fadeIn
            hide: false, // true for classic fadeOut

            position: { // ditto tooltip widget
                my: "center top", // positioning of my widget (keyboard)
                at: "center bottom", // positioning of the target (input)
                collision: "flipfit" // collision
            },

            pattern: "", // pattern to use to build the keyboard. Falls back to target input pattern if this is empty and the input contains a pattern attribute.

            keys: "AZERTYUIOP789QSDFGHJKLM456WXCVBN @.'_-&+()Ç\"/\\1230́̀̂̈".split(""), // array keys that make up the keyboard. If both keys and pattern are set, keys takes precedence at construct.

            validate: null, // callback when user type the "validate" key or press Enter. The user can preventDefault the default action of targetting the next input in the DOM with an instance of this widget.
                            // Callback params:
                            //  - index: index of the current input in the DOM amongst other inputs containing instances of the widget ('targets' param below)
                            //  - targets: jQuery Collection of all the inputs associated to the widget
                        
            change: null, // callback event when the input value changes (useful on change listener is not normally triggered from programmatic update!)
                          // Callback params:
                          // - old: old input value
                          // - new: new input value
                          // Note 'change' event: a native text field trigger an "input" event on every change but triggers a "change" event only when the field loses focus.
                          // In practice, we will constantly juggle between focus & blur events, so we can consider that triggering the "change" event on each update is correct.
                          // Because of this, "input" event is not handled by this widget.

            open: null, // callback event when keyboard is opened
            close: null, // callback event when keyboard is closed

            // keyboard layout customization
            layout: {
                // 2D main pad layout
                mainpad: [['&', '"', "'", '(', '-', '_', 'Ç', '@', ')', '+', '/', '\\'],
                          ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                          ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
                          ['W', 'X', 'C', 'V', 'B', 'N', '.', ' ']],

                // 2D combining pad layout (accents)
                // http://www.decodeunicode.org/en/combining_diacritical_marks
                // https://fr.wikipedia.org/wiki/Normalisation_Unicode
                // http://unicode-table.com/en/#
                combiningpad: [["́"],
                               ["̀"],
                               ["̂"],
                               ["̈"]], // accents: acute, grave, circumflex, diaeresis

                // 2D numeric pad layout
                numpad: [['7', '8', '9'],
                         ['4', '5', '6'],
                         ['1', '2', '3'],
                         ['0']],

                // 2D control pad layout
                controlpad: [["\x08", "\x0A"]]
            }

            // INFO:
            //   Other options inherited/provided by the widget factory:
            //   - disabled: true/false also maps  built-in functions "disable"/"enable"
            //               When disabled is true, the classes namespace-plugin-disabled + ui-state-disabled + aria-disabled is added to the main element (this.element)
            //   - create: event triggered automatically for every widget after a call to _create(). Every user can then add:
            //             $('input').somewidget({create: function(event, ui) { some action }});
        },

        // INFO:
        //   Other methods inherited/provided by the widget factory
        //   - widget: method returning the main widget element (this.element). Ex:
        //            $('selector').somewidget('widget'); // returns this.element
        //            We can override it to return something else, for example dialog widget returns thie <div> wrapper.
        //   - enable/disable: see "disabled" option

        // Metadata plugin: not included since 1.10, it allowed us to specifiy the widget options directly inside the html:
        //   <input type="text" class="{someoption: {someprop: somevalue}}">
        // It can be reactivated by installing the plugin and use it:
        //
        //  If metadata plugin is supported,  _getCreateOptions() is available since version < 1.10
        //  if ($.Widget.prototype._getCreateOptions === $.noop) {
        //            $.extend(minkeyboardOverrides, {
        //                    _getCreateOptions: function() {
        //                            return $.metadata && $.metadata.get(this.element[0])[this.widgetName];
        //                    }
        //            });
        //    }


        /**
         * Creates an empty shell for the keyboard with useful standard jquery ui classes.
         * @private
         */
        _createKeyboard: function () {
            this.keyboard = $("<div>")
                .addClass(this.widgetFullName + " ui-widget ui-corner-all ui-front")
                .append($("<div class='ui-widget-header'>"))
                .append($("<div class='ui-widget-content'>"))
                .hide()
                .attr({
                     role: "grid"
                })
                .appendTo(this.options.appendTo || this.document[0].body);
        
            if (this.options.appendTo) {
                this.keyboard.addClass("fab-minkeyboard-fixed");
            }
            
            // we don't want to trigger hiding from a click to document
            // clicks on keys bubble up to the keyboard: we cancel
            this._on(this.keyboard, {
                mousedown: function (event) {
                    event.stopPropagation();
                },
                touchstart: function (event) {
                    event.stopPropagation();
                }
            });
        },

        /**
         * Close is triggered also when a click occurs on the document to hide the current minkeyboard.
         * This event is fired as many times as there are minkeyboard instances.
         * If we focus an input with the widget, open will be called, but we take care of not closing it right away!
         * We also take care of the navigation from pressing "Tab" (we can use $.ui.keyCode provided by jquery-ui/core to detect this).
         * @param {Object} event - the event at the origin for this callback.
         */
        close: function (event) {
            if (!this.keyboard.is(":visible")) {
                return;
            }
            if (!event
                || (event.target !== this.element[0] // click on input already active
                    // for mousedown event only
                    // We want to use closest to find if the target or one of its parents are a key
                    // (for example, click on span icone inside a span key)
                    && !$(event.target).closest("." + this.widgetFullName + "-key").length)
                || (event.keyCode || event.which) === $.ui.keyCode.TAB ) {
                this._hide(this.keyboard, this.options.hide);
                this._trigger("close", event);
            }
        },

        /**
         * Open is triggered also when we click an element having the minkeyboard widget
         * @param {Object} event - the event at the origin for this callback.
         */
        open: function (event) {
            if (this.keyboard.is(":visible")) {
                return;
            }
            // WARNING: element must be visible in order to be positioned!
            // (https://forum.jquery.com/topic/position-keeps-adding-original-left-and-top-to-current-values-in-ie-8)
            this._show(this.keyboard, this.options.show);
            if (!this.options.appendTo) { // by default, position next to the input
                this.keyboard.position($.extend({
                        of: (event && event.target) || this.element
                }, this.options.position));
            }
            this._trigger("open", event);
        },

        /**
         * Prints a non-combining key content at current cursor position (replace text if selected).
         * Trigger change event if value changed.
         * @param {jQuery collection} targets - collection of all the focusable inputs having a widget instance
         * @param {String} keyChar - the key content to print
         * @param {bool) isFull - wether or not the input is full
         * @private
         */
        _minkeyPrint: function (targets, keyChar, isFull) {
            var selStart = this.element[0].selectionStart;
            var selEnd = this.element[0].selectionEnd;
            var value = this.element[0].value;

            if (selEnd === selStart && isFull) { // nothing selected and full
                return;
            }
            this.element[0].value = value.slice(0, selStart) + keyChar + value.slice(selEnd);
            this.element[0].selectionStart = this.element[0].selectionEnd = selStart + keyChar.length; // set cursor after current position

            // gives the focus back to the input
            this.element.trigger(this.options.openevent);
            
            if (value !== this.element[0].value) {
                this._trigger("change", null, {
                    old: value,
                    new: this.element[0].value,
                    targets: targets,
                    index: targets.index(this.element)
                });
            }
        },

        /**
         * Prints a combining key content at current cursor position (replace text if selected).
         * @param {jQuery collection} targets - collection of all the focusable inputs having a widget instance
         * @param {String} keyChar - must be a combining mark which can "merge" with a character to obtain normalized unicode character.
         *        Ex: A uppercase grave accent = U+0041 U+0300 <=> À
         *        Update: normalize accent char using NFC.
         *        How to use accents from a pattern:
         *          1/ enumerate the accents in the pattern within square brackets, along with other chars or ranges (accents are spaced-out for better readability in the example):
         *            [ ́  ̀ ̂  ̈  A-Z]
         *            The keyboard will pick-up the individual accents
         *          2/ as combined accents are normalized into single chars, add the true range of accented letters to pass validation in your input, typically \u00C0-\u017F for french:
         *            [ ́  ̀ ̂  ̈  \u00C0-\u017FA-Z]
         * @private
         */
        _minkeyCombine: function (targets, keyChar) {
            var selStart = this.element[0].selectionStart;
            var selEnd = this.element[0].selectionEnd;
            var value = this.element[0].value;

            if (selStart === 0 || selStart !== selEnd) { // if selection or empty, do nothing
                return;
            }
            
            var charBeforeCursor = value.substr(selStart - 1, 1); // get last char
            var newChar = String.fromCodePoint(charBeforeCursor.charCodeAt(0), keyChar.charCodeAt(0)); // calculate new char
            newChar = newChar.normalize('NFC'); // normalize() here is either native or unorm's polyfill
            
            this.element[0].value = value.slice(0, selStart - 1) + newChar + value.slice(selStart); // replace last char with new char
            if (newChar.length > 1) { // if we replaced the char with another 1-length char, nothing to advance
                this.element[0].selectionStart = this.element[0].selectionEnd = selStart + newChar.length; // set cursor after current position
            }

            // gives the focus back to the input
            this.element.trigger(this.options.openevent);
            
            if (value !== this.element[0].value) {
                this._trigger("change", null, {
                    old: value,
                    new: this.element[0].value,
                    targets: targets,
                    index: targets.index(this.element)
                });
            }
        },

        /**
         * Deletes selected text or character before current selection.
         * Triggers change event if value changed.
         * @param {jQuery collection} targets - collection of all the focusable inputs having a widget instance
         * @private
         */
        _minkeySuppr: function (targets) {
            var selStart = this.element[0].selectionStart;
            var selEnd = this.element[0].selectionEnd;
            var value = this.element[0].value;
            
            if (selEnd === selStart) { // no text selected
                selStart = selStart > 0 ? selStart - 1 : selStart;
            }
            this.element[0].value = value.slice(0, selStart) + value.slice(selEnd);
            this.element[0].selectionStart = this.element[0].selectionEnd = selStart; // set cursor at current position

            // gives the focus back to the input
            this.element.trigger(this.options.openevent);
            
            if (value !== this.element[0].value) {
                this._trigger("change", null, {
                    old: value,
                    new: this.element[0].value,
                    targets: targets,
                    index: targets.index(this.element)
                });
            }
        },

        /**
         * By default, when the "validate" key is pressed, we gives the focus to the next input with a widget instance.
         * If the last input is reached, we trigger the blur event.
         *  Respects W3C by applying some instructions related to tabindex. Should not receive focus:
         *  - hidden input element http://www.w3.org/TR/html5/editing.html#attr-tabindex
         *  - disabled element http://www.w3.org/TR/html4/interact/forms.html#tabbing-navigation
         *  We could use jquery :visible:enabled selector but jquery ui core provides already the custom :focusable
         * (different from :tabbable through the fact that tab index < 0 is focusable but not tabbable)
         * Note: focusable seems to respect hidden input rule, but not tabbable! bug ?
         * @param {jQuery collection} targets - collection of all the focusable inputs having a widget instance
         * @private
         */
        _minkeyValidate: function (targets) {
            var targetIndex = targets.index(this.element),
                nextTargetIndex = targetIndex + 1;	
            
            if (this._trigger("validate", null, {
                    index: targetIndex,
                    targets: targets
            }) !== false) { // if use did not preventDefault
                this.close(); // do not forget to close the current
                if (nextTargetIndex >= targets.length) {
                    this.element.blur(); // done!
                } else {
                    targets.eq(nextTargetIndex).trigger(this.options.openevent); // give focus to next input
                }
            }
        },

        /**
         * When a key is pressed, we detect early if the event was canceled or not by the user.
         * @param {jQuery collection} targets - collection of all the focusable inputs having a widget instance
         * @param keyName - the name of key pressed
         * @param keyChar - the key content.
         * @returns {bool} wether the key press was canceled or not
         * @private
         */
        _minkeyPress: function (targets, keyName, keyChar) {
            // INFO:
            //    _trigger() is provided by widget factory and allows to trigger a custom event.
            //    keypress was defined as option for the user to listen via callback called here.
            //    Note that we can listen our event too, and that if we perform some action, it will be automatically
            //    canceled if the user intercepts via preventDefault (or returns false).
            //    In that case, _trigger() returns false to tell us if needed to handle the case etc...
            //    The 2nd arg is the original jquery event. By passing null, we let jQuery create a custom event object whose type 'minkeyboard'
            //    is the plugin name prepended with the event name, ex 'minkeyboardfull'.
            //    Note: if the plugin name === event name (ex 'drag' plugin for 'drag' event), the name is doubled up as 'dragdrag' but reduced to 'drag'.
            //    The callback will receive as 1st arg the triggereing event, 2nd arg the custom ui object, and 'this' will be a reference to this.element.
            var canceled = this._trigger("keypress", null, {
                name: keyName,
                char: keyChar,
                targets: targets,
                index: targets.index(this.element)
            });

            return canceled;
        },

        /**
         * Creates a DOM representation of a key.
         * We use a wrapper for the key as it allows the user to more easily adjust the proportion of individual keys from css.
         * Ex: for a numpad, the key '0' takes up the space of 3 keys, thus we want key 0 = 300% of its parent, which is defined by
         * the wrapper and can be modified from css.
         * @param {String} keyChar - the key content
         * @returns {jQuery object} the DOM representation of the key
         * @private
         */
        _createKey: function (keyChar) {
            var keyName, key,
                keyContent = '<span>' + keyChar + '</span>',
                handler = this._minkeyPrint;

            keyChar = keyChar.toString(); // make sure we are using a string

            switch (keyChar) {
                case "\x0A":
                    keyName = "enter";
                    handler = this._minkeyValidate;
                    keyContent = '<span>' + checkIcon + ' Valider</span>';
                    break;
                case "\x08":
                    keyName = "backspace";
                    handler = this._minkeySuppr;
                    keyContent = '<span>' + backspaceIcon + ' Effacer</span>';
                    break;
                case ("́"):
                    keyName = "acute-accent";
                    handler = this._minkeyCombine;
                    keyContent = "<span>&nbsp;&nbsp;&#x301</span>";
                    break;
                case ("̀"):
                    keyName = "grave-accent";
                    handler = this._minkeyCombine;
                    keyContent = "<span>&nbsp;&nbsp;&#x300</span>";
                    break;
                case ("̂"):
                    keyName = "circumflex-accent";
                    handler = this._minkeyCombine;
                    break;
                case ("̈"):
                    keyName = "diaeresis-accent";
                    handler = this._minkeyCombine;
                    break;
                case " ":
                    keyName = "space";
                    keyContent = '<span>espace</span>';
                    handler = function (targets, keyChar, isFull) {
                        this._minkeyPrint(targets, ' ', isFull);
                    };
                    break;
                case "_":
                    keyName = "underscore";
                    break;
                case "-":
                    keyName = "dash";
                    break;
                case "'":
                    keyName = "quote";
                    break;
                default:
                    keyName = keyChar;
            }

            key = $("<div>")
                .addClass(this.widgetFullName + "-key  ui-state-default ui-corner-all")
                .addClass(this.widgetFullName + "-key-" + keyName)
                .attr({
                     role: "button"
                })
                .html(keyContent);

            this._hoverable(key); // add class ui-state-hover automatiquement on hover

            this._on(key, {
                click: function () {
                    var valLength = this.element.val().length,
                        targets = $("." + this.widgetFullName + "-target:focusable"),
                        max = this.element.attr("maxlength") || valLength + 1;
                
                    if (this._minkeyPress(targets, keyName, keyChar) !== false) {
                        handler.call(this, targets, keyChar, valLength >= max);
                    }
                    /* Note: dealing with ui-state-default/active... is a pain in the ass:
                     * if we press a key but slide away with the mouse before releasing the button, states are kept.
                     * We will prefer using css :active for that ! */
                }
            });
            return key;
        },

        /**
         * Widget factory create function.
         * @private
         */

        // INFO:
        //   _create() is called when the widget is initialized on a element or collection, i.e: $('selector').minkeyboard()
        //   A widget instance is created and stored inside data() of the current element with key = the namespaced plugin name:
        //      data("fab-minkeyboard", this instance)
        //   We will also find there:
        //   - element: "reference to the current element", => this.element is already set and distinct for each element in the collection
        //   - options: "copy of the default plugin options optionnaly overriden by options specified by the user" => this.options is already set
        // })	
        // This is repeated and an instance is created for each element if called on a collection
        //
        // Trick: a user can actually instanciate a widget without using $('selector').minkeyboard({options...}) by directly calling the constructor:
        //		$.fn.minkeyboard({options...}, $('selector'))
        //	
        // Note: since jquery ui 1.11 the built-in method "instance" allows us to retreive an instance without going through a call to data():
        //	$('selector').data("fab-minkeyboard").close() <=> $('selector').minkeyboard("instance").close()
        // In both cases, undefined is returned, whereas if the method is called normally via .minkeyboard("close"), a jQuery object is returned for chaining
        // (we have to return undefined from our method for that)!
        _create: function () {
            this._createKeyboard();

            // we add the class "minkeyboard" to the current element (this.widgetFullName since jquery ui 1.9, before we made use of this.widgetBaseClass)
            // this.element.addClass(this.widgetFullName || this.widgetBaseClass);
            this.element.addClass(this.widgetFullName + '-target');

            // if the element does not contain a pattern attribute, we give it the whole keypad
            this.options.pattern = this.options.pattern || this.element.attr("pattern") || null; //'[' + this.options.keys.join("") + ']';//.replace(/([[\]-])/g, "\\$1") + ']';
            if (this.options.pattern) {
                this._buildKeyboardFromPattern(this.options.pattern);
            } else {
                this._buildKeyboardFromKeyChars(this.options.keys);
            }

            var eventHandler = {};
            eventHandler[this.options.openevent] = "open"; // accepts string (old version) or handler function ("open" <=> this.open)

            // _on() keeps the 'this' context on our widget instance
            // + events are automatically namespaced
            // + another advantage over 'on': the widget factory can destroy automatically our event handlers on destroy
            this._on(this.element, eventHandler);
            // when we click anywhere we'll close the widget, more exactly, we'll seek to listen for mousedown because for example if the user selects a text outside the input,
            // click is never triggered even though we still want to close the widget!
            // Note: this event is attached once per element present in the jquery collection.
            // We thus end up with multiple handlers that will be executed in sequence each time a click occurs somewhere:
            // => this is on purpose, as we use it to automatically close the currently opened widget, without having to keep track of which widget is opened for which element
            this._on(this.document, {
                mousedown: "close",
                touchstart: "close",
                keydown: "close"
            });
        },


        _buildKeyboardFromPattern: function (pattern) {
            var regex,
                parser = /(\[.+?\])/g,
                match = [],
                keyChars = "";

            // version 0.1.1: we only keep what's inside brackets
            // to include/exclude the characters that whould appear as keys
            while (match = parser.exec(pattern)) {
                regex = new RegExp(match[0], 'g');
                keyChars += this.options.keys.join("").match(regex).join("");
            }

            this._buildKeyboardFromKeyChars(keyChars);
        },


        /**
         * Builds the keyboard from either a string (taking all chars as individual keys) or array (taking all string items as key content)
         * @param {String|Array} keyChars
         * @private
         */
        _buildKeyboardFromKeyChars: function (keyChars) {
            var self = this,
                padmap = {};

            if ($.isArray(keyChars)) {
                keyChars = keyChars.concat([].concat.apply([], this.options.layout.controlpad)); // flatten 3D to 2D array
            } else {
                keyChars += [].concat.apply([], this.options.layout.controlpad).join(""); // flatten 3D to 2D array
            }

            $.each(this.options.layout, function (pad, layout) {
                if (!layout) {
                    return;
                }
                $.each(layout, function (idx, keyRow) {
                    // we build an array of dom elements first because jquery supports building collection object from
                    // array of dom elements, but not from array of jquery elements!
                    var domRow = $.map(keyRow, function (keyChar) {
                        if (keyChars.indexOf(keyChar) !== -1) {
                            return self._createKey(keyChar)[0]; // the DOM element
                        }
                    });
                    if (domRow.length > 0) {
                        padmap[pad] = padmap[pad] || $("<div>").addClass(self.widgetFullName + "-pad " + self.widgetFullName + "-" + pad);
                        padmap[pad].append($(domRow).wrapAll("<div class='" + self.widgetFullName + "-row" + "'>").parent()); // wrap*() returns inner element; call parent
                    }
                });
            });

            $.each(padmap, function (pad, content) {
                var destination = (pad === "controlpad" ? self.keyboard.find(".ui-widget-header") : self.keyboard.find(".ui-widget-content"));
                destination.append(content);
            });
        },

        /**
         * Performs some cleanup.
         * @private
         */
        // INFO:
        //   _destroy() is automatically called when destroy() is called explicitly (aka by the user via .minkeyboard("destroy"))
        //   This code executes after the built-in destroy() or automatically when the user remove() the DOM element having a widget instance.
        //   In _destroy() we don't need to execute what is already done by the base destroy(), i.e:
        //   - removes widget instance from the DOM element
        //   - unbinds all events in the widget namespace (aka custom event like minkeyboardfull)
        //   - unbinds all events added from _bind() or _on()
        _destroy: function () {
            this.element.removeClass(this.widgetFullName + '-target');
            this.keyboard.remove();
        },

        /**
         * Handle "pattern", "keys" and "layout" options to build the relevant keyboard.
         * @param {String} key - the option key
         * @param {*} value - the option value
         * @private
         */
        // INFO:
        //   Called by _setOptions() automatically for each option set
        //   We can set an option directly without going through this.options by calling directly the built-in option()
        //   (works like attr() or css() for getter/setter syntax)
        //   If we need to compare the current option value we can use this.options[key]
        _setOption: function (key, value) {
            switch(key) {
                case "pattern":
                    this.keyboard.children().empty();
                    this._super(key, value);
                    this._buildKeyboardFromPattern(value);
                    break;
                case "keys":
                    this.keyboard.children().empty();
                    this._super(key, value);
                    this._buildKeyboardFromKeyChars(value);
                    break;
                case "layout":
                    $.extend(this.options.layout, value);
                    this.keyboard.children().empty();
                    this._buildKeyboardFromKeyChars(this.options.keys);
                    break;
                default:
                    this._super(key, value);
            }
        },
    };

    // INFO:
    //   This allows us to initialize the widget by inheriting basic functionality.
    //   Here, jQuery ui will create a jquery plugin from the name passed as 1st arg (must contain a namespace) i.e: $.fn.minkeyboard (without taking the namespace into account).
    //   (Note: internally, $.widget.bridge is used).
    //   A standard jquery plugin will be initialized and the context (this) will be a reference to this plugin, which is different from a traditionnal jquery plugin where the context is the DOM element.
    //   It builds a constructor and assigns minkeyboardOverrides to the prototype of all widget instances
    //   - constructor: $.fab.minkeyboard()
    //   - prototype: $.fab.minkeyboard.prototype (we can also directly add to it methods that can then be used by all instances)
    //   We pass our object as 2nd arg.
    //   widget() also accepts a 3rd arg to inherit an existing widget by creating another widget:
    //       $.widget('fab.minkeyboard', $.ui.dialog, {...})
    //   Note: since jQuery ui 1.9 we can redefine an existing widget without creating a new one:
    //       $.widget('ui-dialog', $.ui-dialog, {...})
    $.widget('fab.minkeyboard', minkeyboardOverrides);
}));
