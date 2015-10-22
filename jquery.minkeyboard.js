(function ($) {
	var minkeyboardOverrides = {
		// tout attribut commencant par '_' est automatiquement ignoree et non accessible via $.widget('minkeyboard', 'mymethode')
		_keypad: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 -",
		// on set les default options
		// a la creation, widget framework va copier le widget options attribut dans jquery plugin options instance (qui sera accessible via this directement)
		options: {
			keyboardTarget: null, // jquery selector ou montrer le keyboard, null pour montrer a cote de l'input
			full: null, // callback quand maxlength est atteint, recoit en param le triggering event 
		},

		// _create() est appele quand le widget est initialize sur une element collection, i.e: $('selector').minkeyboard()
		// Un widget instance est cree et le store dans le data() du current element avec:
		// data("minkeyboard", {
		//	element: "reference vers le current element",
		//	options: "copy des default options du plugin eventuellement overriden par options specifies par le client"
		// })	
		// ici, on override le default widget _create() method pour custom
		_create: function () {
			var self = this; // dans _create(), this fait reference au current widget instance
			var pattern = this.element.attr("pattern");
			pattern = pattern.replace(/.*(\[.+?\]).*/, "$1"); // version 0.1.0: on garde seulement ce qui est dans le 1er crochet
			// on ajoute au current element la classe "minkeyboard" (this.widgetFullName depuis jquery ui 1.9, avant on utilisant this.widgetBaseClass)
			this.element.addClass(this.widgetFullName || this.widgetBaseClass)
				// widgetEventPrefix est le nom du widget par defaut (utiliser un namespace permettra de retrouver l'event plus facilement)
				.bind('focus.' + this.widgetEventPrefix, function (event) {
					// ici this fait reference au current element, on doit utiliser self si on veut referencer le widget
				});
			this.refresh(); // on refresh le widget pour lui donner sa nouvelle apparence immediatement
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
})(jQuery);
