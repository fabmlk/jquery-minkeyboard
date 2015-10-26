(function( factory ) {
	if ( typeof define === "function" && define.amd ) {
		// AMD. Register as an anonymous module.
		define([
			"jquery",
			"jquery-ui/core",
			"jquery-ui/position",
			"jquery-ui/widget"
		], factory );
	} else if(typeof module === 'object' && module.exports) {
		// Node/CommonJS
		var jq = require("jquery");
		require("jquery-ui/core");
	    require("jquery-ui/position");
		require("jquery-ui/widget");	
		module.exports = factory(jq);
	} else {
		// Browser globals
		factory( jQuery );
	}
}(function( $ ) {
    var _keypad = "1234567890'-AZERTYUIOPQSDFGHJKLMWXCVBN ";

    // tout attribut commencant par '_' est automatiquement ignoree et non accessible via $.widget('minkeyboard', 'mymethode')
    // (mais toujours evocable directement via trick data() ou instance(): voir ci-dessous)
    // toutes les methodes heritees ici viennent en fait d'un base prototype $.Widget.prototype.
    var minkeyboardOverrides = {
        // on set les default options
        // a la creation, widget framework va copier le widget options attribut dans jquery plugin options instance (qui sera accessible via this directement)
        options: {
            appendTo: null, // jquery selector ou montrer le keyboard, null pour montrer pres de l'input
                                            // ne doit pas etre resetter dynamiquement! (ceci est attendu, voir jquery ui dialog widget)
            full: null, // callback quand max ou sinon maxlength est atteint, recoit en param le triggering event et object avec attribut patternMismatch indiquant si le pattern est valid ou non
                                    // le nom "full" est le nom de l'event qu'on va devoir trigger via _trigger('full')
                                    // en interne jquery va creer un event portant le nom du widget concatene, i.e le user devra listen par:
                                    // $(el).on('minkeyboardfull',...)
                                    // "All widgets have a create event which is triggered upon instantiation"

            // built-in options pour animation quand on show/hide le widget
            show: false, // true for classic fadeIn
            hide: false, // true classic fadeOut
            position: { // inspire du tooltip widget
                    my: "left top", // positionnement de mon objet (keyboard)
                    at: "left bottom", // positionnement du target (input)
            },
            pattern: "", // setting manuel du pattern est possible aussi
            keys: null
        },


        _createKeyboard: function () {
           this.keyboard = $("<div>")
               .addClass(this.widgetFullName + " ui-widget ui-widget-content ui-corner-all ui-front")
               .hide()
               .attr({
                       role: "grid"
               })
               .appendTo(this.options.appendTo || this.document[0].body);

           // we don't want to trigger hiding triggered from click to document
           // click sur keys bubble up sur keyboard: on cancel
           this._on(this.keyboard, {
               "click": function (event) {
                       event.stopPropagation();
               }	
           });
       },

           // close est triggered aussi quand on click sur le document pour cacher le current minkeyboard
           // cet event est fired autant de fois qu'il y a de minkeyboard widgets
           // Si on focus un input avec widget, open sera called, mais on fait attention a ce qu'il ne soit pas closed juste apres!
           close: function (event) {
               if (!event || event.target !== this.element[0]) {
                   this._hide(this.keyboard, this.options.hide);
               }
       },

               // open est triggered aussi quand on click sur un element avec minkeyboard widget
       open: function (event) {
           // WARNING: element doit etre visible avant d'etre positionne!
           // (https://forum.jquery.com/topic/position-keeps-adding-original-left-and-top-to-current-values-in-ie-8)
           this._show(this.keyboard, this.options.show);
           if (event && !this.options.appendTo) { // par defaut, positionne pres de l'input
               this.keyboard.position($.extend({
                       of: event.target
               }, this.options.position));
           }
       },
       
       _minkeyPrint: function (keyChar) {
           this.element[0].value += keyChar; // add key char to input field
       },
       
       _minkeySuppr: function () {
           var value = this.element[0].value;
           value = value.substring(0, value.length - 1);
           this.element[0].value = value;
       },
       
       _minkeyValidate: function () {
//           this.element[]
       },

       _minkeyPress: function () {
           var max = this.element.attr("max") || this.element.attr("maxlength") || -1;
           
           if (this.element.val().length === max) {
               // _trigger() est fourni par widget factory et permet de trigger un custom event
               // full a ete defini en option pour que le user puisse listen via un callback qui sera evoque ici
               // A noter qu'on peu listen sur son propre event aussi, et que si on performe une action, celle-ci sera
               // automatiquement annulee si le user intercepte via preventDefault (ou return false)
               // Dans ce cas _trigger() retourne false pour nous l'indiquer si besoin de traiter ce cas etc...
               // Le 2e arg est le jquery event a l'origine. En passant null, on laisse jQuery creer tout seul un custom event object dont le type 'minkeyboard' est le nom du plugin et le name la concatenation 'minkeyboardfull'
               //	Remarque: si le nom du plugin === event name (ex 'drag' plugin pour 'drag' event), le name n'est pas double en 'dragdrag' mais juste 'drag'
               this._trigger("full", null, {
                    patternMismatch: this.element[0].validity.patternMismatch
               });
           }
           // redonne le focus au input
           this.element.focus();
       },

       _createKey: function (keyChar) {
            var keyName, key,
                keyContent = keyChar,
                handler = this._minkeyPrint;

            switch (keyChar) {
                case "\x0A":
                    keyName = "enter";
                    handler = this._minkeyValidate;
                    keyContent = "OK";
                    break;
                case "\x08":
                    keyName = "backspace";
                    handler = this._minkeySuppr;
                    keyContent = '<i class="material-icons">backspace</i>';
                    break;
                case " ":
                    keyName = "space";
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

           key = $("<span>")
                .addClass(this.widgetFullName + "-key  ui-state-default ui-corner-all")
                .addClass(this.widgetFullName + "-" + keyName)
                .attr({
                     role: "button"
                })
                .html(keyContent);

           this._hoverable(this.key); // add class ui-state-hover automatiquement on hover

           this._on(key, {
               click: function () {
                   handler.call(this, keyChar);
                   this._minkeyPress();
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

           // ordre de priorité pour setter les keys:
           // 1- options.keys
           // 2- options.pattern
           // 3- element attribute "pattern"
           if (this.options.keys) {
               this._buildKeyboardFromKeyChars(this.options.keys);
           } else {
                // si l'element n'as pas de pattern, on lui autorise tout le keypad
                this.options.pattern = this.options.pattern || this.element.attr("pattern") || '[' + _keypad + ']';
                this._buildKeyboardFromPattern(this.options.pattern);
           }
           // on ajoute au current element la classe "minkeyboard" (this.widgetFullName depuis jquery ui 1.9, avant on utilisant this.widgetBaseClass)
           //this.element.addClass(this.widgetFullName || this.widgetBaseClass);

           // _on() garde le contexte this sur notre widget intance
           // + events sont automatiquement namespaced
           // + autre avantage sur on(): permet au widget factory de detruire automatiquement nos events handlers on destroy
           this._on(this.element, {
               focusin: "open"
           });
           // quand on click n'importe ou on fermera le widget
           // Remarque: cet event est attache une fois par element present dans la jquery collection
           // On se retrouve donc avec plusieurs handlers qui seront executes en sequence a chaque fois qu'on click qqpart:
           // => c'est volontaire, car on s'en sert pour fermer automatiquement le widget en cours ouvert, sans avoir besoin
           // de tester quel widget est ouvert pour quel element
           this._on(this.document, {
               click: "close"
           });
       },


       _buildKeyboardFromPattern: function (pattern) {
           var regex,
               keyChars = [];

           // version 0.1.0: on garde seulement ce qui est dans le 1er crochet
           pattern = pattern.replace(/.*(\[.+?\]).*/, "$1");
           regex = new RegExp(pattern, 'g');
           keyChars = _keypad.match(regex); // on obtient un array des keys necessaires matchant le pattern
           this._buildKeyboardFromKeyChars(keyChars);
       },

       _buildKeyboardFromKeyChars: function(keyChars) {
           var self = this,
               col1 = $("<div>"), col2 = $("<div>"),
               row1 = $("<div>"), row2 = $("<div>"), row3 = $("<div>"), row4 = $("<div>"), row5 = $("<div>");

           $.each(keyChars, function (idx, keyChar) {
               var key = self._createKey(keyChar);
               if (isNaN(parseInt(keyChar)) === false || keyChar === '-' || keyChar === "'") { // un digit ou - '
                   row1.append(key);
               } else if ("AZERTYUIOP".indexOf(keyChar) !== -1) {
                   row2.append(key);
               } else if ("QSDFGHJKLM".indexOf(keyChar) !== -1) {
                   row3.append(key);
               } else if ("WXCVBN".indexOf(keyChar) !== -1) {
                   row4.append(key);
               } else {
                   row5.append(key);
               }
           });
           col1.append(row1).append(row2).append(row3).append(row4).append(row5);
           col2.append(this._createKey("\x08")).append(this._createKey("\x0A"));
           this.keyboard.append(col1).append(col2);
       },

       // _destroy() est appele automatiquement quand destroy() est appele explicitement (aka par le user via .minkeyboard("destroy"))
       // Ce code s'execute apres le built-in destroy()
       // ou automatiquement quand le user remove() le DOM element ayant le widget en instance!
       // Dans _destroy() on n'a pas besoin d'executer ce que fait deja le base destroy(), i.e:
       //	- il supprime deja le widget instance du DOM element
       //	- unbind all events dans le widget namespace (aka custom event comme minkeyboardfull)
       //	- unbind all events ajoutes par _bind() ou _on()

       _destroy: function () { 
               this.keyboard.remove();
       },

       // appelé à chaque fois que le user set une option sur le widget via .minkeyboard('option', 'somevalue')
       // On peut setter une option directement sans passer par this.options en appelant directement built-in option()
       // (fonctionne comme attr() ou css() pour getter/setter)
       // si on a besoin de comparer la value courante de l'option on peut utiliser this.options[key]
       _setOption: function (key, value) {
           this._super(key, value);
           switch(key) {
               case "pattern": 
                   this.keyboard.empty();
                   this._buildKeyboardFromPattern(value);
                   break;
               case "keys":
                   this.keyboard.empty();
                   this._buildKeyboardFromKeyChars(value);
                   break;
           }
       }
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
