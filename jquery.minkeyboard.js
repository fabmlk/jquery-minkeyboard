(function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define([
			"jquery",
			"./core",
			"./widget"
		], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}(function( $ ) {
        var _keypad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 '-";
        
        // tout attribut commencant par '_' est automatiquement ignoree et non accessible via $.widget('minkeyboard', 'mymethode')
	var minkeyboardOverrides = {
		
		// on set les default options
		// a la creation, widget framework va copier le widget options attribut dans jquery plugin options instance (qui sera accessible via this directement)
		options: {
			keyboardTarget: null, // jquery selector ou montrer le keyboard, null pour montrer a pres de l'input
			full: null, // callback quand maxlength est atteint, recoit en param le triggering event 
                        show: true,
                        hide: true
		},
                
                _createKeyboard: function () {
                    this.keyboard = $("<div>")
                            .addClass("ui-minkeyboard ui-widget ui-widget-content ui-corner-all ui-front")
                            .hide()
                            .attr({
                                role: "grid"
                            })
                            .appendTo(this.options.keyboardTarget || this.document[0].body); // if already present, appendTo move et non pas clone!
                },
                
                close: function () {
                    this._hide(this.keyboard, this.options.hide);
                },
                
                open: function (event) {
                    if (event) {
                        this.keyboard.css({
                            left: event.pageX,
                            right: event.pageY,
                            display: 'inline',
                            position: 'absolute'
                        });
                    }
                    
                    this._show(this.keyboard, this.options.show);
                },
                
                _createKey: function (keyChar) {
                    var keyboard = this.keyboard;
                    this.key = $("<div>")
                            .addClass("ui-minkeyboard-key ui-state-default ui-corner-all")
                            .attr({
                                role: "button"
                            })
                            .appendTo(this.keyboard);
                    
                    this._on(this.key, {
                        click: function (event) {
                            this.element[0].value += keyChar;
                        }
                    });
                },
		// _create() est appele quand le widget est initialize sur une element collection, i.e: $('selector').minkeyboard()
		// Un widget instance est cree et le store dans le data() du current element avec:
		// data("minkeyboard", {
		//	element: "reference vers le current element", => this.element est déjà set
		//	options: "copy des default options du plugin eventuellement overriden par options specifies par le client" => this.options est deja set
		// })	
		// ici, on override le default widget _create() method pour custom
		_create: function () {
			var self = this; // dans _create(), this fait reference au current widget instance
                        var regex, keyChars = [];
			var pattern = this.element.attr("pattern");
                        
                        this._createKeyboard();
                        // version 0.1.0: on garde seulement ce qui est dans le 1er crochet
                        // si l'element n'as pas de pattern, on lui autorise tout le keypad
			pattern = pattern.replace(/.*(\[.+?\]).*/, "$1") || '[' + _keypad + ']';
                        regex = new RegExp(pattern, 'g');
                        keyChars = _keypad.match(regex);
                        $.each(keyChars, function (idx, keyChar) {
                            self._createKey(keyChar);
                        });
			// on ajoute au current element la classe "minkeyboard" (this.widgetFullName depuis jquery ui 1.9, avant on utilisant this.widgetBaseClass)
			this.element.addClass(this.widgetFullName || this.widgetBaseClass);
                        
                        this._on({
                            focus: function (event) {
                                    self.show(event);
                                }
                        });
//			this.refresh(); // on refresh le widget pour lui donner sa nouvelle apparence immediatement
		},
                
//                refresh: function () {
//                    $(".ui-minkeyboard").remove();
//                    this._create();
//                },
                
                // appelé à chaque fois que le user set une option sur le widget via .minkey('option', 'somevalue')
                // si on a besoin de comparer la value courante de l'option on peut utiliser this.options[key]
                _setOption: function (key, value) {
                    this._superApply(arguments); // update value stored dans le widget instance object
                    switch (key) {
                        case 'keyboardTarget':
                            if (value) {
                                this._createKeyboard(); // call sans event => montre dans target plutôt que relative to input position
                            }
                            break;
                    }
                },
                
                _setOptions: function (options) {
                    this._superApply(arguments);
                    this.refresh();
                }
	};

	// Ceci permet d'initialiser le widget en heritant basic fonctionalite,
	// widget() accepte aussi un 3e param pour heriter d'une classe
	// Ici, jQuery ui va creer une nouvelle fonction pour jQuery element collections
	// comportant le nom passe en 1er param i.e: $.fn.minkeyboard (en interne $.widget.bridge est utilise).
	// On lui passe en 2nd param notre objet
	$.widget('minkeyboard', minkeyboardOverrides);


	// widget default options sont en fait setter dans le prototype: on copie pour les rendre plus facilement accessible
	$.minkeyboard.options = $.minkeyboard.prototype.options;
}));
