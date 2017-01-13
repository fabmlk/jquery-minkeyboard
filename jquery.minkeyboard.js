/**
 * Custom jQuery UI Widget to provide for a customable keyboard.
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
        require("jquery-ui/position");
		require("jquery-ui/widget");
        require('string.fromcodepoint'); // polyfill for IE (installed as dependency in package.json)
        require('unorm'); // polyfill for ES6 normalize() + can be used standalone
		module.exports = factory(require("jquery"));
	} else {
		// Browser globals
		factory( jQuery );
	}
}(function( $ ) {
    var backspaceIcon = '<svg fill="#000000" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M0 0h24v24H0z" fill="none"/>' +
        '<path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"/>' +
        '</svg>';

    var checkIcon = '<svg fill="#000000" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M0 0h24v24H0z" fill="none"/>' +
                    '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' +
                    '</svg>';
    
    // tout attribut commencant par '_' est automatiquement ignoree et non accessible via $.widget('minkeyboard', 'mymethode')
    // (mais toujours evocable directement via trick data() ou instance(): voir ci-dessous)
    // toutes les methodes heritees ici viennent en fait d'un base prototype $.Widget.prototype.
    // Les default values d'un widget peuvent accédées/modifiées via:
    // - jquery ui doc spécifie: $.ui.somewidgetame.prototype.options
    // - mais on peut acceder au jquery plugin interne directement: $.somenamespace.somewidgetname.prototype.options
    //      Ex: $.fab.minkeyboard.prototype.options
    var minkeyboardOverrides = {
        // on set les default options
        // a la creation, widget framework va copier le widget options attribut dans jquery plugin options instance (qui sera accessible via this directement)
		// Widget factory aussi map default options au prototype du widget, e.g:
		// $.fab.minkeyboard.prototype.options
		// Ainsi, un client peut overrider les default options de tous les widgets via:
		// $.extend($.fab.minkeyboard.prototype.options, {someprop: someval...});
		// Parfois on verra:
		// $.extend($.fab.minkeyboard.options, {...})
		// Ceci est possible si on decide de copier les defaults options dans le widget directement:
		//	$.fab.minkeyboard.options = $.fab.minkeyboard.prototype.options;
        options: {
            appendTo: null, // jquery selector ou montrer le keyboard, null pour montrer pres de l'input
                                            // ne doit pas etre resetter dynamiquement! (ceci est attendu, voir jquery ui dialog widget)
            keypress: null, // callback quand un key du keyboard est pressed
                        // le nom "keypress" est le nom de l'event qu'on va devoir trigger via _trigger('keypress')
                        // en interne jquery va creer un event portant le nom du widget concatene, i.e le user devra listen par:
                        // $(el).on('minkeyboardkeypress',...)
                        // "All widgets have a create event which is triggered upon instantiation"
                        // passe en param object avec property patternMismatch indiquant si il y a patternmismatch 
            openevent: "focus", // event à écouter pour l'ouverture du keyboard
            // built-in options pour animation quand on show/hide le widget
            show: false, // true for classic fadeIn
            hide: false, // true classic fadeOut
            position: { // inspire du tooltip widget
                my: "center top", // positionnement de mon objet (keyboard)
                at: "center bottom", // positionnement du target (input)
                collision: "flipfit"
            },
            pattern: "", // setting manuel du pattern est possible aussi
            keys: "AZERTYUIOP789QSDFGHJKLM456WXCVBN @.'_-&+()Ç\"1230́̀̂̈".split(""), // setting manuel des keys sont possibles sous forme d'array: override pattern si les 2 sont spécifiés à la construction
            validate: null, // callback quand le user click sur valider/enter bouton. Le user peut preventDefault pour empêcher le default action
                        // de passer au prochain input associé au widget
                        // passe en param object properties:
                        //  - index: la position du current input parmis tous ceux associés au widget
                        //  - targets: jQuery Collection des inputs associés au widget
                        
            change: null, // callback event quand l'input change (utile car jquery on change listener ne marche pas pour programmatic update!
                        // passe en param object properties:
                        // - old: ancienne valeur de l'input
                        // - new: nouvelle valeur de l'input
                        // Note: un champs text trigger en fait l'event "input" a chaque changement, et ne trigger "change" que lorsque le champs perd le focus.
                        // Comme en pratique on va jongler entre focus et blur à chaque instant, on peut considérer que trigger "change" a chaque update
                        // et le correct event à trigger. A cause de ça, "input" n'est pas considéré.
            open: null, // callback events quand le keyboard est open/close
            close: null,
            layout: {       
                mainpad: [['&', '"', "'", '(', '-', '_', 'Ç', '@', ')', '+'],
                          ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                          ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
                          ['W', 'X', 'C', 'V', 'B', 'N', '.', ' ']],
                      
                // http://www.decodeunicode.org/en/combining_diacritical_marks
                // https://fr.wikipedia.org/wiki/Normalisation_Unicode
                // http://unicode-table.com/en/#
                combiningpad: [["́"],
                               ["̀"],
                               ["̂"],
                               ["̈"]], // accents: acute, grave, circumflex, diaeresis

                numpad: [['7', '8', '9'],
                         ['4', '5', '6'],
                         ['1', '2', '3'],
                         ['0']],
                     
                controlpad: [["\x08", "\x0A"]]
            }

            /* heritees/fournies par le widget factory
            disabled: true/false aussi mappe a built-in functions "disable"/"enable"
                             quand disabled true, la classe namespace-plugin-disabled + ui-state-disabled + aria-disabled est ajoute sur le main element (this.element)
            create: event triggered automatiquement pour tout widget apres l'appel a _create(), tout client peut donc ajouter une action a la creation via:
            $('input').somewidget({create: function(event, ui) { some action }});
       */
        },

        /* herites/fournies par widget factory
        widget: method qui retourne le main element du widget par defaut (this.element). Utilisable par:
        $('selector').somewidget('widget'); // retourne this.element
   On peut l'override pour retourner autre chose, par ex dialog widget retourne le <div> wrapper
        enable/disable: voir option "disabled"

        Metadata plugin: plus inclus depuis 1.10, il permettait de specifier les options du widget directement dans le html:
        <input type="text" class="{someoption: {someprop: somevalue}}">
        On peut le reactiver en reinstallant le plugin et utiliser:
         // si metadata plugin est supporte, _getCreateOptions() est present donc version < 1.10
                if ($.Widget.prototype._getCreateOptions === $.noop) {
                        $.extend(minkeyboardOverrides, {
                                _getCreateOptions: function() {
                                        return $.metadata && $.metadata.get(this.element[0])[this.widgetName];
                                }
                        });
                }
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
            
            // we don't want to trigger hiding triggered from click to document
            // click sur keys bubble up sur keyboard: on cancel
            this._on(this.keyboard, {
                mousedown: function (event) {
                    event.stopPropagation();
                },
                touchstart: function (event) {
                    event.stopPropagation();
                }
            });
        },

        // close est triggered aussi quand on click sur le document pour cacher le current minkeyboard
        // cet event est fired autant de fois qu'il y a de minkeyboard widgets
        // Si on focus un input avec widget, open sera called, mais on fait attention a ce qu'il ne soit pas closed juste apres!
        // Prend aussi en compte la navigation via pression sur Tab (on peut utiliser directement $.ui.keyCode fournit par jquery-ui/core)
        close: function (event) {
            if (!this.keyboard.is(":visible")) {
                return;
            }
            if (!event
                || (event.target !== this.element[0] // click sur l'input déjà actif
                    // pour mousedown event uniquement
                    // on veut utiliser closest pour trouver si le target ou un de ses parents est une key
                    // (par ex click sur span icone contenue dans une span key)
                    && !$(event.target).closest("." + this.widgetFullName + "-key").length)
                || (event.keyCode || event.which) === $.ui.keyCode.TAB ) {
                this._hide(this.keyboard, this.options.hide);
                this._trigger("close", event);
            }
        },

        // open est triggered aussi quand on click sur un element avec minkeyboard widget
        open: function (event) {
            if (this.keyboard.is(":visible")) {
                return;
            }
            // WARNING: element doit etre visible avant d'etre positionne!
            // (https://forum.jquery.com/topic/position-keeps-adding-original-left-and-top-to-current-values-in-ie-8)
            this._show(this.keyboard, this.options.show);
            if (!this.options.appendTo) { // par defaut, positionne pres de l'input
                this.keyboard.position($.extend({
                        of: (event && event.target) || this.element
                }, this.options.position));
            }
            this._trigger("open", event);
        },

        // print character at cursor current position (replace text if selected)
        // trigger change event if value changed
        _minkeyPrint: function (targets, keyChar, isFull) {
            var selStart = this.element[0].selectionStart;
            var selEnd = this.element[0].selectionEnd;
            var value = this.element[0].value;

            if (selEnd === selStart && isFull) { // nothing selected and full
                return;
            }
            this.element[0].value = value.slice(0, selStart) + keyChar + value.slice(selEnd);
            this.element[0].selectionStart = this.element[0].selectionEnd = selStart + keyChar.length; // set cursor after current position

            // redonne le focus au input
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
        
        // keyChar must be a combining mark which can "merge" with a character to obtain normalized unicode character
        // Ex: A majsucule accent grave = U+0041 U+0300 <=> À
        // Update: normalize accent char using NFC.
        // How to use accents from a pattern:
        //  1/ enumerate the accents in the pattern within square brackets, along with other chars or ranges (accents are spaced-out for better readability in the example):
        //       [ ́  ̀ ̂  ̈  A-Z]
        //     The keyboard will pick-up the individual accents
        //  2/ as combined accents are normalized into single chars, add the true range of accented letters to pass validation in your input, typically \u00C0-\u017F for french:
        //       [ ́  ̀ ̂  ̈  \u00C0-\u017FA-Z]
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
            this.element[0].selectionStart = this.element[0].selectionEnd = selStart + keyChar.length; // set cursor after current position

            // redonne le focus au input
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

        // delete text selected or character before current selection
        // trigger change event if value changed
        _minkeySuppr: function (targets) {
            var selStart = this.element[0].selectionStart;
            var selEnd = this.element[0].selectionEnd;
            var value = this.element[0].value;
            
            if (selEnd === selStart) { // pas de text selected
                selStart = selStart > 0 ? selStart - 1 : selStart;
            }
            this.element[0].value = value.slice(0, selStart) + value.slice(selEnd);
            this.element[0].selectionStart = this.element[0].selectionEnd = selStart; // set cursor at current position

            // redonne le focus au input
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

        // par défaut, quand on appuie sur valider, on focus le prochain élément ayant minkeyboard widget
		// si le dernier element est atteint, on trigger blur event
        _minkeyValidate: function (targets) {
            // respecte W3C en reprenant certaines instructions appliquées aux tabindex. Ne doivent pas recevoir de focus:
            // - un input element hidden http://www.w3.org/TR/html5/editing.html#attr-tabindex
            // - un disabled element http://www.w3.org/TR/html4/interact/forms.html#tabbing-navigation
            // On pourrait utiliser jquery :visible:enabled selector mais jquery ui core fournit :focusable directement
            // (différent de :tabbable par le fait que tab index < 0 est focusable mais pas tabbable)
            // Note: focusable semble respecter hidden input, pas tabbable! bug ?
            var targetIndex = targets.index(this.element),
                nextTargetIndex = targetIndex + 1;	
            
            if (this._trigger("validate", null, {
                    index: targetIndex,
                    targets: targets
            }) !== false) { // si le user n'a pas preventDefault
                this.close(); // ne pas oublier de fermer le current
                if (nextTargetIndex >= targets.length) {
                    this.element.blur(); // fini!
                } else {
                    targets.eq(nextTargetIndex).trigger(this.options.openevent); // give focus au prochain
                }
            }
        },

        // returns boolean indiquant si event canceled ou non
        _minkeyPress: function (targets, keyName, keyChar) {        
            // _trigger() est fourni par widget factory et permet de trigger un custom event
            // keypress a ete defini en option pour que le user puisse listen via un callback qui sera evoque ici
            // A noter qu'on peu listen sur son propre event aussi, et que si on performe une action, celle-ci sera
            // automatiquement annulee si le user intercepte via preventDefault (ou return false)
            // Dans ce cas _trigger() retourne false pour nous l'indiquer si besoin de traiter ce cas etc...
            // Le 2e arg est le jquery event a l'origine. En passant null, on laisse jQuery creer tout seul un custom event object dont le type 'minkeyboard'
            // est le nom du plugin et le name la concatenation 'minkeyboardfull'
            //	Remarque: si le nom du plugin === event name (ex 'drag' plugin pour 'drag' event), le name n'est pas double en 'dragdrag' mais juste 'drag'
            // Le callback recevra 1st arg le triggering event, 2nd arg custom ui object, et this fera référence à this.element
            var canceled = this._trigger("keypress", null, {
                name: keyName,
                char: keyChar,
                targets: targets,
                index: targets.index(this.element)
            });

            return canceled;
        },

        // returns jquery object représentant une key
        // utiliser un wrapper autour des touches permet de laisser le user ajuster plus facilement la proportion des touches
        // relativement aux autres. Ex: sur un numpad, on veut la touche 0 occuper l'espace de 3 touches
        // on veut donc touche 0 = 300% de son parent, qui est défini par le wrapper et changeable par css
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
                     * Si on appui sur un bouton et glisse la souris pour la relâcher ailleurs, les états sont gardés
                     * On préferera utiliser css :active pour ça! */
                }
            });
            return key;
        },
        // _create() est appele quand le widget est initialize sur une element collection, i.e: $('selector').minkeyboard() 
        // Un widget instance est cree et le store dans le data() du current element avec pour key le namespaced nom du plugin:
        // data("fab-minkeyboard", this instance)
        // On y retrouvera notamment:
        // - element: "reference vers le current element", => this.element est déjà set et distinct pour chaque element dans la collection
        // - options: "copy des default options du plugin eventuellement overriden par options specifies par le client" => this.options est deja set
        // })	
        // Ceci est repete et une instance est cree pour chaque element si appele sur une collection
        // ici, on override le default widget _create() method pour custom
        //
        // Trick: un user peut en fait instancier un widget sans utiliser $('selector').minkeyboard({options...}) mais directement en appelant le constructor:
        //		$.fn.minkeyboard({options...}, $('selector'))
        //	
        // Remarque: depuis jquery ui 1.11 la built-in method "instance" permet de retrouver notre instance sans passer par data():
        //	$('selector').data("fab-minkeyboard").close() <=> $('selector').minkeyboard("instance").close()
        //	A noter: dans ces 2 cas, undefined est retourne, alors que si methode appelee normalement via .minkeyboard("close"),		//	un jQuery object est retourne pour chaining (pour cela on doit retourner undefined dans notre methode)!
        _create: function () {
            this._createKeyboard();

            // on ajoute au current element la classe "minkeyboard" (this.widgetFullName depuis jquery ui 1.9, avant on utilisant this.widgetBaseClass)
            //this.element.addClass(this.widgetFullName || this.widgetBaseClass);
            this.element.addClass(this.widgetFullName + '-target');

            // si l'element n'as pas de pattern, on lui autorise tout le keypad
            this.options.pattern = this.options.pattern || this.element.attr("pattern") || null; //'[' + this.options.keys.join("") + ']';//.replace(/([[\]-])/g, "\\$1") + ']';
            if (this.options.pattern) {
                this._buildKeyboardFromPattern(this.options.pattern);
            } else {
                this._buildKeyboardFromKeyChars(this.options.keys);
            }

            // _on() garde le contexte this sur notre widget intance
            // + events sont automatiquement namespaced
            // + autre avantage sur on(): permet au widget factory de detruire automatiquement nos events handlers on destroy
            var eventHandler = {};
            eventHandler[this.options.openevent] = "open"; // accepte string (ancienne version) ou handler function ("open" <=> this.open)

            this._on(this.element, eventHandler);
            // quand on click n'importe où on fermera le widget, plus exactement, on cherchera à écouter mousedown
            // car par ex si le user select un text en dehors de l'input, click n'a pas lieu alors qu'on voudra fermer le widget!
            // Remarque: cet event est attache une fois par element present dans la jquery collection
            // On se retrouve donc avec plusieurs handlers qui seront executes en sequence a chaque fois qu'on click qqpart:
            // => c'est volontaire, car on s'en sert pour fermer automatiquement le widget en cours ouvert, sans avoir besoin
            // de tester quel widget est ouvert pour quel element
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

            // version 0.1.1: on garde iterativement via exec() tout ce qui se trouve entre crochets
            // pour ajouter/exclure les éléments présents dans keys
            while (match = parser.exec(pattern)) {
                regex = new RegExp(match[0], 'g');
                keyChars += this.options.keys.join("").match(regex).join("");
            }

            this._buildKeyboardFromKeyChars(keyChars);
        },
        

		/* param keyChars can be string of single-characters or array */
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

        // _destroy() est appele automatiquement quand destroy() est appele explicitement (aka par le user via .minkeyboard("destroy"))
        // Ce code s'execute apres le built-in destroy()
        // ou automatiquement quand le user remove() le DOM element ayant le widget en instance!
        // Dans _destroy() on n'a pas besoin d'executer ce que fait deja le base destroy(), i.e:
        //	- il supprime deja le widget instance du DOM element
        //	- unbind all events dans le widget namespace (aka custom event comme minkeyboardfull)
        //	- unbind all events ajoutes par _bind() ou _on()

        _destroy: function () {
            this.element.removeClass(this.widgetFullName + '-target');
            this.keyboard.remove();
        },

        // Appelé par _setOptions() automatiquement pour chaque option settée
        // On peut setter une option directement sans passer par this.options en appelant directement built-in option()
        // (fonctionne comme attr() ou css() pour getter/setter)
        // si on a besoin de comparer la value courante de l'option on peut utiliser this.options[key]
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

    // Ceci permet d'initialiser le widget en heritant basic fonctionalite,
    // Ici, jQuery ui va creer un jquery plugin comportant le nom passe en 1er param (doit comporter un namespace) i.e: $.fn.minkeyboard (sans tenir compte du namespace) (note:en interne $.widget.bridge est utilise).
    // Un jquery plugin sera initialise et le context (this) fera reference a ce plugin, ce qui est different d'un jquery plugin
    // traditionnel ou le contexte est un DOM element.
    // Il construit notre constructor et assigne minkeyboardOverrides au prototype de toutes les instances du widget
    //	- constructor: $.fab.minkeyboard()
    //	- prototype: $.fab.minkeyboard.prototype (on peut lui ajouter aussi directement des methodes utilisables alors dans toutes les instances)
    // On lui passe en 2nd param notre objet
    // widget() accepte aussi un 3e param pour heriter d'un widget existant en creant un autre widget:
    //		$.widget('fab.minkeyboard', $.ui.dialog, {...})
    // Note: depuis jQuery ui 1.9 on veut redefinir un widget existant sans en creer un nouveau:
    //		$.widget('ui-dialog', $.ui-dialog, {...})
    //
    $.widget('fab.minkeyboard', minkeyboardOverrides);
}));
