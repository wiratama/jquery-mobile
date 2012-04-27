//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
//>>description: Popup windows.
//>>label: Popups

define( [ "jquery",
	"jquery.mobile.widget",
	"jquery.mobile.navigation",
	"../external/requirejs/depend!./jquery.hashchange[jquery]" ], function( $ ) {
//>>excludeEnd("jqmBuildExclude");
(function( $, undefined ) {

	$.widget( "mobile.popup", $.mobile.widget, {
		options: {
			theme: null,
			overlayTheme: null,
			shadow: true,
			corners: true,
			fade: false,
			transition: $.mobile.defaultDialogTransition,
			initSelector: ":jqmData(role='popup')"
		},

		_create: function() {
			var ui = {
					screen: "#ui-popup-screen",
					container: "#ui-popup-container"
				},
				proto = $(
					"<div>" +
					"    <div id='ui-popup-screen' class='ui-selectmenu-screen ui-screen-hidden ui-popup-screen'></div>" +
					"    <div id='ui-popup-container' class='ui-popup-container ui-selectmenu-hidden'></div>" +
					"</div>"
				),
				thisPage = this.element.closest( ":jqmData(role='page')" ),
				self = this;

			if ( thisPage.length === 0 ) {
				thisPage = $( "body" );
			}

			// Assign the relevant parts of the proto
			for ( var key in ui ) {
				ui[ key ] = proto.find( ui[ key ] ).removeAttr( "id" );
			}

			// Apply the proto
			thisPage.append( ui.screen );
			ui.container.insertAfter( ui.screen );
			ui.container.append( this.element );

			// Define instance variables
			$.extend( this, {
				_page: thisPage,
				_ui: ui,
			});

			$.each( this.options, function( key ) {
				// Cause initial options to be applied by their handler by temporarily setting the option to undefined
				// - the handler then sets it to the initial value
				var value = self.options[ key ];

				self.options[ key ] = undefined;
				self._setOption( key, value, true );
			});

			ui.screen.bind( "vclick", function( e ) {
				e.preventDefault();
				e.stopImmediatePropagation();
				self.close();
			});
		},

		_realSetTheme: function( dst, theme ) {
			var classes = ( dst.attr( "class" ) || "").split( " " ),
				alreadyAdded = true,
				currentTheme = null,
				matches;

			theme = String( theme );
			while ( classes.length > 0 ) {
				currentTheme = classes.pop();
				matches = currentTheme.match( /^ui-body-([a-z])$/ );
				if ( matches && matches.length > 1 ) {
					currentTheme = matches[ 1 ];
					break;
				} else {
					currentTheme = null;
				}
			}

			if ( theme !== currentTheme ) {
				dst.removeClass( "ui-body-" + currentTheme );
				if ( theme !== null ) {
					dst.addClass( "ui-body-" + theme );
				}
			}
		},

		_setTheme: function( value ) {
			this._realSetTheme( this.element, value );
			this.options.theme = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "theme", value );
		},

		_setOverlayTheme: function( value ) {
			this._realSetTheme( this._ui.container, value );
			// The screen must always have some kind of background for fade to work, so, if the theme is being unset,
			// set the background to "a".
			this._realSetTheme( this._ui.screen, (value === "" ? "a" : value) );
			this.options.overlayTheme = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "overlay-theme", value );
		},

		_setShadow: function( value ) {
			this._ui.container[value ? "addClass" : "removeClass"]( "ui-overlay-shadow" );
			this.options.shadow = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "shadow", value );
		},

		_setCorners: function( value ) {
			this._ui.container[value ? "addClass" : "removeClass"]( "ui-corner-all" );
			this.options.corners = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "corners", value );
		},

		_setFade: function( value ) {
			this.options.fade = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "fade", value );
		},

		_setTransition: function( value ) {
			this._ui.container.removeClass( this.options.transition || "" );
			if ( value && value !== "none" ) {
				this._ui.container.addClass( value );
			}
			this.options.transition = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "transition", value );
		},

		_setOption: function( key, value ) {
			var setter = "_set" + key.replace( /^[a-z]/, function(c) {
				return c.toUpperCase();
			});

			if ( this[setter] !== undefined ) {
				this[setter]( value );
			} else {
				$.mobile.widget.prototype._setOption.apply( this, arguments );
			}
		},

		// Call _onHashChange if the hash changes /after/ the popup is on the screen
		// Note that placing the popup on the screen can itself cause a hashchange,
		// because the dialogHashKey may need to be added to the URL.
		_doNavHook: function(listenerInstalledCb) {
			var self = this,
					activeEntry = $.mobile.urlHistory.getActive(),
					hasHash = ( activeEntry.url.indexOf( $.mobile.dialogHashKey ) > -1 );

			function realInstallListener() {
				$( window ).one( "hashchange.popup", function() {
					self._onHashChange();
				});
				listenerInstalledCb();
			}

			if ( hasHash ) {
				realInstallListener();
			}
			else {
				$( window ).one( "hashchange.popupBinder", function() {
					realInstallListener();
				});
				$.mobile.path.set( activeEntry.url + $.mobile.dialogHashKey );
				$.mobile.urlHistory.addNew( activeEntry.url + $.mobile.dialogHashKey, activeEntry.transition, activeEntry.title, activeEntry.pageUrl, activeEntry.role );
			}
		},

		_undoNavHook: function() {
			$( window ).unbind( "hashchange.popupBinder hashchange.popup" );
		},

		_placementCoords: function( x, y ) {
			// Try and center the overlay over the given coordinates
			var ret,
				menuHeight = this._ui.container.outerHeight( true ),
				menuWidth = this._ui.container.outerWidth( true ),
				scrollTop = $( window ).scrollTop(),
				screenHeight = $( window ).height(),
				screenWidth = $( window ).width(),
				halfheight = menuHeight / 2,
				maxwidth = parseFloat( this._ui.container.css( "max-width" ) ),
				roomtop = y - scrollTop,
				roombot = scrollTop + screenHeight - y,
				newtop, newleft;

			if ( roomtop > menuHeight / 2 && roombot > menuHeight / 2 ) {
				newtop = y - halfheight;
			} else {
				// 30px tolerance off the edges
				newtop = roomtop > roombot ? scrollTop + screenHeight - menuHeight - 30 : scrollTop + 30;
			}

			// If the menuwidth is smaller than the screen center is
			if ( menuWidth < maxwidth ) {
				newleft = ( screenWidth - menuWidth ) / 2;
			} else {
				//otherwise insure a >= 30px offset from the left
				newleft = x - menuWidth / 2;

				// 10px tolerance off the edges
				if ( newleft < 10 ) {
					newleft = 10;
				} else if ( ( newleft + menuWidth ) > screenWidth ) {
					newleft = screenWidth - menuWidth - 10;
				}
			}

			return { x: newleft, y: newtop };
		},

		_realOpen: function( x, y ) {
			var self = this,
				// Count down to triggering "opened" - we have two prerequisits:
				// 1. The popup window animation completes (onAnimationComplete())
				// 2. The screen opacity animation completes (showScreen())
				triggerPrereqs = 2,
				maybeTriggerOpened = function() {
					triggerPrereqs--;

					if ( 0 === triggerPrereqs ) {
						self._nowOnScreen();
					}
				},
				onAnimationComplete = function() {
					self._ui.screen.height( $( document ).height() );
					maybeTriggerOpened();
				},
				showScreen = function() {
					maybeTriggerOpened();
				},
				coords = self._placementCoords(
						(undefined === x ? window.innerWidth / 2 : x),
						(undefined === y ? window.innerHeight / 2 : y) );

			if ( !self.options.overlayTheme ) {
				self._setOverlayTheme( self._page.jqmData( "theme" ) || $.mobile.getInheritedTheme( self._page, "a" ) );
			}

			self._ui.screen
					.height( $( document ).height() )
					.removeClass( "ui-screen-hidden" );

			if ( self.options.fade ) {
				self._ui.screen.animate( {opacity: 0.5}, "fast", showScreen );
			}
			else {
				showScreen();
			}

			self._ui.container
				.removeClass( "ui-selectmenu-hidden" )
				.css( {
					left: coords.x,
					top: coords.y
				});

			if ( self.options.transition && self.options.transition !== "none" ) {
				self._ui.container
					.addClass( "in" )
					.animationComplete( onAnimationComplete );
			}
			else {
				onAnimationComplete();
			}
		},

		_realClose: function( ) {
			var self = this,
				// Count down to triggering "closed" - we have two prerequisits:
				// 1. The popup window reverse animation completes (onAnimationComplete())
				// 2. The screen opacity animation completes (hideScreen())
				triggerPrereqs = 2,
				maybeTriggerClosed = function() {
					triggerPrereqs--;

					if ( 0 === triggerPrereqs ) {
						self._nowOffScreen();
					}
				},
				onAnimationComplete = function() {
					self._ui.container
						.removeClass( "reverse out" )
						.addClass( "ui-selectmenu-hidden" )
						.removeAttr( "style" );
					maybeTriggerClosed();
				},
				hideScreen = function() {
					self._ui.screen.addClass( "ui-screen-hidden" );
					self._ui.screen.removeAttr( "style" );
					maybeTriggerClosed();
				};

			if ( this.options.transition && this.options.transition !== "none" ) {
				this._ui.container
					.removeClass( "in" )
					.addClass( "reverse out" )
					.animationComplete( onAnimationComplete );
			} else {
				onAnimationComplete();
			}

			if ( this.options.fade ) {
				this._ui.screen.animate( {opacity: 0.0}, "fast", hideScreen );
			} else {
				hideScreen();
			}
		},

		// Before emitting "opened", two things must be true:
		// 1. The animations must be complete
		// 2. The hash change resulting from adding the dialogHashKey must have passed
		_maybeEmitOpened: function() {
			this._openPrereqs = ( ( this._openPrereqs === undefined ) ? 2 : this._openPrereqs ) - 1;

			if ( 0 === this._openPrereqs ) {
				this._pending = null;
				this._openPrereqs = 2;
				this._calledOpen = false;
				this.element.trigger( "opened" );
			}
		},

		_nowOnScreen: function() {
			this._maybeEmitOpened();
		},

		_nowOffScreen: function() {
			$.mobile.popup.currentPopup = null;
			this._pending = null;
			this._calledClose = false;
			this.element.trigger( "closed" );
		},

		open: function( x, y ) {
			var self = this;

			function thereIsNoOtherPopup() {
				$.mobile.popup.currentPopup = self;
				self._doNavHook( function() {
					self._maybeEmitOpened();
				});
				self._realOpen( x, y );
			}

			function continueWithOpen() {
				self._pending = "opened";

				if ( $.mobile.popup.currentPopup ) {
					$.mobile.popup.currentPopup.element.one( "closed", function() {
						if ( $.mobile.popup.currentPopup ) {
							continueWithOpen();
						}
						else {
							thereIsNoOtherPopup();
						}
					});
					$.mobile.popup.currentPopup.close();
				}
				else {
					thereIsNoOtherPopup();
				}
			}

			if ( !self._calledOpen ) {
				self._calledOpen = true;

				if (self._pending === "closed" ) {
					self.element.one( "closed", function() { continueWithOpen(); } );
				}
				else {
					continueWithOpen();
				}
			}
		},

		_doClose: function(cb) {
			var self = this;

			function continueWithClose() {
				self._pending = "closed";
				cb();
			}

			if ( self._pending === "opened" ) {
				self.element.one( "opened", function() { continueWithClose(); } );
			}
			else {
				continueWithClose();
			}
		},

		close: function() {
			var self = this;

			if ( !self._calledClose ) {
				self._calledClose = true;

				if ( self._pending !== "closed" ) {
					self._doClose(function() { window.history.back(); } );
				}
			}
		},

		_onHashChange: function() {
			var self = this;
			self._doClose( function() { self._realClose(); } );
		},
	});

	$.mobile.popup.currentPopup = null;

	$.mobile.popup.bindPopupToButton = function( btn, popup ) {
		if ( btn.length === 0 || popup.length === 0 ) return;

		var btnVClickHandler = function( e ) {
			popup.popup( "open",
					btn.offset().left + btn.outerWidth() / 2,
					btn.offset().top + btn.outerHeight() / 2 );

			// Swallow event, because it might end up getting picked up by the popup window's screen handler, which
			// will in turn cause the popup window to close - Thanks Sasha!
			if ( e.stopPropagation ) {
				e.stopPropagation();
			}
			if ( e.preventDefault ) {
				e.preventDefault();
			}
		};

		btn.attr( {
			"aria-haspopup": true,
			"aria-owns": btn.attr( "href" )
		})
			.removeAttr( "href" )
			.bind( "vclick", btnVClickHandler );
	};

	$( document ).bind( "pagecreate create", function( e )  {
		$( $.mobile.popup.prototype.options.initSelector, e.target )
				.not( ":jqmData(role='none'), :jqmData(role='nojs')" )
				.popup();

		$( "a[href^='#']:jqmData(rel='popup')", e.target ).each( function() {
			$.mobile.popup.bindPopupToButton( $( this ), $( $( this ).attr( "href" ) ) );
		});
	});

})( jQuery );
//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
});
//>>excludeEnd("jqmBuildExclude");
